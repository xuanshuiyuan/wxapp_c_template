// ---------------------------------------------------------------------------
// 路由统一入口 + 登录拦截。
// 页面里不要直接写 uni.navigateTo 和路径字符串：集中在这里之后，
// 改目录、加分包、换 tabBar 只会影响一个文件。
// ---------------------------------------------------------------------------

import { toQueryString } from '@/utils/qs';
import { isLogin } from '@/services/storage';
import { isMP } from '@/services/platform';
import { toast } from '@/services/toast';

/** 首页（tabBar，返回首页 / 空栈兜底用，勿在组件里再硬编码路径） */
export const HOME_PAGE = '/pages/home/index';

/** 登录页（demo stub）：守卫与拦截跳转的目标，路径只许在这里定义 */
export const LOGIN_PAGE = '/pages/login/index';

/** 「我的」tabBar 页 */
export const MINE_PAGE = '/pages/mine/index';

// —— demo 示例模块（分包 packages/demo）——
/** 创建 demo 记录：无 query。入口 = 首页「新建记录」 */
export const DEMO_CREATE_PAGE = '/packages/demo/create/index';
/** 文档预览（web-view）：query `url`（后端 create 响应里的 doc_preview_url，已拼成绝对地址） */
export const DEMO_WEBVIEW_PAGE = '/packages/demo/webview/index';

/** tabBar 页面路径；启用 tabBar 后需要同步维护，route.to 会据此自动切换 API */
export const TAB_PAGES = [HOME_PAGE, MINE_PAGE];

function normalize(path) {
	if (!path) return path;
	return path.startsWith('/') ? path : `/${path}`;
}

function withQuery(path, query) {
	if (!query || typeof query !== 'object') return path;
	const qs = toQueryString(query);
	return qs ? `${path}?${qs}` : path;
}

export const route = {
	/** 普通跳转（压栈） */
	to(path, query, options = {}) {
		const url = withQuery(normalize(path), query);
		// 判 tab 必须拿**未拼 query 的路径**比：tabBar 页 navigateTo 必失败，
		// 而带 query 的串永远匹配不上 TAB_PAGES
		if (TAB_PAGES.includes(url.split('?')[0])) return uni.switchTab({ url, ...options });
		return uni.navigateTo({ url, ...options });
	},

	/** 关闭当前页再跳转 */
	redirect(path, query, options = {}) {
		return uni.redirectTo({ url: withQuery(normalize(path), query), ...options });
	},

	/** 回到 tabBar 页 */
	tab(path, options = {}) {
		return uni.switchTab({ url: normalize(path), ...options });
	},

	/** 关闭所有页面（登录失效、切换身份等场景） */
	relaunch(path = HOME_PAGE, options = {}) {
		return uni.reLaunch({ url: normalize(path), ...options });
	},

	/**
	 * 返回上一页；页面栈为空时（H5 直接打开链接、分享落地页）回落到 fallback
	 * @param {string} [fallback] 兜底页面路径
	 */
	back(fallback = HOME_PAGE, options = {}) {
		const pages = getCurrentPages();
		if (pages && pages.length > 1) {
			return uni.navigateBack({ delta: 1, ...options });
		}
		return uni.reLaunch({ url: normalize(fallback), ...options });
	},

	/**
	 * 回到**栈里已有的**某个页面：栈里有它 → 按 delta 一次弹回去，没有 → 用 redirect 顶替当前页。
	 * 用于「换车 / 重选」这类动作：不能 `to`（会再压一层，返回要连按两次），
	 * 也不能直接 `back`（层级不确定）。
	 * @param {string} path 目标页面路径（route 常量）
	 */
	backTo(path, options = {}) {
		const target = normalize(path).split('?')[0];
		const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
		for (let i = pages.length - 2; i >= 0; i--) {
			const page = pages[i] || {};
			// 小程序取 route，H5 / App 取 path（uview 同口径）；统一成带前导斜杠比较
			const routePath = `/${page.route || page.path || ''}`.split('?')[0];
			if (routePath === target) {
				return uni.navigateBack({ delta: pages.length - 1 - i, ...options });
			}
		}
		return uni.redirectTo({ url: target, ...options });
	},

	/**
	 * 跳到另一个小程序：端差异与失败兜底都收在这一处，页面只调这个出口。
	 * @param {string} appId 目标小程序 appId
	 * @param {object} [options] 其余参数（path / extraData / envVersion）
	 * @returns {Promise<boolean>} 是否真的发起了跳转
	 */
	toMiniProgram(appId, options = {}) {
		if (!isMP) {
			toast('请在微信中打开');
			return Promise.resolve(false);
		}
		return new Promise(resolve => {
			uni.navigateToMiniProgram({
				appId,
				...options,
				success: () => resolve(true),
				fail: err => {
					// 用户自己取消也是 fail：取消不提示，真失败才提示
					const msg = String((err && err.errMsg) || '');
					if (!/cancel/i.test(msg)) toast('打开失败，请稍后重试');
					resolve(false);
				}
			});
		});
	}
};

/**
 * 登录拦截：页面 onShow 里 `if (!requireLogin()) return`
 * @param {object} [options]
 * @param {boolean} [options.silent] 只返回结果，不跳登录
 * @returns {boolean} 是否已登录
 */
export function requireLogin(options = {}) {
	if (isLogin()) return true;
	if (!options.silent) {
		// 清栈跳登录，登录后 route.back 空栈自动回落首页
		route.relaunch(LOGIN_PAGE);
	}
	return false;
}