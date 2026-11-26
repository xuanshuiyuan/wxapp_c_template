/**
 * 数值归一与金额格式化（纯函数）。
 *
 * 为什么单独立一份：契约里「缺失 / 不适用」常常是**空串、null 或哨兵值**，
 * 而「真的是 0」与「没有这个数」在展示上必须分开（印 `¥0.00` 还是 `--`）。
 * 同一段归一逻辑不允许在各业务域各写一份；各域只保留自己那层带配置的薄包装。
 */

/**
 * 数值归一：空串 / `null` / `undefined` / 非数字 → `null`。
 *
 * ⚠️ **`0` 必须原样返回 `0`**（不能走 `||` 兜底），否则「算出来正好是 0」会被当成「没有值」。
 * 容忍字符串形态（契约里不少数值字段实际下发为 string）。
 * @param {*} v 原始值
 * @returns {number|null}
 */
export function toNum(v) {
	if (v === null || v === undefined || v === '') return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

/**
 * 数值归一 + 兜底（缺值取 `fallback`）。
 * 不用 `??`：本仓未启用该语法，统一走显式函数。
 * @param {*} v 原始值
 * @param {number} fallback 缺值时取的值
 * @returns {number}
 */
export function numOr(v, fallback) {
	const n = toNum(v);
	return n === null ? fallback : n;
}

/**
 * 元 → 万元展示串（`¥x.xx万`）。契约里金额单位一律**元**，"万"由前端换算。
 *
 * ⚠️ 缺值印 `unknown`（默认 `--`），**不要拼成 `¥--万`**；而 `0` 是「算出来正好是 0」，
 * 照常印 `¥0.00万`。单位 / 后缀 / 缺值文案由调用方按域下发。
 * @param {*} yuan 金额（元）
 * @param {object} [opts] { unit = 10000, suffix = '万', unknown = '--' }
 * @returns {string}
 */
export function yuanToWanText(yuan, opts = {}) {
	const { unit = 10000, suffix = '万', unknown = '--' } = opts;
	const n = toNum(yuan);
	return n === null ? unknown : `¥${(n / unit).toFixed(2)}${suffix}`;
}