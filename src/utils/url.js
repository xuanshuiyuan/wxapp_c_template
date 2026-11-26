// ---------------------------------------------------------------------------
// 地址拼接：后端下发的相对地址（如 demo create 返回的 /v2/webview/...?access_token=...）
// 拼上当前环境的接口 host。
//
// 为什么要单独一层：web-view 的 src 必须是绝对地址（H5 iframe 可以用相对地址，
// 但小程序不行）；host 的唯一来源仍是 config/env 的 rootPath。
// 已是 http(s) 绝对地址的保持原样。
// ---------------------------------------------------------------------------

import { rootPath } from '@/config/env';
import { routeVersion } from '@/config/app';

/**
 * 相对路径 → 绝对地址
 * @param {string} path 后端下发的相对地址（可带 /v2 前缀与 query）
 * @returns {string}
 */
export function absoluteUrl(path) {
	const url = String(path || '');
	if (!url) return '';
	if (/^https?:\/\//.test(url)) return url;
	const host = String(rootPath || '').replace(/\/+$/, '');
	return host + (url.startsWith('/') ? url : `/${url}`);
}

/**
 * 是否允许交给 <web-view> 的地址（模板安全边界）。
 * - 只允许 http(s) 绝对地址，或后端同源的 `/v2/webview/...` 相对地址；
 * - 绝对地址的 host 必须与 rootPath 同源（后端下发的文档链接就是同源）；
 * - 明确拒绝 javascript: / data: / 任意第三方域名。
 * @param {string} url
 * @returns {boolean}
 */
export function isTrustedWebviewUrl(url) {
	const value = String(url || '').trim();
	if (!value) return false;
	// H5 同域（rootPath 为空）时后端链接是 /v2/webview/... 相对地址
	if (new RegExp(`^/${routeVersion}/webview/`, 'i').test(value)) return true;
	if (!/^https?:\/\//i.test(value)) return false;
	const target = /^https?:\/\/([^/?#]+)/i.exec(value);
	const base = /^https?:\/\/([^/?#]+)/i.exec(String(rootPath || ''));
	if (!target || !base) return false;
	return target[1].toLowerCase() === base[1].toLowerCase();
}

export default absoluteUrl;