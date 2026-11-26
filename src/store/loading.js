// ---------------------------------------------------------------------------
// 全局 loading 状态：只由 services/toast.js 的 showLoading / hideLoading 驱动
// （引用计数在 toast 层，这里只存「当前该不该显示、显示什么文案」）。
// 渲染方是 components/app-loading，页面不要直接碰这里。
// ---------------------------------------------------------------------------

import { reactive } from 'vue';

export const loadingState = reactive({
	visible: false,
	title: ''
});

// 已挂载「全局模式」<app-loading /> 组件的页面数。
// toast.js 用它决定走组件渲染还是降级 uni.showLoading：
// 某页忘放组件时 loading 至少还有原生兜底，不会出现「转圈发出去了但没人渲染」。
let instances = 0;

export function addLoadingInstance() {
	instances += 1;
}

export function removeLoadingInstance() {
	instances = Math.max(0, instances - 1);
}

export function hasLoadingInstance() {
	return instances > 0;
}
