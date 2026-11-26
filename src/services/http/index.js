// ---------------------------------------------------------------------------
// http 层唯一出口：api/ 里只 import 这个文件。
// 约定：写接口统一 POST + x-www-form-urlencoded；上传走 multipart。
// 不提供 postJSON —— 后端统一 ReadForm 解析表单，避免同一项目两种请求体。
// ---------------------------------------------------------------------------

import { request, registerAuthHandler, DEFAULT_TIMEOUT, TRANSPORT_UPLOAD } from './request';
import { toQueryString } from '@/utils/qs';
import { ENDPOINT_UPLOAD } from '@/config/endpoints';

export { request, registerAuthHandler, DEFAULT_TIMEOUT, TRANSPORT_UPLOAD };
export { registerCodeGuard } from './guard';
export { ApiError, ERROR_TYPE, isApiError, toApiError, errorTip } from './error';

/**
 * 成功返回响应体 { code, msg, data }；失败抛 ApiError（默认自动 toast 提示）
 * 常用 options：{ toast:false } 静默、{ loading:true } 托管加载态
 */
export const curl = {
	/** GET：data 作为 query 参数 */
	get(url, params, options = {}) {
		return request({ url, method: 'GET', params, ...options });
	},

	/** POST：表单格式 */
	post(url, data, options = {}) {
		return request({
			url,
			method: 'POST',
			data: toQueryString(data || {}),
			contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
			...options
		});
	},

	/**
	 * 文件上传（multipart）
	 * @param {object} payload
	 * @param {string} payload.filePath 本地临时路径（uni.chooseImage 等拿到）
	 * @param {string} [payload.name='file'] 文件字段名
	 * @param {object} [payload.formData] 随文件提交的普通字段
	 * @param {string} [url] 上传地址，默认后端通用上传口
	 * @param {object} [options] 同 request 的 toast / loading 等
	 */
	upload({ filePath, name = 'file', formData = {} }, url = ENDPOINT_UPLOAD, options = {}) {
		return request({ transport: TRANSPORT_UPLOAD, url, method: 'POST', filePath, name, formData, ...options });
	}
};

export default curl;
