// ---------------------------------------------------------------------------
// 下拉刷新状态机（HUD 页壳专用）
//
// 为什么抽出来：多个 HUD 页的下拉接线**逐字相同**（pulling / pullVisible / 五条
// @refresher* / 一份字节全同的 `.xx__pull` 浮层壳），而指示器只有「刷新中」一态。
// 本次要做「下拉刷新 → 松开立即刷新 → 正在刷新数据中…」三段跟手反馈，
// 各页各写一遍就是 15 份同样的新增，故把状态机收在这里、页面只留接线。
//
// 页面里从此只写这几行：
//   const { pullState, refreshing, lastRefreshAt, offset, visible, threshold,
//           onPulling, onRefresh, onPullEnd, onTouchStart, onTouchMove }
//     = usePullRefresh({ can: () => !loading.value, onRefresh: refresh });
//
//   <view class="hud-page" @touchstart="onTouchStart" @touchmove="onTouchMove">   ← 兜底用，见 dyOf
//   <app-refresher :show="visible" :state="pullState" :last-at="lastRefreshAt" :offset="offset" />
//   <scroll-view :refresher-triggered="refreshing" :refresher-threshold="threshold"
//                @refresherpulling="onPulling" @refresherrefresh="onRefresh"
//                @refresherrestore="onPullEnd" @refresherabort="onPullEnd">
//
// 三条不能动的口径：
//   · `:refresher-triggered` 必须由本文件的 `refreshing` 驱动——它是**唯一**能把原生刷新区
//     收回去的东西，漏绑 = 指示器转圈卡死（v1.0.7~v1.0.14 三个页面各写了一遍这个教训）；
//   · `lastRefreshAt` 是**秒级**时间戳：utils/date 的 formatDate 内部是 parseInt(obj) * 1000，
//     而 Date.now() 是毫秒，必须 /1000（首版只有首页在用，它传的正好是后端秒级字段，容易忽略）；
//   · 取数仍由页面给（useList.refresh / reload / 首页那套 Promise.all 各不相同），本文件不碰业务。
// ---------------------------------------------------------------------------

import { computed, ref } from 'vue';

/**
 * 触发「松开立即刷新」的下拉距离（px）。
 * 必须与 scroll-view 的 `refresher-threshold` 同值——两端默认值都是 45，但默认值跨端跨版本
 * 靠不住（这里是判断箭头朝哪边的唯一依据，判错就是文案与手势对不上），故页面按本常量显式绑定。
 *
 * ⚠️ 它同时决定两件几何事，改它要一起算：
 *   ① 箭头翻面（「下拉刷新」→「松开立即刷新」）的位置；
 *   ② **原生刷新区回弹后停留的高度 = 指示器要装进去的那段空档**——指示器骑着空档走
 *      （见 app-refresher 文件头），整块高 + 让位 8rpx 必须装得下这段空档。
 * 现取平台默认 45px：指示器现高约 56rpx（两行时）+ 8rpx = 64rpx，而 45px 在 375pt 机上
 * = 90rpx、在 428pt 大屏上 = ~79rpx，**都装得下且有余量**（中途为「白芯片」那版上调到 60px，
 * 芯片撤掉后即回退，因为白底版高 78rpx 在 428pt 上只剩 1rpx 余量）。
 * 今后若加高指示器（加行、加图标），按上面的算法复核这个值。
 */
export const PULL_THRESHOLD = 45;

