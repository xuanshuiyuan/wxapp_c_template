// ---------------------------------------------------------------------------
// 全局业务码守卫的「业务语义」登记处（机制在 services/http/guard.js）。
// 仿 session.js 的注册模式：main.js 副作用 import 本文件即完成接线。
//
// 新增一个码 = 两步：
//   1. config/dict.js 加 CODE_XXX 常量（真实码值，0 = 关闭该守卫）
//   2. 本文件 registerCodeGuard(CODE_XXX, handler) 登记动作
// 页面层零改动：命中后请求抛 ApiError(type='guard')，不再 toast；
// 需要豁免的调用（如守卫目标页自己的接口）传 options { guard: false }。
//
// 模板只保留一条通用示例：40101 未登录 → 清栈回登录页。
// 50011 未绑手机号的示例见注释，真实项目按业务补上。
// ---------------------------------------------------------------------------

import { registerCodeGuard } from '@/services/http';
import { CODE_UNAUTHORIZED } from '@/config/dict';
import { route, LOGIN_PAGE } from '@/services/route';
import { logout } from '@/services/session';

// 40101 未登录（后端鉴权中间件/Service 层判定无登录态）：
// 清本地会话并清栈回登录页，避免用户停在一个永远失败的页面反复下拉。
registerCodeGuard(CODE_UNAUTHORIZED, () => {
	logout();
	route.relaunch(LOGIN_PAGE);
});

// 示例：未绑定手机号（50011）——命中后弹框引导去登录/绑定页（按业务实现 handler）。
// registerCodeGuard(CODE_UNBOUND_PHONE, () => { /* 弹框 → route.to(绑定页) */ });