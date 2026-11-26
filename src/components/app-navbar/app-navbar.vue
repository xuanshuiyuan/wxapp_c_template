<!--
  自绘顶栏（easycom 自动注册；原生导航栏做不了 HUD 语言，改自绘）：
  · 高度只问 services/platform getLayout()（状态栏 + 胶囊反推导航高，进程内缓存；H5 状态栏 0），
    页面/组件层零条件编译；
  · 微信原生胶囊无法隐藏：右侧预留 capsuleReserve 让出胶囊宽度；
  · 固定顶栏 + 同高等宽占位块（在流内），页面不用自己预留 top 间距；
  · 栏底 2rpx 流光发丝与舱体描边同语言。
  showBack 用于非 tab 页；tabBar 首页不传。
-->
<template>
	<view class="nb">
		<!-- 占位块：与固定栏等高，滚动时内容从栏下露出而不是顶到屏幕上沿 -->
		<view class="nb__space" :style="{ height: bar.customBarHeight + 'px' }"></view>
		<view class="nb__bar" :style="{ paddingTop: bar.statusBarHeight + 'px' }">
			<view
				class="nb__content"
				:style="{
					height: bar.navBarHeight + 'px',
					paddingRight: bar.capsuleReserve ? bar.capsuleReserve + 'px' : '',
				}"
			>
				<view v-if="showBack" class="nb__back" hover-class="nb__back--hover" @click="onBack">
					<text class="nb__back-icon">‹</text>
				</view>
				<view class="nb__title-wrap">
					<!-- 标题黄竖条：scaffold .card__title 的放大版，模块标题同一语言 -->
					<view class="nb__title-bar"></view>
					<text class="nb__title">{{ title }}</text>
				</view>
			</view>
			<!-- 栏底流光发丝：与舱体描边同参数，五个模块和顶栏连成一套 -->
			<view class="nb__flow"></view>
		</view>
	</view>
</template>

<script setup>
import { getLayout } from '@/services/platform';
import { route } from '@/services/route';

const props = defineProps({
	title: { type: String, default: '' },
	showBack: { type: Boolean, default: false },
	// 栈为空时的兜底页（H5 直链 / 分享落地）。默认不传 = HOME_PAGE（route.back 自己的默认值）；
	// 订单详情这类「从消息直达也应回列表」的页面传自己的列表页。
	backFallback: { type: String, default: '' },
});

// 布局尺寸进程内固定，无需响应式；H5 状态栏为 0 时 paddingTop 自然为 0
const bar = getLayout();

function onBack() {
	if (props.backFallback) return route.back(props.backFallback);
	route.back();
}
</script>

<style lang="scss" scoped>
.nb__space {
	width: 100%;
}

.nb__bar {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: $z-nav;
	// 纯色！直接用 $nav-solid（#E9F4EF），与 pages.json 窗口底色同值：
	// 微信下拉回弹会连 fixed 栏一起平移，露出区是窗口纯色底——栏若带渐变、或与窗口不同值，
	// 就会色差成「一大块空白」；同值纯色让回弹观感变成「导航栏临时变高」。
	// ⚠️ 2026-10-29 换肤：原写法是「墨纱 5.5% 叠 $bg-fill-weak」**算**出来的，
	// 换底色后它算出约 #E6EDE9，与 pages.json 的 #E9F4EF 对不上 → 改成取同一个 token。
	background: $nav-solid;
}

.nb__content {
	display: flex;
	align-items: center;
	padding: 0 $page-padding;
	// 微信端 paddingRight 由 capsuleReserve 内联覆盖（给原生胶囊让位），其余端走这里的默认值
}

.nb__back {
	width: $size-icon-button;
	height: 100%;
	margin-left: -$sp-2; // 热区外扩、视觉与标题竖条对齐
	display: flex;
	align-items: center;
}

.nb__back--hover {
	opacity: 0.7;
}

.nb__back-icon {
	font-size: 56rpx;
	line-height: 1;
	font-weight: $fw-bold;
	color: $text-title;
	margin-top: -8rpx;
}

.nb__title-wrap {
	flex: 1;
	display: flex;
	align-items: center;
	overflow: hidden;
}

.nb__title-bar {
	width: 6rpx;
	height: 32rpx;
	border-radius: 3rpx;
	background: linear-gradient(180deg, $color-primary, $color-primary-dark);
	margin-right: $sp-2;
	flex-shrink: 0;
}

.nb__title {
	font-size: $fs-price;
	font-weight: $fw-semibold;
	color: $text-title;
	letter-spacing: 1rpx;
	line-height: 1;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

/* 流光发丝：与 scaffold hud-flow 同配方；keyframes 本地定义（scoped 会改写动画名） */
.nb__flow {
	height: 2rpx;
	background: linear-gradient(
		115deg,
		rgba($color-primary, 0.3) 0%,
		rgba($color-primary, 1) 12%,
		rgba($color-primary, 0.22) 26%,
		rgba($text-title, 0.1) 50%,
		rgba($color-primary, 0.22) 74%,
		rgba($color-primary, 1) 88%,
		rgba($color-primary, 0.3) 100%
	);
	background-size: 200% 200%;
	animation: nb-flow 4.5s linear infinite;
}

@keyframes nb-flow {
	0% {
		background-position: 0% 0%;
	}
	100% {
		background-position: 100% 100%;
	}
}

</style>
