<!--
  首页（tabBar）：demo 记录列表 —— 模板的全链路参考页。
  演示：useList 分页 + usePullRefresh 下拉 + 删除二次确认 + 分包跳转 + 文档预览入口。
  真实业务页照这个骨架抄，把 demoApi 换成自己的 api 域即可。
-->
<template>
	<!-- 根节点接 touch：下拉距离的兜底来源（原生不给 dy 时用，见 usePullRefresh 的 dyOf） -->
	<view class="hud-page" :style="{ '--tab-overlay': tabBarOverlay + 'px' }" @touchstart="onTouchStart" @touchmove="onTouchMove">
		<app-navbar title="demo 列表" />
		<!-- 三个全局渲染器必挂：守卫码 pushModal / 托管 loading / 自绘 toast -->
		<app-modal />
		<app-toast />
		<app-loading />
		<!-- 下拉指示器：三段跟手态（下拉刷新 / 松开立即刷新 / 正在刷新数据中…） -->
		<app-refresher :show="visible" :state="pullState" :last-at="lastRefreshAt" :offset="offset" />

		<scroll-view
			class="hud-page__scroll"
			scroll-y
			refresher-enabled
			refresher-default-style="none"
			refresher-background="transparent"
			:refresher-triggered="refreshing"
			:refresher-threshold="threshold"
			@refresherpulling="onPulling"
			@refresherrefresh="onRefresh"
			@refresherrestore="onPullEnd"
			@refresherabort="onPullEnd"
			@scrolltolower="loadMore"
		>
			<template #refresher>
				<view class="home__refresher-slot"></view>
			</template>

			<view class="hud-page__body">
				<view class="home__head">
					<view>
						<text class="t-h2">C 端小程序模板</text>
						<text class="t-desc home__head-desc">共 {{ total }} 条 · 登录 → 创建 → 预览 → 删除全链路可跑</text>
					</view>
					<view class="chip home__user" @click="goMine">user_id {{ userId || '--' }}</view>
				</view>

				<!-- 文档预览入口：create 返回的 doc_preview_url 存在 store/demo 里 -->
				<view v-if="lastCreated" class="card home__preview" hover-class="home__preview--hover" @click="openPreview">
					<view class="home__preview-main">
						<text class="t-h3">文档预览</text>
						<text class="t-desc">最近创建：{{ lastCreated.name }}（预览链接 5 分钟内有效）</text>
					</view>
					<text class="home__arrow">›</text>
				</view>

				<view class="home__list">
					<view v-for="item in items" :key="item.id" class="card home__row">
						<view class="home__row-main">
							<text class="home__row-title">{{ item.name }}</text>
							<text class="home__row-remark">{{ item.remark || '—' }}</text>
							<text class="t-note">{{ item.timeText || '--' }} · {{ item.status_text || '--' }}</text>
						</view>
						<view class="btn btn--danger btn--sm" @click.stop="onDelete(item)">删除</view>
					</view>
				</view>

				<!-- 骨架 / 空态 / 失败重试 / 加载更·到底：四态收敛 app-list-state -->
				<app-list-state
					:first-loading="firstLoading"
					:empty="isEmpty"
					:error="error"
					:has-items="hasItems"
					:loading="loading"
					:finished="finished"
					empty-text="还没有记录，点下面按钮新建一条"
					@retry="reload"
				/>

				<view class="home__cta">
					<view class="btn btn--primary btn--block" @click="onCreate">新建 demo 记录</view>
				</view>

				<text class="t-note home__foot">模板后端：go_project_template · 契约版本 {{ edition }}</text>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
import { computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useList } from '@/composables/useList';
import { usePullRefresh } from '@/composables/usePullRefresh';
import { confirm } from '@/composables/useModal';
import { demoApi, pickDemoList } from '@/api';
import { requireLogin, route, DEMO_CREATE_PAGE, DEMO_WEBVIEW_PAGE, MINE_PAGE } from '@/services/route';
import { toast } from '@/services/toast';
import { ensureLogin } from '@/services/session';
import { demoState, saveLastCreated } from '@/store/demo';
import { userState } from '@/store/user';
import { absoluteUrl } from '@/utils/url';
import { edition } from '@/config/app';
import { getLayout } from '@/services/platform';
import { isApiError } from '@/services/http';

