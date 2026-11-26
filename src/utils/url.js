// ---------------------------------------------------------------------------
// 地址拼接：后端下发的相对地址（如 demo create 返回的 /v2/webview/...?access_token=...）
// 拼上当前环境的接口 host。
//
// 为什么要单独一层：web-view 的 src 必须是绝对地址（H5 iframe 可以用相对地址，
// 但小程序不行）；host 的唯一来源仍是 config/env 的 rootPath。
// 已是 http(s) 绝对地址的保持原样。
// ---------------------------------------------------------------------------

import { rootPath } from '@/config/env';

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

export default absoluteUrl;