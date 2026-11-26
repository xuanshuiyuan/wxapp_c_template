<!--
  我的（tabBar）：登录态展示 + 退出登录 + 模板说明。
  演示：userState 响应式视图、session.logout、tabBar 页壳。
-->
<template>
	<view class="hud-page" :style="{ '--tab-overlay': tabBarOverlay + 'px' }">
		<app-navbar title="我的" />
		<app-modal />
		<app-toast />
		<app-loading />

		<scroll-view class="hud-page__scroll" scroll-y>
			<view class="hud-page__body">
				<view class="card mine__user">
					<view class="avatar-letter mine__avatar">{{ avatarText }}</view>
					<view class="mine__user-main">
						<text class="t-h3">user_id {{ userId || '--' }}</text>
						<text class="t-note mine__status">{{ userState.logged ? '已登录' : '未登录' }}</text>
					</view>
				</view>

				<view class="card">
					<text class="card__title">模板说明</text>
					<view class="kv">
						<text class="kv__k">后端契约</text>
						<text class="kv__v">go_project_template（demo 模块）</text>
					</view>
					<view class="kv">
						<text class="kv__k">版本协商头</text>
						<text class="kv__v">{{ edition }}</text>
					</view>
					<view class="kv">
						<text class="kv__k">接口前缀</text>
						<text class="kv__v">/{{ routeVersion }}</text>
					</view>
					<text class="t-desc mine__tip">
						新业务从 api/ + 页面骨架开始；登录、签名、错误处理、多端适配都已在框架层收口。
					</text>
				</view>

				<view class="mine__actions">
					<view class="btn btn--soft btn--block" @click="onCreate">新建 demo 记录</view>
					<view class="btn btn--soft btn--block" @click="onCallService">联系客服</view>
					<view class="btn btn--danger btn--block" @click="onLogout">退出登录</view>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
import { computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { requireLogin, route, DEMO_CREATE_PAGE, LOGIN_PAGE } from '@/services/route';
import { logout, ensureLogin } from '@/services/session';
import { userState } from '@/store/user';
import { confirm } from '@/composables/useModal';
import { toast } from '@/services/toast';
import { edition, routeVersion, SERVICE_TEL } from '@/config/app';
import { callPhone, getLayout } from '@/services/platform';

const userId = computed(() => userState.user_id);
const tabBarOverlay = getLayout().tabBarOverlay;
const avatarText = computed(() => (userState.user_id ? String(userState.user_id).slice(-2) : '--'));

onShow(async () => {
	if (!(await ensureLogin())) requireLogin();
});

function onCreate() {
	route.to(DEMO_CREATE_PAGE);
}

function onCallService() {
	if (!SERVICE_TEL || SERVICE_TEL.startsWith('REPLACE_')) {
		toast('请先在 config/app.js 配置客服电话');
		return;
	}
	callPhone(SERVICE_TEL);
}

async function onLogout() {
	const ok = await confirm({
		title: '退出登录',
		content: '退出后需要重新输入 user_id 登录，确定退出吗？',
		confirmText: '退出',
		cancelText: '取消'
	});
	if (!ok) return;
	logout();
	route.relaunch(LOGIN_PAGE);
}
</script>

<style lang="scss" scoped>
.mine__user {
	display: flex;
	align-items: center;
	margin-bottom: $card-gap;
}

.mine__avatar {
	width: 96rpx;
	height: 96rpx;
	margin-right: $sp-3;
	border-radius: $rd-pill;
	background-color: $bg-fill-icon;
	color: $text-inverse;
	font-size: $fs-label;
}

.mine__user-main {
	flex: 1;
	min-width: 0;
}

.mine__status {
	display: block;
	margin-top: $sp-1;
}

.mine__tip {
	display: block;
	margin-top: $sp-2;
}

.mine__actions {
	margin-top: $sp-6;
}

.mine__actions .btn + .btn {
	margin-top: $sp-3;
}
</style>