<!--
  登录页（demo 登录 stub）。
  ⚠️ 模板后端只提供 POST /web/demo/login（form: user_id）→ { token, expires_in }，
     没有任何身份凭据。真实项目请替换 services/session.js 的 doLogin：
     微信小程序 = uni.login code → 后端 code2session；手机号 = getPhoneNumber code → 绑定接口。
     登录态存储、40005 静默重登、路由拦截这套骨架不需要改。
-->
<template>
	<view class="login">
		<app-navbar title="登录" />

		<view class="login__body">
			<view class="login__card hud-frame">
				<view class="login__panel hud-panel">
					<text class="t-h2">demo 登录</text>
					<text class="t-desc login__desc">
						输入任意正整数 user_id 即可签发登录态（模板后端 DevelopBypass 环境仍需签名头或 develop 头）。
					</text>

					<view class="login__field">
						<text class="login__label">user_id</text>
						<input
							v-model="userIdInput"
							class="login__input"
							type="number"
							placeholder="默认 1"
							placeholder-class="login__ph"
							confirm-type="done"
							@confirm="onLogin"
						/>
					</view>

					<view class="btn btn--primary btn--block login__cta" @click="onLogin">
						{{ submitting ? '登录中…' : '登录' }}
					</view>

					<text class="t-note login__foot">
						真实项目替换为微信 code2session / 手机号验证码；本页只是模板联调用的 stub。
					</text>
				</view>
			</view>
		</view>

		<app-modal />
		<app-toast />
		<app-loading :mask="true" />
	</view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { isLogin } from '@/services/storage';
import { login, ensureLogin } from '@/services/session';
import { route, HOME_PAGE } from '@/services/route';
import { toast } from '@/services/toast';

const userIdInput = ref('1');
const submitting = ref(false);

// 已登录直接回首页；本地存过 user_id 但 token 还没换回来时，等静默登录一次再决定。
// （冷启动的 App.onLaunch 与首页 onShow 可能并发触发登录，login 内部单飞只真发一次）
onShow(async () => {
	if (isLogin()) {
		route.relaunch(HOME_PAGE);
		return;
	}
	if (await ensureLogin()) route.relaunch(HOME_PAGE);
});

async function onLogin() {
	if (submitting.value) return; // 双保险：按钮 in-flight + 托管 loading
	const id = Number(userIdInput.value);
	if (!id || id < 1 || !Number.isInteger(id)) {
		toast('请输入正整数 user_id');
		return;
	}
	submitting.value = true;
	try {
		await login(id);
		toast('登录成功', 'success');
		// 清栈回首页：登录页不应留在页面栈里
		route.relaunch(HOME_PAGE);
	} catch (e) {
		// login 内部传了 toast:false，提示只出这一处
		toast(e.message || '登录失败，请重试');
	} finally {
		submitting.value = false;
	}
}
</script>

<style lang="scss" scoped>
.login {
	display: flex;
	flex-direction: column;
	min-height: 100vh;
	background:
		radial-gradient(120% 26% at 50% -4%, rgba($color-primary, 0.14), transparent 62%),
		linear-gradient(180deg, #F6FBF8 0%, $bg-fill-weak 60%, $bg-fill-weak 100%);
}

.login__body {
	padding: $sp-6 $page-padding $sp-10;
}

.login__panel {
	padding: $sp-8 $sp-6;
}

.login__desc {
	display: block;
	margin-top: $sp-3;
}

.login__field {
	margin-top: $sp-8;
}

.login__label {
	display: block;
	margin-bottom: $sp-2;
	font-size: $fs-body;
	font-weight: $fw-medium;
	color: $text-sub;
}

.login__input {
	height: 88rpx;
	padding: 0 $sp-3;
	border: 1rpx solid $border-color;
	border-radius: $rd-chip;
	background-color: $bg-card;
	font-size: $fs-label;
	color: $text-title;
	box-sizing: border-box;
}

.login__ph {
	color: $text-muted;
}

.login__cta {
	margin-top: $sp-6;
}

.login__foot {
	display: block;
	margin-top: $sp-4;
	text-align: center;
}
</style>