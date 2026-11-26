// ---------------------------------------------------------------------------
// 统一的接口错误对象。
// 页面 catch 到的永远是 ApiError（不再出现「有时是字符串、有时是 res 对象」），
// 可按 type 分支处理：网络问题提示重试、业务问题展示 msg、auth 交给重登逻辑。
// ---------------------------------------------------------------------------

export const ERROR_TYPE = {
	network: 'network', // 请求未发出 / 超时 / 断网
	http: 'http', // HTTP 状态码非 2xx
	business: 'business', // 业务码非成功
	auth: 'auth', // 登录失效且静默重登未成功
	guard: 'guard', // 命中全局业务码守卫（跳页/弹窗已由 guards 统一处理，页面 catch 到可直接忽略）
	unknown: 'unknown'
};

export class ApiError extends Error {
	constructor(type, message, detail = {}) {
		super(message || '请求失败');
		this.name = 'ApiError';
		this.type = type;
		this.code = detail.code; // 业务码
		this.status = detail.status; // HTTP 状态码
		this.raw = detail.raw; // 原始响应，排查用
		// 编译降级后 instanceof 可能失真，用标记兜底
		this.isApiError = true;
	}
}

export function isApiError(e) {
	return !!(e && e.isApiError);
}

/**
 * 把任意异常（字符串 / Error / uni 的 fail 对象）归一成 ApiError
 */
export function toApiError(e) {
	if (isApiError(e)) return e;
	if (typeof e === 'string') return new ApiError(ERROR_TYPE.unknown, e);
	const message = (e && (e.errMsg || e.message || e.msg)) || '请求失败';
	return new ApiError(ERROR_TYPE.unknown, message, { raw: e });
}

/**
 * 面向用户的简短提示文案
 */
export function errorTip(e) {
	const err = toApiError(e);
	if (err.type === ERROR_TYPE.network) return '连接超时，请重试';
	return err.message || '请求失败';
}
