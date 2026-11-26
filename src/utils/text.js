// ---------------------------------------------------------------------------
// 文本工具 — 纯函数，仅做字符串处理
// ---------------------------------------------------------------------------

/**
 * 中间省略：按全角/半角宽度截断字符串，在中间插入「…」。
 * 全角=1、半角≈0.55。
 * @param {string} str 原始字符串
 * @param {number} [max=10] 最大显示宽度（全角字符宽度=1，半角=0.55）
 * @returns {string}
 */
export function middleEllipsis(str, max = 10) {
	if (!str) return str;
	const w = ch => (ch.charCodeAt(0) > 255 ? 1 : 0.55);
	const chars = [...str];
	if (chars.reduce((s, c) => s + w(c), 0) <= max) return str;
	const headMax = (max - 1) * 0.6;
	const tailMax = (max - 1) * 0.4;
	let head = '';
	let hw = 0;
	for (const c of chars) {
		if (hw + w(c) > headMax) break;
		head += c;
		hw += w(c);
	}
	let tail = '';
	let tw = 0;
	for (let i = chars.length - 1; i >= 0; i--) {
		if (tw + w(chars[i]) > tailMax) break;
		tail = chars[i] + tail;
		tw += w(chars[i]);
	}
	return head.replace(/\s+$/, '') + '…' + tail.replace(/^\s+/, '');
}