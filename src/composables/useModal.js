// ---------------------------------------------------------------------------
// Promise 化弹窗。页面顶部放一次 <app-modal />，然后：
//
//   import { alert, confirm } from '@/composables/useModal'
//
//   await alert('保存成功')                          // 只提示
//   if (await confirm({ title: '删除', content: '确定删除这条记录吗？' })) { ... }
//
// 多次调用会排队依次显示，不会像全局单例那样互相覆盖。
// ---------------------------------------------------------------------------

import { pushModal } from '@/store/modal';

const SETTLE_CONFIRM = 'confirm';
const SETTLE_CANCEL = 'cancel';
const SETTLE_CLOSE = 'close';

function toConfig(options) {
	return typeof options === 'string' ? { content: options } : { ...options };
}

/**
 * 提示框（单按钮）
 * @param {string|object} options 字符串即 content；对象支持 title/content/confirmText/close
 * @returns {Promise<'confirm'|'close'>}
 */
export function alert(options) {
	return pushModal({ showCancel: false, ...toConfig(options) });
}

/**
 * 确认框（双按钮）
 * @param {string|object} options 对象支持 title/content/confirmText/cancelText/close
 * @returns {Promise<boolean>} 点确定 true，取消/关闭 false
 */
export function confirm(options) {
	return pushModal({ showCancel: true, ...toConfig(options) }, result => result === SETTLE_CONFIRM);
}

/**
 * 需要区分「确定 / 取消 / 点蒙层关闭」时用这个
 * @returns {Promise<'confirm'|'cancel'|'close'>}
 */
export function settle(options) {
	return pushModal(toConfig(options));
}

export const MODAL_SETTLE = { SETTLE_CONFIRM, SETTLE_CANCEL, SETTLE_CLOSE };

export default { alert, confirm, settle };
