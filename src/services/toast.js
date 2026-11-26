// ---------------------------------------------------------------------------
// UI 反馈统一出口：toast / loading。
// loading 用引用计数，多个并发请求各自 hide 不会互相把对方的 loading 关掉，
// 也不需要业务代码到处补 hideLoading。
// 渲染走自定义组件 <app-loading />（品牌转圈图，状态在 store/loading）；
// 当前页面没挂组件时自动降级 uni.showLoading，保证 loading 永远有人收尾。
//
// toast 自 2026-10-29 换肤批起也走自绘 <app-toast />（圆角/配色跟主题），
// 同样是「有实例就用自绘、没有就降级 uni.showToast」，调用方签名一个字没变。
// ---------------------------------------------------------------------------

import { loadingState, hasLoadingInstance } from '@/store/loading';
import { hasToastInstance, pushToast } from '@/store/toast';

let loadingCount = 0;
// 本次显示走的是不是原生降级：hide 必须对称关同一个出口，否则会卡蒙层
let usingNative = false;

// ---------------------------------------------------------------------------
// 「快请求 loading 一闪而过」治理（2026-11-12，用户真机反馈：很多点击请求很快，
// 转圈出现一帧就消失，观感像页面在抖）。
//   ① 延迟显示：发出后 200ms 内请求就结束 → 一次都不渲染（快请求根本看不到转圈）；
//   ② 最短展示：真的显示出来以后至少停留 300ms，不会「刚出现就被关掉」。
// 两层都收在 show/hide 这一处，调用方 `{ loading: true }` 与 showLoading 签名不变，
// 引用计数语义也不变（并发请求仍然各自 hide、互不误关）。
// ---------------------------------------------------------------------------
const SHOW_DELAY = 200;
const MIN_VISIBLE = 300;

let showTimer = null; // 等待延迟显示的定时器（还没上屏）
let hideTimer = null; // 最短展示期满后关闭的定时器（已上屏、等关）
let visibleAt = 0; // 本次上屏时刻，用来算最短展示还剩多久

/** 真正上屏（组件渲染或原生降级），两条出口只能选一条 */
function openLoading(title) {
	if (hasLoadingInstance()) {
		usingNative = false;
		loadingState.title = title;
		loadingState.visible = true;
	} else {
		// 页面没放 <app-loading />：退回原生，宁可样式旧也不能没有反馈
		usingNative = true;
		uni.showLoading({ title, mask: true });
	}
	visibleAt = Date.now();
}

/** 真正关闭，与 openLoading 的出口一一对称 */
function closeLoading() {
	if (usingNative) {
		usingNative = false;
		uni.hideLoading();
	} else {
		loadingState.visible = false;
	}
}

export function toast(message, icon = 'none', duration = 2000) {
	if (!message) return Promise.resolve();
	const text = String(message);
	// 页面挂了 <app-toast /> → 自绘（配色/圆角跟主题）；没挂 → 原生兜底
	if (hasToastInstance()) {
		pushToast(text, icon, duration);
		return new Promise(resolve => setTimeout(resolve, duration));
	}
	return new Promise(resolve => {
		uni.showToast({ title: text, icon, duration, complete: () => setTimeout(resolve, duration) });
	});
}

export const errorToast = message => toast(message, 'error');
export const successToast = message => toast(message, 'success');

export function showLoading(title = '') {
	loadingCount += 1;
	// 上一轮在等「最短展示期满」关闭：取消它，转圈保持连续（计数已是 1，不要重复上屏）
	if (hideTimer) {
		clearTimeout(hideTimer);
		hideTimer = null;
		return;
	}
	// 已在屏上 / 已在等延迟显示 → 只记计数
	if (loadingState.visible || usingNative || showTimer) return;
	// 延迟显示：这 200ms 内请求结束，hideLoading 会撤掉定时器，用户一次都看不到转圈
	showTimer = setTimeout(() => {
		showTimer = null;
		if (loadingCount > 0) openLoading(title);
	}, SHOW_DELAY);
}

export function hideLoading() {
	loadingCount = Math.max(0, loadingCount - 1);
	if (loadingCount > 0) return;
	// 还没到显示时间就结束了：撤掉定时器，不上屏（「闪一下」的根因就在这里）
	if (showTimer) {
		clearTimeout(showTimer);
		showTimer = null;
		return;
	}
	if (!loadingState.visible && !usingNative) return;
	// 已上屏但没停够最短时长：延后关闭；期间来新请求会在 showLoading 里取消这个定时器
	const remain = MIN_VISIBLE - (Date.now() - visibleAt);
	if (remain > 0) {
		if (!hideTimer) {
			hideTimer = setTimeout(() => {
				hideTimer = null;
				if (loadingCount === 0) closeLoading();
			}, remain);
		}
		return;
	}
	closeLoading();
}

/** 强制关闭 loading（页面卸载等异常路径兜底）：两个定时器都要撤，不能把关闭延后 */
export function resetLoading() {
	loadingCount = 0;
	if (showTimer) {
		clearTimeout(showTimer);
		showTimer = null;
	}
	if (hideTimer) {
		clearTimeout(hideTimer);
		hideTimer = null;
	}
	if (usingNative) {
		usingNative = false;
		uni.hideLoading();
	}
	loadingState.visible = false;
}

/**
 * 包一层 loading，自动计数、异常也保证关闭
 * @param {Function} task 返回 Promise 的任务
 * @param {string} [title]
 */
export async function withLoading(task, title) {
	showLoading(title);
	try {
		return await task();
	} finally {
		hideLoading();
	}
}

export default { toast, errorToast, successToast, showLoading, hideLoading, resetLoading, withLoading };
