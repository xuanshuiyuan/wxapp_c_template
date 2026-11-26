// ---------------------------------------------------------------------------
// 本地存储唯一入口：业务代码不要直接调 uni.setStorageSync / getStorageSync，
// 这样 key 命名、序列化、清理只有一处需要维护。
// ---------------------------------------------------------------------------

import { storageKey, SESSION_FIELDS } from '@/config/app';

export function getItem(name, defaultValue = '') {
	const value = uni.getStorageSync(storageKey(name));
	return value === '' || value === undefined || value === null ? defaultValue : value;
}

export function setItem(name, value) {
	uni.setStorageSync(storageKey(name), value);
}

export function removeItem(name) {
	uni.removeStorageSync(storageKey(name));
}

// ---------------------------------------------------------------------------
// 登录态：由后端登录响应写入，字段以 SESSION_FIELDS 为准。
//
// demo 登录（POST /web/demo/login）响应 data = { token, expires_in }，
// 不含 user_info —— user_id 是登录入参，需要由调用方一并写入。
// 真实项目（微信 code2session / 手机号验证码）若响应带 user_info，这里按需扩展即可。
// ---------------------------------------------------------------------------

/**
 * 写入登录响应
 * @param {object} data  { token, user_id, expires_in?, userinfo? }
 */
export function writeSession(data) {
	const session = data || {};
	const expiresIn = Number(session.expires_in) || 0;
	setItem('token', session.token || '');
	setItem('user_id', session.user_id || '');
	setItem('userinfo', session.userinfo || {});
	// 过期时刻（毫秒）：expires_in 是后端签发的 TTL（模板后端 7200s）；
	// 存绝对值只为在冷启动/请求前判断「还值不值得带这个 token」，不参与签名
	setItem('expires_at', expiresIn > 0 ? Date.now() + expiresIn * 1000 : 0);
}

export function clearSession() {
	SESSION_FIELDS.forEach(name => removeItem(name));
}

export function getToken() {
	return getItem('token', '');
}

export function getUserId() {
	return getItem('user_id', '');
}

export function getUserInfo() {
	return getItem('userinfo', '') || {};
}

export function getExpiresAt() {
	return Number(getItem('expires_at', 0)) || 0;
}

/**
 * 是否处于可用登录态。
 * 有 token 且（没有过期信息 或 还没到过期时刻，留 60s 提前量）即为已登录；
 * 过期不在这里删——真实失效以接口 40005 → session.relogin 为准，
 * 本地时间只用来减少一次注定失败的往返。
 */
export function isLogin() {
	if (!getToken()) return false;
	const expiresAt = getExpiresAt();
	if (!expiresAt) return true;
	return Date.now() < expiresAt - 60 * 1000;
}