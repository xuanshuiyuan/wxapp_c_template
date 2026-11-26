<!--
  主 CTA（跨页共用，easycom 自动注册）。

  三态：
  · text 非空 → 主色渐变按钮 + 行内 loading 转圈
  · text 为空且 syncText 非空 → 次级居中文案，行高与按钮同高防舱体跳动
  · 两者都空 → 什么都不渲染

  外距（margin）不进组件：由调用方挂在宿主元素上。
  ⚠️ 尺寸口径：`<app-cta>` 的宿主元素不是 view——调用方若把它放进 display:flex 容器，
  宿主会被当成 flex 子项按内容收缩，按钮会缩成文字宽。故本组件是单根满宽盒，
  调用方一律用「块级 + width:100% 的宿主定位类」承接，不要再套 flex 居中容器。
-->
<template>
	<view class="app-cta-box">
		<view v-if="text" class="app-cta" :class="{ 'app-cta--loading': loading }" hover-class="app-cta--hover" @click="onTap">
			<view v-if="loading" class="app-cta__spinner" />
			<text class="app-cta__text">{{ text }}</text>
		</view>
		<text v-else-if="syncText" class="app-cta__sync">{{ syncText }}</text>
	</view>
</template>

<script setup>
const props = defineProps({
	text: { type: String, default: '' },
	// -2 档同步中文案位（与按钮互斥）
	syncText: { type: String, default: '' },
	loading: { type: Boolean, default: false },
});
const emit = defineEmits(['tap']);

function onTap() {
	// in-flight 期间吞掉点击（双保险之一；另一半是请求层 { loading: true } 的引用计数托管，
	// 以及页面侧的 <app-loading :mask="true" /> 暗遮罩，见 rule-page-services）
	if (props.loading) return;
	emit('tap');
}
</script>

<style lang="scss" scoped>
/* 单根满宽盒：宿主元素在块级容器里恒占满，按钮本体才能拿到确定的 100% 宽度基准 */
.app-cta-box {
	width: 100%;
}

.app-cta {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 88rpx;
	background: linear-gradient(135deg, $color-primary 0%, $color-primary-dark 100%);
	// 2026-10-29 换肤：20rpx 双斜切 → $rd-button(44rpx) 圆角（斜切语言整体退役）
	border-radius: $rd-button;
	transition: transform $duration-base $ease-standard, box-shadow $duration-base $ease-standard;
}

// 按下：轻微缩小 + 主色外发光（原来是 drop-shadow 橙光，圆角后直接 box-shadow 即可）
.app-cta--hover {
	transform: scale(0.98);
	box-shadow: 0 0 24rpx rgba($color-primary, 0.45);
}

.app-cta__text {
	font-size: $fs-cta;
	font-weight: $fw-bold;
	color: $text-on-yellow;
	line-height: 1;
	letter-spacing: 2rpx;
}

/* loading 态：禁连点 + 行内旋转圈 */
.app-cta--loading {
	pointer-events: none;
	opacity: 0.85;
}

.app-cta__spinner {
	width: 26rpx;
	height: 26rpx;
	margin-right: $sp-2;
	border: 3rpx solid rgba($text-title, 0.2);
	border-top-color: $text-title;
	border-radius: 50%;
	animation: app-cta-spin 0.7s linear infinite;
}

@keyframes app-cta-spin {
	to { transform: rotate(360deg); }
}

/* -2 档同步文案位：替代按钮的居中次级文案，行高与 CTA 同高保证舱体布局不跳。
   满宽盒下用块级 + 居中（旧版靠外层 flex 居中，宿主换块级后必须自带居中，否则会贴左） */
.app-cta__sync {
	display: block;
	text-align: center;
	font-size: $fs-caption;
	color: $text-sub;
	line-height: 88rpx;
}
</style>