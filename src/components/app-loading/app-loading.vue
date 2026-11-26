<!--
  自定义 loading（easycom 自动注册：页面里放 <app-loading /> 即可，无需 import）。
  通用风格：纯 CSS 品牌色转圈（无网络依赖），也支持 OSS 动画图覆盖。

  为什么不用 uni.showLoading：视觉定制品，原生 API 改不了颜色/图标。

  两种用法：
    全局模式  <app-loading />                          —— 不传 show，跟随 store/loading 的 loadingState。
                                                    请求 { loading: true } 与 services/toast 的 showLoading 最终驱动它；
                                                    页面没放本组件时 toast.js 自动降级 uni.showLoading，不会「发了没人渲染」。
    局部模式  <app-loading :show="submitting" text="提交中" />
                                                    —— 页面自己的布尔量控制，同样是全屏遮罩，适合表单提交这类「整页等待」。
  模块内 / 按钮内的小转圈不要用本组件（它是全屏的），用 u-loading-icon；列表首屏用 app-skeleton。

  转圈：默认纯 CSS 圆环（主色），传 image 则改用 OSS 图（兼容旧配置）。
  遮罩：默认全透明 —— 根节点铺满屏幕只为拦截点击/滚动，不把页面压暗
  （loading 是短时反馈，变黑一下再变回来视觉很吵）；要暗遮罩传 :mask="true"。
-->
<template>
	<view v-if="visible" class="app-loading" :class="{ 'app-loading--dim': mask }" @touchmove.stop.prevent>
		<!-- 有自定义 image 时用 OSS 图，否则纯 CSS 通用转圈 -->
		<image v-if="hasImage" class="app-loading__img" :src="imgSrc" mode="aspectFit" @error="onImgError" />
		<view v-else class="app-loading__spinner" />
		<text v-if="showText" class="app-loading__text">{{ showText }}</text>
	</view>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { loadingState, addLoadingInstance, removeLoadingInstance } from '@/store/loading'
import { lockPageScroll, unlockPageScroll } from '@/services/platform'
import { ossUrl } from '@/utils/oss'
import { LOADING_IMAGE, LOADING_IMAGE_FALLBACK } from '@/config/app'

const props = defineProps({
	// null = 全局模式（跟随 loadingState）；显式传 true/false = 局部模式
	show: { type: Boolean, default: null },
	// 局部模式文案；全局模式用 showLoading 传入的 title
	text: { type: String, default: '' },
	// 转圈图覆盖（OSS 相对路径或完整地址），默认用全局配置；传 '' 则用纯 CSS 转圈
	image: { type: String, default: '' },
	// 是否压暗底层页面：默认 false（透明拦截层，只在要强调「停下等你」时打开）
	mask: { type: Boolean, default: false }
})

// show 默认 null 即全局模式
const isGlobal = props.show === null

const visible = computed(() => (isGlobal ? loadingState.visible : !!props.show))
const showText = computed(() => (isGlobal ? loadingState.title : props.text))

// 有 image prop 或全局 LOADING_IMAGE 时走 OSS 图；否则纯 CSS
const hasImage = computed(() => !!(props.image || LOADING_IMAGE))

const imgError = ref(false)
const imgSrc = computed(() => (imgError.value ? LOADING_IMAGE_FALLBACK : ossUrl(props.image || LOADING_IMAGE)))
function onImgError() {
	imgError.value = true
}

// 打开期间锁底层页面滚动。
// ⚠️ 记账式锁：只在「由关到开」时 lock 一次、且只解锁自己锁过的那次（locked 标志）。
// 不能写成 `watch(..., { immediate: true })` 配 `showing ? lock : unlock`——挂载时 visible 为
// false 的那次回调会**对一个从未 lock 过的浮层投一票 unlock**，把别人（弹窗/其它浮层）的锁
// 减到 0：H5 桌面端弹窗开着还能滚底层页（引用计数被破坏）。app-modal 同款逻辑同样不挂 immediate。
let locked = false
function syncScrollLock(showing) {
	if (showing && !locked) {
		locked = true
		lockPageScroll()
	} else if (!showing && locked) {
		locked = false
		unlockPageScroll()
	}
}
const stopLockWatch = watch(visible, syncScrollLock)
syncScrollLock(visible.value) // 初始态对齐：局部模式可能一挂载就是 open（缺了这句就不会上锁）

onMounted(() => {
	if (isGlobal) addLoadingInstance()
})
onBeforeUnmount(() => {
	if (isGlobal) removeLoadingInstance()
	stopLockWatch()
	if (locked) {
		locked = false
		unlockPageScroll()
	}
})
</script>

<style lang="scss" scoped>
.app-loading {
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	z-index: $z-loading;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

// 默认透明拦截层，:mask="true" 才压暗
.app-loading--dim {
	background-color: $bg-mask;
}

// OSS 转圈图
.app-loading__img {
	width: 96rpx;
	height: 96rpx;
}

// 通用品牌色 CSS 转圈（纯 CSS，无网络依赖）
.app-loading__spinner {
	width: 72rpx;
	height: 72rpx;
	border: 6rpx solid rgba($color-primary, 0.14); // 主色淡底圈
	border-top-color: $color-primary; // 主色高亮弧
	border-right-color: $color-primary-dark; // 深主色，转起来有渐变感
	border-radius: 50%;
	// 主色柔光：浅底上转圈更「亮」，与流光舱体同一通电语言
	box-shadow: 0 0 16rpx rgba($color-primary, 0.22);
	animation: al-spin 0.8s linear infinite;
}

.app-loading__text {
	margin-top: $sp-3;
	font-size: $fs-body;
	line-height: $lh-tight;
	color: $text-sub; // 次要色，柔和
}

@keyframes al-spin {
	to { transform: rotate(360deg); }
}
</style>