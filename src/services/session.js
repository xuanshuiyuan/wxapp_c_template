// ---------------------------------------------------------------------------
// 登录态唯一入口。
//
// 模板后端只提供 demo 登录 stub：POST /web/demo/login（form: user_id）→ { token, expires_in }。
// 真实项目必须替换本文件的 doLogin(id)：
//   微信小程序 = uni.login 拿 code → 后端 code2session；
//   手机号     = getPhoneNumber 拿 code → 后端绑定接口。
// 「40005 → 静默重登 → 重放」这条链路（本文件 + services/http/request.js）原样复用。
//
// ⚠️ demo 登录没有任何身份凭据，production 下直接 fail-closed（见 doLogin），
//    不允许把「输入 user_id 即登录」的 stub 带进生产包。
// ---------------------------------------------------------------------------

import { curl, registerAuthHandler } from '@/services/http';
import { ENDPOINT_DEMO_LOGIN } from '@/config/endpoints';
import { isProd } from '@/config/env';
import { writeSession, clearSession, isLogin, getUserId } from '@/services/storage';
import { syncUser, resetUser } from '@/store/user';
import { clearLastCreated } from '@/store/demo';

function demoLoginDisabledError() {
	return Object.assign(new Error('生产环境未接入真实登录：请替换 services/session.js 的 doLogin()'), {
		isApiError: true,
		type: 'auth'
	});
}

/**
 * 真正发一次登录请求。真实项目只改这个函数。
 * @param {number} id
 */
function doLogin(id) {
	// demo stub 生产禁用：这是模板的安全闸口，不是业务逻辑。
	// 接入真实登录后，把本函数整体替换即可（保留 writeSession/syncUser 两行）。
	if (isProd) return Promise.reject(demoLoginDisabledError());

	// authRetry:false 防止登录接口自身 40005 递归；guard:false 登录页不应被全局守卫打断
	return curl
		.post(ENDPOINT_DEMO_LOGIN, { user_id: id }, { authRetry: false, guard: false, toast: false })
		.then(body => {
			const data = body.data || {};
			if (!data.token) {
				// 后端 200 但没有 token：不能当登录成功（响应形态异常时 request 层已拦，这里是双保险）
				throw Object.assign(new Error('登录响应缺少 token'), { isApiError: true, type: 'auth' });
			}
			// demo 登录只回 token / expires_in，user_id 从入参补进会话
			writeSession({ token: data.token, expires_in: data.expires_in, user_id: id });
			syncUser();
			return data;
		});
}

// 登录串行化：同一 id 在飞时复用 Promise；不同 id 排队执行，后发起的后写入会话，
// 避免「冷启动静默登录 user_id=3 未返回时，用户显式登录 5 却写成 3」。
let queue = Promise.resolve();
const inFlight = new Map(); // id -> Promise

/**
 * 登录（按 id 串行）：并发同 id 只真正发起一次请求
 * @param {number|string} [userId] 不传则用本地已存的 user_id（静默重登路径）
 * @returns {Promise<object>} 登录响应 data
 */
export function login(userId) {
	const id = Number(userId || getUserId()) || 0;
	if (!id) {
		return Promise.reject(Object.assign(new Error('请先输入 user_id'), { isApiError: true, type: 'auth' }));
	}
	if (inFlight.has(id)) return inFlight.get(id);

	const run = queue.then(() => doLogin(id));
	// 队列只关心「上一个跑完」，失败不阻断后续登录
	queue = run.catch(() => {});
	inFlight.set(id, run);
	const clear = () => inFlight.delete(id);
	run.then(clear, clear);
	return run;
}

/**
 * 静默重登，供 http 层在收到 CODE_LOGIN_EXPIRED 时调用。
 * 失败必须清本地会话：否则 isLogin() 仍为 true，页面会卡在「永远 40005、不跳登录」。
 * @returns {Promise<boolean>} 是否成功（成功则 http 层自动重放原请求）
 */
export async function relogin() {
	try {
		await login();
		return true;
	} catch (e) {
		clearSession();
		resetUser();
		clearLastCreated();
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

/** 退出登录：清本地存储 + 清响应式用户态 + 清用户域跨页状态 */
export function logout() {
	clearSession();
	resetUser();
	// 模板约定：登出必须清理所有「用户域」store；新增业务 store 时同步加到这里
	clearLastCreated();
}

// 把重登能力交给 http 层（模块被 import 时即完成注册，见 main.js 的副作用 import）
registerAuthHandler(relogin);

export default { login, relogin, ensureLogin, logout };