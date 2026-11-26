// ---------------------------------------------------------------------------
// 分页列表通用逻辑：下拉刷新、触底加载、搜索重载、空态、失败重试。
// 管理后台一半的页面都是这个形态，抽在这里，页面只写「调哪个接口 + 怎么渲染」。
//
//   import { useList } from '@/composables/useList'
//   import { demoApi } from '@/api'
//
//   const { items, loading, finished, error, reload } = useList(demoApi.list, {
//     params: () => ({ keyword: keyword.value })   // 每次请求前取最新筛选条件
//   })
//
// 本项目后端分页契约：query 传 page/page_size，响应 data 为 { list, total }——
// 与 defaultPick / 默认键名完全吻合，零配置可用。
//
// 页面需要配套：pages.json 里该页开 "enablePullDownRefresh": true，
// 并在 scroll-view 之外依赖页面级触底（onReachBottom 已自动注册）。
//
// ⚠️ `reload` / `refresh` / `loadMore` 都返回 **boolean**（这次到底有没有拉回来）：失败**不外抛**
// （列表页靠 `error` 渲染错误态），故调用方只能靠它分辨成败。HUD 页把 `refresh` 直接交给
// `usePullRefresh` 时这个返回值就是「要不要推进『最后更新』时刻」的依据，见其 `onRefresh` 注释。
// ---------------------------------------------------------------------------

import { ref, computed } from 'vue';
import { onLoad, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app';

/**
 * 后端分页结构尚未统一，这里做一层容错取值；
 * 若某接口字段特殊，给 useList 传自定义 pick 即可，不必改本文件。
 */
export function defaultPick(body) {
	const d = (body && body.data) || {};
	if (Array.isArray(d)) return { list: d, total: d.length };
	const list = d.list || d.data || d.rows || [];
	const total = Number(d.total || d.count || 0);
	return { list, total };
}

/**
 * @param {Function} fetcher 形如 (query, options) => Promise<body>，直接传 api 里的方法
 * @param {object} [config]
 * @param {number} [config.pageSize=20]
 * @param {string} [config.pageNumKey='page']       后端页码字段名
 * @param {string} [config.pageSizeKey='page_size'] 后端每量字段名
 * @param {boolean} [config.immediate=true]         进入页面自动加载第一页
 * @param {Function} [config.params]                返回额外的查询条件（响应式取值放这里）
 * @param {Function} [config.pick]                  从响应里取 { list, total }
 * @param {boolean} [config.toastOnError=false]     失败是否弹 toast（默认只置 error，交给页面重试 UI）
 */
export function useList(fetcher, config = {}) {
	const {
		pageSize = 20,
		pageNumKey = 'page',
		pageSizeKey = 'page_size',
		immediate = true,
		params = () => ({}),
		pick = defaultPick,
		toastOnError = false
	} = config;

	const items = ref([]);
	const body = ref(null); // 最近一次原始响应：后端附带字典（如 meal_type_list）时从这里取
	const total = ref(0);
	const page = ref(0);
	const loading = ref(false);
	const refreshing = ref(false);
	const error = ref('');
	const finished = ref(false);

	const isEmpty = computed(() => !loading.value && !error.value && items.value.length === 0);
	const firstLoading = computed(() => loading.value && items.value.length === 0);

	async function fetchPage(targetPage) {
		// 在飞时直接放行：**返回 `false`**（这次一个字节都没取回来）——调用方（`onRefresh` / `reload`）
		// 若拿它当「刷新成功」就会把「最后更新」时刻往前推，而屏幕上的数据其实还是旧的。
		// 一律往「没拉回来」这一侧倒（fail-closed）：时间戳宁可偏旧，也不能谎报新鲜。
		if (loading.value) return false;
		loading.value = true;
		error.value = '';
		try {
			const query = { ...params(), [pageNumKey]: targetPage, [pageSizeKey]: pageSize };
			const response = await fetcher(query, { toast: toastOnError });
			body.value = response;
			const parsed = pick(response);
			const list = Array.isArray(parsed.list) ? parsed.list : [];
			items.value = targetPage <= 1 ? list : items.value.concat(list);
			total.value = parsed.total || items.value.length;
			page.value = targetPage;
			// 无 total 时靠「不足一页」判断到底，有 total 时以总数为准
			finished.value = list.length < pageSize || (parsed.total > 0 && items.value.length >= parsed.total);
			return true;
		} catch (e) {
			// 错误**不外抛**（列表页靠 error 渲染错误态），故必须靠返回值把成败告诉调用方：
			// `usePullRefresh` 的「最后更新」时刻据此判定，见本函数头注释
			error.value = (e && e.message) || '加载失败';
			return false;
		} finally {
			loading.value = false;
			if (refreshing.value) {
				refreshing.value = false;
				uni.stopPullDownRefresh();
			}
		}
	}

	/** 回到第一页重新拉（筛选条件变化时调用）。返回**是否拉回来了**（boolean） */
	function reload() {
		finished.value = false;
		return fetchPage(1);
	}

	/** 触底加载下一页。返回**是否拉回来了**（boolean）；在飞 / 已到底返回 `false` */
	function loadMore() {
		if (loading.value || finished.value) return Promise.resolve(false);
		return fetchPage(page.value + 1);
	}

	/** 下拉刷新：不立刻清空列表，避免刷新过程中白屏。返回**是否拉回来了**（boolean）—— `usePullRefresh`
	 *  直接拿它决定要不要推进「最后更新」时刻，故**不要**在这里把 `fetchPage` 的 false 吞掉 */
	function refresh() {
		refreshing.value = true;
		finished.value = false;
		return fetchPage(1);
	}

	onLoad(() => {
		if (immediate) reload();
	});

	onReachBottom(() => {
		loadMore();
	});

	onPullDownRefresh(() => {
		refresh();
	});

	return {
		items,
		body,
		total,
		page,
		loading,
		refreshing,
		finished,
		error,
		isEmpty,
		firstLoading,
		reload,
		refresh,
		loadMore
	};
}

export default useList;
