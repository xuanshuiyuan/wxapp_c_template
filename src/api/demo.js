// ---------------------------------------------------------------------------
// demo 示例模块接口（与后端模板 go_project_template 的 demo 模块一一对应）。
//
// 全链路参考实现：登录 stub → 列表分页 → 创建（返回文档预览链接）→ 删除。
// 新增真实业务域时照这个文件抄：路径只从 config/endpoints.js 取，
// 页面不直接 import curl，也不写 URL 字符串。
// ---------------------------------------------------------------------------

import { curl } from '@/services/http';
import {
	ENDPOINT_DEMO_LOGIN,
	ENDPOINT_DEMO_LIST,
	ENDPOINT_DEMO_CREATE,
	ENDPOINT_DEMO_DELETE
} from '@/config/endpoints';
import { mdHmText } from '@/utils/date';

export const demoApi = {
	/**
	 * demo 登录 stub（真实项目替换为微信 code2session / 手机号验证码）
	 * @param {number|string} userId
	 */
	login(userId) {
		return curl.post(ENDPOINT_DEMO_LOGIN, { user_id: userId }, { authRetry: false, toast: false });
	},

	/**
	 * 分页列表：GET page/page_size，响应 data = { list, total }
	 * @param {object} params { page, page_size }
	 */
	list(params) {
		return curl.get(ENDPOINT_DEMO_LIST, params);
	},

	/**
	 * 创建记录：POST form，响应 data = { id, doc_preview_url }
	 * @param {object} data { name, remark }
	 */
	create(data) {
		return curl.post(ENDPOINT_DEMO_CREATE, data);
	},

	/** 软删：POST form { id } */
	remove(id) {
		return curl.post(ENDPOINT_DEMO_DELETE, { id });
	}
};

/**
 * useList 的 pick：把后端条目映射成视图模型（只做展示格式化，不改业务字段）。
 * 后端契约：data = { list, total }，条目 { id, name, remark, status, status_text, create_time }
 */
export function pickDemoList(body) {
	const d = (body && body.data) || {};
	const list = Array.isArray(d.list) ? d.list : [];
	return {
		total: Number(d.total || 0),
		list: list.map(item => ({
			...item,
			timeText: mdHmText(item.create_time)
		}))
	};
}

export default demoApi;