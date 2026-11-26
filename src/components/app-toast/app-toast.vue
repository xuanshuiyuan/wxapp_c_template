<!--
  全局 toast 渲染器（easycom 自动注册，2026-10-29 换肤批新增）。

  为什么不用 uni.showToast：样式是系统定死的（黑底胶囊、固定字号、无圆角控制），
  与「薄荷白 + 圆角」的界面不搭。本组件读 store/toast 的状态自绘，颜色/圆角/投影全走 theme token。

  用法不变：业务侧照旧 `import { toast } from '@/services/toast'`，
  页面只要挂一次 <app-toast />（与 <app-modal /> / <app-loading /> 同为全局渲染器）。
  ⚠️ 某页没挂时 services/toast 会**自动降级** uni.showToast——宁可样式旧，也不能「发了没人渲染」。

  视觉：屏幕正中的深墨卡片（圆角 20rpx + 浮层投影），白字，可选 success / error 图标。
  pointer-events: none —— toast 只做反馈，不许挡住底下的点击（系统 toast 同样不挡）。
-->
<template>
	<view v-if="toastState.visible" class="app-toast">
		<view class="app-toast__box">
			<u-icon v-if="iconName" class="app-toast__icon" :name="iconName" size="34" color="#FFFFFF" />
			<text class="app-toast__text">{{ toastState.text }}</text>
		</view>
	</view>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue';
import { toastState, addToastInstance, removeToastInstance } from '@/store/toast';

// 图标沿用 uni.showToast 的取值，只把两个语义档映射成 uview 的实心图标
const ICONS = {
	success: 'checkmark-circle-fill',
	error: 'close-circle-fill'
};
const iconName = computed(() => ICONS[toastState.icon] || '');

onMounted(addToastInstance);
onBeforeUnmount(removeToastInstance);
</script>

<style lang="scss" scoped>
.app-toast {
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	// 只做反馈、不挡点击（与系统 toast 一致）
	pointer-events: none;
	z-index: $z-toast;
	display: flex;
	align-items: center;
	justify-content: center;
}

.app-toast__box {
	display: flex;
	flex-direction: column;
	align-items: center;
	max-width: 520rpx;
	padding: 28rpx 40rpx;
	border-radius: 20rpx;
	// 深墨底 + 轻投影：浅色页面上对比够，又不抢主色
	background-color: rgba($text-title, 0.90);
	box-shadow: $shadow-float;
	animation: at-pop 0.16s $ease-standard;
}

.app-toast__icon {
	margin-bottom: $sp-2;
}

.app-toast__text {
	font-size: $fs-body;
	line-height: 1.5;
	color: #ffffff;
	// 2026-10-29 用户定：**两端对齐**（整块仍由遮罩层居中）。
	// 居中对齐时第二行居中缩进、左对齐时右缘参差，两端对齐后多行是一条齐边的段落；
	// 单行时 justify 对最后一行不生效，观感与左对齐一致。text-align-last 显式写死，防端上差异。
	text-align: justify;
	text-align-last: left;
	word-break: break-word;
	// 极长文案（后端整段报错）最多 4 行，超出省略，不撑成一整屏
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 4;
	overflow: hidden;
}

@keyframes at-pop {
	from {
		opacity: 0;
		transform: scale(0.94);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
}
</style>