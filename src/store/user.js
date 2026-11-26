// ---------------------------------------------------------------------------
// 用户态：唯一真相在本地存储（services/storage），这里只是它的响应式视图。
// 登录/登出后由 services/session 调 syncUser() / resetUser()，页面直接读 userState。
// ---------------------------------------------------------------------------

import { reactive } from 'vue';
import { isLogin, getUserId, getUserInfo } from '@/services/storage';

function readFromStorage() {
	const userinfo = getUserInfo() || {};
	return {
		logged: isLogin(),
		user_id: getUserId() || userinfo.user_id || '',
		userinfo
	};
}

export const userState = reactive(readFromStorage());

/** 从本地存储刷新用户态 */
export function syncUser() {
	Object.assign(userState, readFromStorage());
}

/** 清空用户态（不碰存储，登出由 session.logout 负责） */
export function resetUser() {
	Object.assign(userState, {
		logged: false,
		user_id: '',
		userinfo: {}
	});
}

// 冷启动时从本地存储恢复一次
syncUser();