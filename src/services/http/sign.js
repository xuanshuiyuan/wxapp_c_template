// ---------------------------------------------------------------------------
// 请求签名：每个请求 header 携带
//   source / timestamp / sign / random / edition / token / userid
// sign = MD5("Source=..&TimeStamp=..&Key=<apiKey>&Weight=<random>").toUpperCase()
//
// token / userid 直接读 services/storage，不依赖 session，避免 http -> session -> http 循环。
// ---------------------------------------------------------------------------

import md5 from 'blueimp-md5';
import { source, edition } from '@/config/app';
import { apiKey, developBypass, isProd } from '@/config/env';
import { getToken, getUserId } from '@/services/storage';

const RANDOM_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function randomString() {
	const length = Math.round(Math.random() * 10 + 10);
	let result = '';
	for (let i = length; i > 0; --i) {
		result += RANDOM_CHARS[Math.floor(Math.random() * RANDOM_CHARS.length)];
	}
	return result;
}

/**
 * @param {object} [options]
 * @param {string} [options.contentType] 需要覆盖 Content-Type 时传入（上传场景传空串并在 transport 里删除该头）
 * @returns {Record<string, string>}
 */
export function buildSignHeader(options = {}) {
	// 文档约定秒级时间戳（与服务器时差超 300s 双向拒绝）：传毫秒会被当成时钟异常直接 40003
	const timestamp = Math.floor(Date.now() / 1000);
	const random = randomString();
	const header = {
		source,
		// HTTP 头值统一字符串：个别端对数字类型的 header 值处理不一致
		timestamp: String(timestamp),
		sign: md5(`Source=${source}&TimeStamp=${timestamp}&Key=${apiKey}&Weight=${random}`).toUpperCase(),
		random,
		edition,
		// 占位值只用于满足后端 TokenHeaders 的存在性检查；真正登录态由 request 层先补会话
		token: String(getToken() || 'token'),
		userid: String(getUserId() || 'userid')
	};

	// 本地联调免签名：后端 local/develop 环境 DevelopBypass=true 时，
	// 请求头 develop 与配置值一致即跳过签名校验（生产环境后端该开关恒为 false）。
	// 只在非 production 且 .env 配了 VITE_DEVELOP_BYPASS 时才带：
	// .env.local 是全局覆盖文件，若误设该值，build:* 也不能把 develop 头带进生产包。
	if (developBypass && !isProd) header.develop = developBypass;

	if (options.contentType === null) {
		// 交给小程序/浏览器自行生成 multipart 边界
	} else {
		header['Content-Type'] = options.contentType || 'application/x-www-form-urlencoded; charset=UTF-8';
	}
	return header;
}
