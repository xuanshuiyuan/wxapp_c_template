// ---------------------------------------------------------------------------
// 弹窗状态机：全局一次只显示一个，后来的排队，每个弹窗对应一个 Promise。
// 页面不要直接碰这里，用 composables/useModal.js 的 alert / confirm。
// ---------------------------------------------------------------------------

import { reactive } from 'vue';

export const modalState = reactive({
	current: null // 当前展示的弹窗配置，null 表示无
});

const queue = [];

// 关闭动画时长，等它走完再弹下一个，避免两个弹窗叠在一起
const SWITCH_DELAY = 250;

/**
 * 打开一个弹窗
 * @param {object} config { title, content, showCancel, confirmText, cancelText, close }
 * @param {Function} onSettle 用户操作完成时的回调（由调用方转成 resolve 值）
 * @returns {Promise<*>}
 */
export function pushModal(config, onSettle) {
	return new Promise(resolve => {
		queue.push({ config, resolve, onSettle });
		if (queue.length === 1) show(queue[0]);
	});
}

function show(entry) {
	modalState.current = {
		close: false,
		title: '提示',
		content: '',
		showCancel: false,
		confirmText: '确定',
		cancelText: '取消',
		...entry.config
	};
}

/**
 * 关闭当前弹窗并推进队列
 * @param {*} result 传给 Promise 的值
 */
export function settleModal(result) {
	const entry = queue.shift();
	if (!entry) return;
	modalState.current = null;
	entry.resolve(entry.onSettle ? entry.onSettle(result) : result);
	if (queue.length) {
		setTimeout(() => {
			if (queue.length) show(queue[0]);
		}, SWITCH_DELAY);
	}
}
