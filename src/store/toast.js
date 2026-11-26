// ---------------------------------------------------------------------------
// 全局 toast 状态（2026-10-29 换肤批新增）：只由 services/toast.js 写入，
// 渲染方是 components/app-toast，页面不要直接碰这里。
//
// 为什么要自绘：uni.showToast 的样式是系统定死的（黑底胶囊、固定字号），
// 与「薄荷白 + 圆角」的界面不搭。自绘版跟随 theme token，圆角/字色/投影都能统一。
// 降级：某页没挂 <app-toast /> 时，toast.js 自动退回 uni.showToast（同 app-loading 的做法）。
// ---------------------------------------------------------------------------

import { reactive } from 'vue';

export const toastState = reactive({
	visible: false,
	text: '',
	// 'none' | 'success' | 'error'（沿用 uni.showToast 的取值，调用方不用改）
	icon: 'none'
});

// 已挂载 <app-toast /> 的页面数：>0 才走自绘，否则降级原生
let instances = 0;
let timer = null;

export function addToastInstance() {
	instances += 1;
}

export function removeToastInstance() {
	instances = Math.max(0, instances - 1);
	// 最后一个渲染方卸载时顺手收起，避免切页后残留一条「没人负责关」的 toast
	if (instances === 0) {
		toastState.visible = false;
		clearTimeout(timer);
	}
}

export function hasToastInstance() {
	return instances > 0;
}

/**
 * 弹一条 toast（连续调用时直接替换文案并重新计时，与系统 toast 行为一致）
 * @param {string} text 文案（调用方已 String 过）
 * @param {string} icon none / success / error
 * @param {number} duration 毫秒
 */
export function pushToast(text, icon = 'none', duration = 2000) {
	toastState.text = text;
	toastState.icon = icon;
	toastState.visible = true;
	clearTimeout(timer);
	timer = setTimeout(() => {
		toastState.visible = false;
	}, duration);
}