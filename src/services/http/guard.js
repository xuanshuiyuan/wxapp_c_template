// ---------------------------------------------------------------------------
// 全局业务码守卫（机制层，不认识任何具体业务码）：
// 「某个业务码返回时要做全局动作（跳登录 / 弹实名框 …）」由 services/guards.js
// 在模块加载时登记进来，request.js 命中码后经 fireCodeGuard 触发。
// 与 authHandler 同一套路：http 层不反向依赖业务语义，依赖方向保持向下。
//
// 去重语义：同一码的动作未结束（弹窗未 settle / 跳转动作未跑完）+ 结束后 1s 冷静期内，
// 后续命中直接忽略 —— 页面并发 10 个接口全回「未实名」也只弹 1 个框。
// ---------------------------------------------------------------------------

const guards = new Map(); // code -> { handler, busy }

// 动作完成后的冷静期：同一批并发响应的到达有时间差，只靠 busy 挡不住「先回来的已经放行」
const REARM_DELAY = 1000;

/**
 * 登记一个码的全局动作。code 为空（码值还没和后端核对时的占位 0）直接忽略，
 * 保证未配置的守卫绝不生效。
 * @param {number|string} code 业务码
 * @param {Function} handler 命中的动作，可返回 Promise（弹窗等 settle）
 */
export function registerCodeGuard(code, handler) {
	const numeric = Number(code);
	if (!numeric || typeof handler !== 'function') return;
	guards.set(numeric, { handler, busy: false });
}

export function getCodeGuard(code) {
	return guards.get(code) || null;
}

/** 触发动作：busy 去重 + 异常只记日志不升级（全局动作失败不该再抛给页面） */
export function fireCodeGuard(entry) {
	if (entry.busy) return;
	entry.busy = true;
	Promise.resolve()
		.then(() => entry.handler())
		.catch(err => console.warn('[guard] 全局业务码动作执行失败：', err))
		.finally(() => setTimeout(() => (entry.busy = false), REARM_DELAY));
}