const userId = computed(() => userState.user_id);
// H5/App 的 tabBar 是页内 fixed 浮层：把让位高度写进 CSS 变量，避免内容底部被 tabBar 盖住
const tabBarOverlay = getLayout().tabBarOverlay;
const lastCreated = computed(() => demoState.lastCreated);

// 后端分页契约：query page/page_size，响应 data = { list, total }。
// immediate:false —— 登录拦截放在 onShow，未登录时不打接口（否则会先吃一次 40005）。
// pageHooks:false —— 本页是 scroll-view 下拉/触底，禁用 useList 注册的页面级钩子，避免 A/B 档混用。
const {
	items, total, loading, firstLoading, finished, error, hasItems, isEmpty, reload, refresh, loadMore
} = useList(demoApi.list, { pageSize: 10, pick: pickDemoList, immediate: false, pageHooks: false });

const { pullState, refreshing, lastRefreshAt, offset, visible, threshold, onPulling, onRefresh, onPullEnd, onTouchStart, onTouchMove } =
	usePullRefresh({ can: () => !loading.value, onRefresh: refresh });

// tab 页每次回到前台都重拉：create 页返回、删完回来都要看到最新数据。
// 未登录则清栈去登录页（requireLogin 内部完成跳转）。
onShow(async () => {
	// 冷启动时 App.onLaunch 的静默登录可能还没回来：先等它（失败再走登录拦截），
	// 否则会把「有 user_id、正在换 token」的用户误送去登录页。
	if (!(await ensureLogin())) {
		requireLogin();
		return;
	}
	reload();
});

function goMine() {
	route.tab(MINE_PAGE);
}

function onCreate() {
	route.to(DEMO_CREATE_PAGE);
}

function openPreview() {
	const url = lastCreated.value && lastCreated.value.doc_preview_url;
	if (!url) {
		toast('请先创建一条记录');
		return;
	}
	// doc_preview_url 是后端下发的相对地址（/v2/webview/...），web-view 需要绝对地址
	route.to(DEMO_WEBVIEW_PAGE, { url: absoluteUrl(url) });
}

async function onDelete(item) {
	const ok = await confirm({
		title: '删除记录',
		content: `确定删除「${item.name}」吗？删除后不可恢复。`,
		confirmText: '删除',
		cancelText: '取消'
	});
	if (!ok) return;
	try {
		await demoApi.remove(item.id);
		// 删的正好是「最近创建」那条：预览入口一并清掉，避免点进去 404
		if (lastCreated.value && lastCreated.value.id === item.id) saveLastCreated(null);
		toast('已删除', 'success');
		// 等列表重拉结果：删除成功但刷新失败时，至少让用户知道列表可能还是旧的
		const ok = await reload();
		if (ok === false) toast('列表刷新失败，请下拉重试');
	} catch (e) {
		// 请求层默认已 toast；guard 型由全局弹窗处置，这里忽略
		if (!isApiError(e) || e.type !== 'guard') console.error('[home] 删除失败：', e);
	}
}
</script>

<style lang="scss" scoped>
.home__refresher-slot {
	height: 0;
}

.home__head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	margin: $sp-2 0 $sp-3;
}

.home__head-desc {
	display: block;
	margin-top: $sp-1;
}

.home__user {
	flex-shrink: 0;
	margin-left: $sp-2;
	color: $text-sub;
	background-color: $bg-fill-chip;
}

.home__preview {
	display: flex;
	align-items: center;
	margin-bottom: $card-gap;
	background: linear-gradient(135deg, $color-primary-light 0%, $bg-card 70%);
}

.home__preview--hover {
	background: $bg-hover;
}

.home__preview-main {
	flex: 1;
	min-width: 0;
}

.home__arrow {
	font-size: $fs-cta;
	color: $color-primary;
}

.home__list {
	margin-bottom: $card-gap;
}

.home__row {
	display: flex;
	align-items: center;
	margin-bottom: $card-gap;
}

.home__row-main {
	flex: 1;
	min-width: 0;
	margin-right: $sp-2;
}

.home__row-title {
	display: block;
	font-size: $fs-label;
	font-weight: $fw-semibold;
	color: $text-title;
	line-height: $lh-label;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.home__row-remark {
	display: block;
	margin: $sp-1 0;
	font-size: $fs-body;
	color: $text-sub;
	line-height: $lh-body;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.home__cta {
	margin-top: $sp-4;
}

.home__foot {
	display: block;
	margin-top: $sp-8;
	text-align: center;
}
</style>