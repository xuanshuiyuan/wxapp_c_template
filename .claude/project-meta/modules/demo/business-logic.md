# demo 模块业务逻辑

## 登录 stub
<!-- block: demo-login | last-updated: v1.0.0 -->
`POST /web/demo/login`（form: `user_id`）→ `{ token, expires_in }`。**没有身份凭据**，仅演示 token 链路。
前端 `services/session.login(userId)` 写入 `{token,user_id,expires_in}`；`user_id` 是入参、后端响应不带，
必须由前端补进会话（`writeSession`）。冷启动时 `App.onLaunch` 用本地 `user_id` 静默重登；
首次使用没有 `user_id` → 停在登录页等输入。页面 `onShow` 必须先 `await ensureLogin()` 再 `requireLogin()`，
否则会把「正在换 token」的用户误送去登录页。

## 列表
<!-- block: demo-list | last-updated: v1.0.0 -->
`GET /web/demo/list?page&page_size` → `data = { list, total }`，条目 `{id,name,remark,status,status_text,create_time}`。
`useList` 的 `pickDemoList` 只补一个 `timeText`（`mdHmText(create_time)`），不改业务字段。
首页 `immediate: false`：登录拦截在 `onShow`，未登录时不打接口。tab 页每次 `onShow` 重拉（demo 数据少，
换取「创建后返回立刻可见」；数据量大时改 dirty 标记，见 rule-performance）。

## 创建 / 删除
<!-- block: demo-create-delete | last-updated: v1.0.0 -->
创建：`POST /web/demo/create`（form: `name<=64`, `remark<=255`）→ `{id, doc_preview_url}`。
同名（同用户）回 `51002`，由请求层默认 toast；创建成功后结果写 `store/demo.js` 的 `lastCreated`（列表不返回预览链接）。
删除：`POST /web/demo/delete`（form: `id`）软删；二次确认用 `useModal.confirm`。
删的正好是 `lastCreated` 那条时一并清掉，避免预览入口点进去 404。

## 文档预览（webview 分组）
<!-- block: demo-webview | last-updated: v1.0.0 -->
`doc_preview_url` 是**相对地址**（`/v2/webview/demo/preview?access_token=...`，短时效 HMAC 令牌），
`utils/url.absoluteUrl()` 拼 `rootPath` 成绝对地址后传给 `<web-view>`。
web-view 发不出自定义请求头，**鉴权只靠 query `access_token`**；链接由后端下发，前端不自己拼。
小程序侧还需在「小程序后台 → 业务域名」配置预览域名。
