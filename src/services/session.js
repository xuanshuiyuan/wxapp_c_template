// ---------------------------------------------------------------------------
// 登录态唯一入口。
//
// 模板后端只提供 demo 登录 stub：POST /web/demo/login（form: user_id）→ { token, expires_in }。
// 真实项目把 doLogin() 换成微信 code2session / 手机号验证码即可，
// 「40005 → 静默重登 → 重放」这条链路（本文件 + services/http/request.js）原样复用。
//
// 页面基本只用两个方法：
//   await ensureLogin()         有可用 token 返回 true；否则尝试按本地 user_id 静默重登
//   await login(userId)         登录页显式登录（demo stub 需要用户输入 user_id）
// ---------------------------------------------------------------------------

import { curl, registerAuthHandler } from '@/services/http';
import { ENDPOINT_DEMO_LOGIN } from '@/config/endpoints';
import { writeSession, clearSession, isLogin, getUserId } from '@/services/storage';
import { syncUser, resetUser } from '@/store/user';

/**
 * 登录（单飞）：并发调用只会真正发起一次登录请求
 * @param {number|string} [userId] 不传则用本地已存的 user_id（静默重登路径）
 * @returns {Promise<object>} 登录响应 data
 */
let pending = null;
export function login(userId) {
	if (pending) return pending;

	const id = Number(userId || getUserId()) || 0;
	if (!id) {
		return Promise.reject(Object.assign(new Error('请先输入 user_id'), { isApiError: true, type: 'auth' }));
	}
	// authRetry:false 防止登录接口本身返回 40005 时递归；toast:false 由调用方决定怎么提示
	pending = curl
		.post(ENDPOINT_DEMO_LOGIN, { user_id: id }, { authRetry: false, toast: false })
		.then(body => {
			const data = body.data || {};
			// demo 登录只回 token / expires_in，user_id 从入参补进会话
			writeSession({ token: data.token, expires_in: data.expires_in, user_id: id });
			syncUser();
			return data;
		})
		.finally(() => {
			pending = null;
		});
	return pending;
}

/**
 * 静默重登，供 http 层在收到 CODE_LOGIN_EXPIRED 时调用。
 * demo stub 依赖本地已存的 user_id；没有 user_id（从未登录过）时直接失败。
 * @returns {Promise<boolean>} 是否成功（成功则 http 层自动重放原请求）
 */
export async function relogin() {
	try {
		await login();
		return true;
	} catch (e) {
		resetUser();
		return false;
	}
}

/** 有可用登录态返回 true，否则尝试静默重登一次；页面 onShow 做登录拦截用 */
export async function ensureLogin() {
	if (isLogin()) return true;
	try {
		await login();
		return true;
	} catch (e) {
		return false;
	}
}

/** 退出登录：清本地存储 + 清响应式用户态 */
export function logout() {
	clearSession();
	resetUser();
}

// 把重登能力交给 http 层（模块被 import 时即完成注册，见 main.js 的副作用 import）
registerAuthHandler(relogin);

export default { login, relogin, ensureLogin, logout };