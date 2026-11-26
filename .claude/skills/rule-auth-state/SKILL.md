---
name: rule-auth-state
description: 在本项目涉及登录、退出登录、展示用户信息、做页面登录拦截、读取或刷新 token 相关状态、排查「接口 40005 / 登录态丢了 / user_id 不显示」问题时使用。规定 storage 为唯一真相、session 的具名导出、store/user 只读视图，以及 main.js 那两条不可删的副作用 import。
---

# rule-auth-state

> **本文件含「硬性禁令」小节，唯一权威。**

## 一图流

```
登录页 / 冷启动 ensureLogin()
        │ POST /web/demo/login {user_id}
        ▼
services/session.login()  ──单飞──►  writeSession({token,user_id,expires_in})
        │                                   │
        │                                   ▼
        │                          services/storage（唯一真相）
        │                                   │
        │                                   ▼
        │                          store/user.syncUser()（响应式视图）
        ▼
services/http/request.js
   · 请求前无 token → await authHandler()（= session.relogin）
   · 响应 40005     → authHandler() 重登成功后**重放一次**（authRetry:false 防递归）
```

## 1) storage 是唯一真相

- 登录态字段：`token` / `user_id` / `userinfo` / `expires_at`（`config/app.js` 的 `SESSION_FIELDS`）。
- 读写只经 `services/storage.js`：`writeSession` / `clearSession` / `getToken` / `getUserId` / `getUserInfo` / `isLogin`。
- `isLogin()` = 有 token 且未到过期时刻（留 60s 提前量）。本地过期只用于减少一次注定失败的往返，
  **真正失效以接口 40005 为准**。
- ⚠️ 禁止页面直接 `uni.getStorageSync('token')` 或用本地缓存反推「绑定态 / 权限」——一律走后端真值。

## 2) session 对外 API

```js
import { login, relogin, ensureLogin, logout } from '@/services/session'

await login(userId)      // 显式登录（登录页用）；不传 userId 则用本地已存 user_id
await ensureLogin()      // 有可用 token → true；否则按本地 user_id 静默重登一次
await relogin()         // http 层专用：40005 时换 token，成功返回 true
logout()                // 清存储 + resetUser；配合 route.relaunch(LOGIN_PAGE)
```

- `login` 内部**单飞**：并发调用只真发一次请求。
- 登录接口自身必须 `{ authRetry: false, toast: false }`，否则会「登录依赖登录」递归；
  提示由调用方（登录页）统一给。
- session 在模块加载时 `registerAuthHandler(relogin)`；`main.js` 的副作用 `import '@/services/session'` 删掉后
  40005 就不会再自动重登。

## 3) 页面登录拦截

```js
import { ensureLogin } from '@/services/session'
import { requireLogin } from '@/services/route'

onShow(async () => {
  // 冷启动时 App.onLaunch 的静默登录可能还没回来：先等它，失败再走登录拦截
  if (!(await ensureLogin())) {
    requireLogin()   // 未登录 → 清栈跳登录页
    return
  }
  load()
})
```

- **不要**只写同步 `if (!requireLogin()) return`：会把「有 user_id、正在换 token」的用户误送去登录页
  （模板 v0.1 实测踩到）。
- 登录页 onShow 反过来做：已登录 / 静默登录成功 → `route.relaunch(HOME_PAGE)`，不停在登录页。

## 4) 全局业务码守卫

- 需要「命中某码就全局跳页/弹框」时：`config/dict.js` 加码 → `services/guards.js` 用
  `registerCodeGuard(code, handler)` 登记。模板已登记 `40101 → logout + 回登录页`。
- 50011（未绑手机号）这类码若业务需要：在 guards 里弹框引导，入口点击前再走一次前置检查；
  目标页自己的接口传 `{ guard: false }` 豁免。
- 守卫动作有 busy 去重 + 1s 冷静期；页面 catch 到 `e.type === 'guard'` 直接忽略是正确的。

## 5) 换真实登录（模板 → 业务）

只改 `services/session.js` 的 `login()` 取凭证部分：

- 微信小程序：`uni.login()` 拿 code → 后端 `code2session`；
- 手机号：`<button open-type="getPhoneNumber">` 拿 code → 后端绑定接口；
- 无论哪种，后端登录响应写进 `writeSession()`，后面的存储 / 40005 / 路由拦截都不用动。

## 硬性禁令（MUST / MUST NOT）

- **storage 是登录态唯一真相**；store/user 只是它的响应式视图，禁止在 store 里维护第二份 token。
- **40005 只走 session.relogin + http 层重放一次**；禁止页面自己 catch 40005 再手写重登（会并发重登、死循环）。
- 登录 / 绑定类接口必须 `authRetry: false`。
- **需登录的入口先过门槛再跳转**；不要先 `route.to` 再在目标页补救。
- 装饰位请求（失败可隐藏的模块）必须 `{ guard: false }`，不许让守卫弹框打断主流程。
- 禁止把 token / 手机号 / 密钥写进日志或页面文本。
- `main.js` 的 `import '@/services/session'` 与 `import '@/services/guards'` 两条副作用 import 不可删。