// ---------------------------------------------------------------------------
// OSS 图片地址拼接：业务代码 / 配置里只存「相对路径」，域名统一挂在 config/env.js。
// 换 CDN 只动配置，不散落字符串。
// 已是绝对地址（http/https/data:/blob:/wxfile:）与本地路径（/static 等打头 /）原样返回。
// ---------------------------------------------------------------------------

import { ossHost } from '@/config/env';

/**
 * @param {string} path OSS 相对路径（不要带前导斜杠），或已是完整/本地地址
 */
export function ossUrl(path) {
	if (!path) return '';
	if (/^(https?:\/\/|data:|blob:|wxfile:|\/)/.test(path)) return path;
	return ossHost + path;
}

export default ossUrl;
