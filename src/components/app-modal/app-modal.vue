<!--
  全局弹窗容器：页面模板里放一次 <app-modal />，业务代码通过 composables/useModal 调起。
  这里只负责渲染与回收用户操作，不写任何业务判断。
  通用风格：卡片直角小圆角 / 主色按钮 / 紧凑内边距。

  为什么不用 u-modal：
    1) 卡片下方的 ✕ 会落进 u-modal 的白色内容区里（白图标压白底＝看不见），
       还会作为 flex 兄弟节点把卡片挤歪；
    2) 它遮罩挡不住页面滚动，弹窗打开时底下页面仍可滑动。
  现在用自绘遮罩：@touchmove.stop.prevent 锁滚动（小程序里等价 catchtouchmove），
  卡片 @click.stop 避免误触蒙层。

  对外协议没变：settleModal('confirm' | 'cancel' | 'close')，
  close: true 才允许点蒙层/点 ✕ 关闭，否则必须选按钮。
-->
<template>
	<!-- touchmove 拦触摸滚动（等价小程序的 catchtouchmove）；
	     H5 桌面端的滚轮/键盘由 services/platform.js 的 lockPageScroll 锁 body 兜住 -->
	<view v-if="current" class="app-modal" @touchmove.stop.prevent>
		<view class="app-modal__mask" @click="onMask" />

		<view class="app-modal__wrap">
			<view class="app-modal__card" @click.stop>
				<!-- 顶部品牌色装饰条 -->
				<view class="app-modal__accent" />

				<!-- 图标 + 标题 -->
				<view class="app-modal__head">
					<view class="app-modal__icon">
						<u-icon name="info-circle-fill" size="28" :color="theme.primary" />
					</view>
					<text class="app-modal__title">{{ current.title }}</text>
				</view>

				<!-- 内容：限高可滚，长文本（如 JSON）不会顶出屏幕 -->
				<scroll-view v-if="hasContent" class="app-modal__body" scroll-y>
					<text class="app-modal__text">{{ current.content }}</text>
				</scroll-view>

				<!-- 操作按钮 -->
				<view class="app-modal__footer">
					<view
						v-if="current.showCancel && current.cancelText"
						class="app-modal__btn app-modal__btn--ghost"
						hover-class="app-modal__btn--hover"
						@click="onCancel"
					>
						{{ current.cancelText }}
					</view>
					<view
						v-if="current.confirmText"
						class="app-modal__btn app-modal__btn--primary"
						:class="{ 'app-modal__btn--alone': !current.showCancel }"
						hover-class="app-modal__btn--hover"
						@click="onConfirm"
					>
						{{ current.confirmText }}
					</view>
				</view>
			</view>

			<!-- 关闭：卡片下方居中的半透明圆钮 -->
			<view v-if="current.close" class="app-modal__close" @click="onClose">
				<u-icon name="close" size="24" :color="theme.textInverse" />
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, watch, onBeforeUnmount } from 'vue'
import { modalState, settleModal } from '@/store/modal'
import { theme } from '@/config/theme'
import { lockPageScroll, unlockPageScroll } from '@/services/platform'

const current = computed(() => modalState.current)
const hasContent = computed(() => !!(current.value && current.value.content))

const onCancel = () => settleModal('cancel')
const onConfirm = () => settleModal('confirm')
const onClose = () => settleModal('close')

// 只有声明了 close 的弹窗才允许点蒙层关闭，避免误触把确认框吞掉
const onMask = () => {
	if (current.value && current.value.close) onClose()
}

// 弹窗期间锁底层页面滚动
const stopLockWatch = watch(current, visible => (visible ? lockPageScroll() : unlockPageScroll()))
onBeforeUnmount(() => {
	stopLockWatch()
	if (current.value) unlockPageScroll()
})
</script>

<style lang="scss" scoped>
.app-modal {
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	z-index: $z-modal;
	display: flex;
	align-items: center;
	justify-content: center;
}

.app-modal__mask {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	background-color: rgba($text-title, 0.55);
	animation: am-fade 0.2s ease-out;
}

.app-modal__wrap {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.app-modal__card {
	position: relative;
	width: 560rpx;
	box-sizing: border-box;
	padding: $card-padding;
	padding-top: calc($card-padding + 2rpx);
	border-radius: $rd-card; // 28rpx（2026-10-29 换肤）
	background-color: $bg-card;
	box-shadow: $shadow-float; // 浮层阴影
	animation: am-pop 0.22s cubic-bezier(0.2, 0.9, 0.32, 1.14);
	overflow: hidden;
}

// 顶部主色装饰条
.app-modal__accent {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 6rpx;
	background: linear-gradient(90deg, $color-primary, $color-primary-dark);
}

// 图标 + 标题行
.app-modal__head {
	display: flex;
	align-items: center;
	// 2026-10-29：标题行**保持居中**（用户明确要求）；正文两端对齐，两者互不影响
	justify-content: center;
	margin-top: $sp-1;
}

.app-modal__icon {
	width: 48rpx;
	height: 48rpx;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
}

.app-modal__title {
	margin-left: $sp-2;
	font-size: $fs-label; // 29rpx（通用 15pt）
	font-weight: $fw-semibold;
	color: $text-title;
	line-height: $lh-label;
}

// 内容区
.app-modal__body {
	max-height: 42vh;
	margin-top: $sp-4;
	margin-bottom: $sp-1;
}

.app-modal__text {
	display: block;
	font-size: $fs-body; // 25rpx（13pt）
	line-height: $lh-loose;
	color: $text-sub;
	// 2026-10-29 用户定：**两端对齐**——居中对齐换行后短行左右缩进、左对齐右缘参差，
	// 两端对齐后多行是一条齐边的段落；最后一行按左对齐收（text-align-last 显式写死）
	text-align: justify;
	text-align-last: left;
	word-break: break-all;
}

// 操作按钮
// 按钮间距走「取消键右外边距」而不是 `gap`：本组件是每页都渲染的基础设施件，
// 而小程序老内核对 flex gap 支持不稳（rule-style-css 黑名单）。单按钮档（--alone）本就无间距，
// 故挂在 ghost 上——它出现时后面必有主按钮，两键等宽分配与 gap 版一致
.app-modal__footer {
	display: flex;
	margin-top: $sp-4;
}

.app-modal__btn--ghost {
	margin-right: $sp-2;
}

.app-modal__btn {
	flex: 1;
	height: 76rpx;
	border-radius: $rd-button; // 44rpx（2026-10-29 换肤：原 4rpx）
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: $fs-cta; // 33rpx（通用 17pt CTA）
	font-weight: $fw-semibold;
	font-family: inherit;
	border: none;

	&--primary {
		background: linear-gradient(135deg, $color-primary, $color-primary-dark);
		color: $text-on-yellow;
	}

	&--ghost {
		background-color: $bg-fill-chip;
		color: $text-main;
	}

	&--hover {
		opacity: 0.85;
	}
}

// 只有一个按钮时（alert）占满整行
.app-modal__btn--alone {
	margin: 0;
}

// 关闭按钮
.app-modal__close {
	width: 60rpx;
	height: 60rpx;
	margin-top: $sp-5;
	border-radius: $rd-pill;
	border: 2rpx solid rgba($text-inverse, 0.55);
	background-color: rgba($text-inverse, 0.1);
	display: flex;
	align-items: center;
	justify-content: center;
	animation: am-fade 0.28s ease-out;
}

@keyframes am-fade {
	from { opacity: 0; }
	to { opacity: 1; }
}

@keyframes am-pop {
	from {
		opacity: 0;
		transform: scale(0.88);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
}
</style>