# 架构说明（C 端模板）

> 常驻上下文之外的按需文档；`rule-*` 里的架构引用指向本文件。

## 分层

```
页面层      pages/ packages/            → 调 api、渲染、反馈
复用逻辑层  composables/                → 一个能力一个 hook
接口层      api/                        → 业务域名词 → HTTP
基础设施层  services/ store/            → 签名 / 登录 / 路由 / 弹窗 / 多端 / 跨页状态
配置层      config/ utils/              → 环境、常量、字典、纯函数
```

依赖只能向下：`pages/packages → api/composables → services/store → config/utils`。

## 请求链

```
api/<域>.js
  → services/http/index.js (curl)
  → services/http/request.js
       ├─ sign.js        签名头（source/timestamp/sign/random/edition/token/userid[/develop]）
       ├─ transport.js   uni.request / uni.uploadFile
       ├─ session        40005 → 单飞重登 → 原请求重放一次（registerAuthHandler）
       └─ guard.js       全局业务码动作（registerCodeGuard）
```

- `services/http` 不认识「怎么登录」：由 `services/session.js` 注册 `authHandler` 打破循环。
- `services/guards.js` 只向 http 注册全局动作（40101 → 清会话回登录页），不反向依赖页面。
- 响应必须是对象且含 `code`；第三方裸响应显式 `{ rawResponse: true }`。

## 登录态

```
登录接口 → writeSession({token,user_id,expires_in}) → storage（唯一真相）
                                                    → store/user.syncUser()（响应式视图）
页面 onShow → ensureLogin() → requireLogin()
```

- `storage` 是唯一真相，`store/user` 只是视图；`logout()` 同时清会话、用户态、用户域 store。
- 40005 成功路径：`authHandler()` 单飞重登 + 重放一次；失败路径：清会话，避免 `isLogin()` 仍为 true。
- demo 登录只在非 production 可用；真实项目替换 `services/session.js` 的 `doLogin()`。

## 跨页状态

- `store/` 为零依赖 reactive 模块；`store/index.js` 汇总导出。
- 用户域 store（当前 `demo`）必须在 `logout()` 里清理；新增时同步加。
- 列表返回刷新：demo 首页用 `onShow` 重拉；数据量大时改 dirty 标记/修订号（见 `rule-performance`）。

## 扩展点

| 要加什么 | 改几处 |
|---|---|
| 页面 | 页面 + `pages.json` + `route.js` |
| 业务域 | `api/<域>.js` + `api/index.js` + `endpoints.js` + `route.js`（如需）+ 模块文档 |
| 接口 | `endpoints.js` + api 方法 |
| 全局业务码 | `dict.js` + `guards.js` |
| 登录方式 | `session.doLogin()` + `storage.writeSession` + 登录页 |
| tab | `pages.json` + `route.TAB_PAGES` + 图标 |
| 主色 | `theme.scss` + `theme.js` + `pages.json` 窗口色 + tabbar PNG |