export function usePullRefresh(options = {}) {
	const { onRefresh: refreshAction = null, can = null, threshold = PULL_THRESHOLD } = options;

	// 三段态：pull = 未过阈值（向下箭头）/ release = 已过阈值（向上箭头）/ refresh = 请求中（黄环）
	const pullState = ref('pull');
	const pulling = ref(false); // 原生 refresherpulling 已发生（指尖还按着）
	const refreshing = ref(false); // 请求在飞：驱动 :refresher-triggered，也决定指示器常驻
	const offset = ref(0); // 跟手位移 px（封顶在阈值）
	const lastRefreshAt = ref(0); // 秒级时间戳；0 = 还没有过一次成功刷新（指示器隐藏时间行）

	const visible = computed(() => pulling.value || refreshing.value);

	// 触摸兜底用的两个纵坐标：只在原生不给 dy 时才被读（见 dyOf）
	let touchStartY = 0;
	let touchLastY = 0;

	/**
	 * 本次下拉的距离（px），**两个来源取较大者**。
	 * 来源 A = 原生事件的 `detail.dy`：uni-app 的 H5 实现确认会带（uni-h5.es.js 的 refresherpulling
	 *   派发 { dy, deltaY }）；微信端是原生组件转发、社区通行写法也是它——但**真机上尚未验证**
	 *   （官方文档未明确，需真机验证）。
	 * 来源 B = 根节点累计的触摸位移（onTouchStart / onTouchMove 喂）。
	 * 为什么取 max 而不是「有 A 就用 A」：真机上 A 有一种坏法是「字段在、但恒为 0」——
	 *   那样箭头永远翻不过来（一直「下拉刷新」），而高估的代价只是早一点翻成「松开立即刷新」，
	 *   两者不对称。B 不会误判：原生 refresherpulling 只在 scrollTop === 0 时才发，
	 *   「页面在滚动」永远进不到 onPulling；且下拉真的动起来时会把 B 的原点重置一次（见下）。
	 */
	function dyOf(e) {
		const raw = e && e.detail && e.detail.dy;
		const num = Number(raw);
		const nativeDy = Number.isFinite(num) ? Math.max(0, num) : 0;
		return Math.max(nativeDy, Math.max(0, touchLastY - touchStartY));
	}

	/** 根节点 touchstart：**每次按下都记原点**——原生 refresherpulling 总比它晚一步才发生 */
	function onTouchStart(e) {
		const t = e && e.touches && e.touches[0];
		touchStartY = touchLastY = t ? t.pageY : 0;
	}

	/** 根节点 touchmove：只在下拉真的动起来之后才更新，平滚/横滑时不记任何东西（零开销早返回） */
	function onTouchMove(e) {
		if (!pulling.value) return;
		const t = e && e.touches && e.touches[0];
		if (t) touchLastY = t.pageY;
	}

	/** 原生 refresherpulling：指尖还按着，逐次更新箭头方向与跟手位移 */
	function onPulling(e) {
		if (refreshing.value) return; // 请求中不再理会（原生区此时已锁在阈值高度）
		if (!pulling.value) {
			pulling.value = true;
			// 兜底口径从「原生刷新区真的动起来」这一刻起算：若用户先把列表滚到顶再接着拉，
			// 从 touchstart 起算会得到一个巨大的 dy，一上手就误判成「松开立即刷新」
			touchStartY = touchLastY;
		}
		const dy = dyOf(e);
		// ⚠️ 位移**必须封顶在阈值**（否则指示器会跟着手指无限下滑）：
		// 指示器骑在下拉空档里，但**走到位就停**——过阈值后它停在原处、内容继续往下走。
		// 这正是原生指示器的标准行为（到位后停住），松手回弹时原生区收在阈值高度，两者又正好对齐。
		// （中途曾为了「贴住内容上沿」取消过封顶，观感是「能无限往下滑」，已按用户口径回退）
		offset.value = Math.min(dy, threshold);
		pullState.value = dy >= threshold ? 'release' : 'pull';
	}

	/** 原生 refresherrefresh：松手且过了阈值，正式进入请求态 */
	async function onRefresh() {
		if (refreshing.value) return; // 原生会重复触发，连点也走这里
		// 在飞判重：`useList.refresh()` 在 loading 时**直接 return**，不挡就是白转一圈指示器

		if (can && !can()) {
			onPullEnd();
			return;
		}
		refreshing.value = true;
		pullState.value = 'refresh';
		pulling.value = false; // 指尖已离开，进入请求态
		offset.value = threshold; // 原生刷新区停在阈值高度，指示器跟着贴住，不跳回 0
		try {
			// 取数函数**可以返回 `false` 明确回报「这次没拉回来」**——页面自管失败（catch 住补一条 toast、
			// 保留旧数据）时它不会往外抛，光靠 try/catch 分辨不出成败。那种情况下**不推进**「最后更新」：
			// 时间戳的含义是「屏幕上这批数据是什么时候取的」，跟着失败的那次前进＝告诉用户「刚更新过」，
			// 而屏幕上的其实是旧数据。
			// 不返回值（undefined，多数页面）或返回别的值一律视作成功——保持向后兼容。
			const ok = refreshAction ? await refreshAction() : true;
			if (ok !== false) lastRefreshAt.value = Math.floor(Date.now() / 1000);
		} finally {
			// 必须回收到位：`refreshing` 留在真上，原生转圈就永远收不回去
			refreshing.value = false;
			offset.value = 0;
			pullState.value = 'pull';
		}
	}

	/** 原生 refresherrestore / refresherabort：回弹或中止，指示器复位（刷新中不收，由 onRefresh 的 finally 收） */
	function onPullEnd() {
		if (refreshing.value) return;
		pulling.value = false;
		offset.value = 0;
		pullState.value = 'pull';
	}

	return {
		pullState,
		refreshing,
		lastRefreshAt,
		offset,
		visible,
		threshold,
		onPulling,
		onRefresh,
		onPullEnd,
		onTouchStart,
		onTouchMove
	};
}

export default usePullRefresh;