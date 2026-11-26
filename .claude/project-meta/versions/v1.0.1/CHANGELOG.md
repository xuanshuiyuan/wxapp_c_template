# v1.0.1 变更记录

日期：2026-11-26
类型：修复（评审清单全量）

## 评审条目 → 修复

| 评审条目 | 修复 |
|---|---|
| P0-1 webview 任意 URL | `utils/url.js` 增加 `isTrustedWebviewUrl`（仅 `http(s)` + 同源 / `/<routeVersion>/webview/`），webview 页拒绝并显示「链接无效」 |
| P0-2 demo 登录可进生产 | `session.doLogin` 在 `isProd` 直接拒绝；登录页 production 隐藏输入框并显示「未接入登录」；README/init/Checklist 列为上线硬性项 |
| P1-1 demo 登录上线清单 | 同 P0-2 |
| P1-2 relogin 失败不闭环 | 失败 `clearSession + resetUser + clearLastCreated`，`isLogin()` 不再残留 true |
| P1-3 登录单飞不区分 userId | 按 id 维护 in-flight Map + 串行队列，不同 id 依次执行、后发起者后写入 |
| P1-4 api 方法吞 options | `demoApi.list/create/remove` 统一 `(params|data, options)` 并透传；`scripts/check-api.mjs` 静态校验 |
| P1-5 lastCreated.name 为空 | 创建成功存 `{ ...data, name }` |
| P1-6 登出不清 demo store | `logout()` / `relogin` 失败清理 `clearLastCreated()`；模板约定「用户域 store 登出必清」 |
| P1-7 `.claude` 幽灵引用 | 删除 agents/workflows/templates/checks/examples/QUICK_START/build.sh；新增 `project-meta/{architecture,review-process}.md` 与 `context/current_sprint.md`；规则中组件/路径/主题键/表格全部按代码校正；`scripts/check-refs.mjs` 静态检查 |
| P1-8 H5 联调口径与代码相反 | `rule-multiplatform` 改写为「`VITE_HOST_H5` 留空 + Vite `/v2` 代理」；删除 manifest 重复代理；`#ifdef` 白名单改为两处 |
| P1-9 `doLogin` 幽灵 | `session.js` 实际提供 `doLogin(id)`；README/登录页/注释统一 |
| P1-10 数组序列化冲突 | `qs.toQueryString` 与 `request.buildURL` 统一逗号串 |
| P1-11 H5 tabBar 让位未接线 | home/mine 写入 `--tab-overlay: ${getLayout().tabBarOverlay}px` |
| P1-12 develop 头未按环境收紧 | `sign.js` 改为 `if (developBypass && !isProd)` |
| P1-13 npm 脚本不兼容 Windows | 引入 `cross-env`，全部脚本加前缀；`engines.node >= 18` |
| P1-14 init 不处理后端端口 | init 新增显示名 / 后端端口 / 上传路径；同步 `.env.development` + `vite.config.js` |
| P2-2 200 无 code 当成功 | `request.js` 要求对象且 `code` 可转数字，否则「响应格式异常」；第三方裸响应显式 `{ rawResponse: true }` |
| P2-1/P2-3 请求层细节 | 头值统一字符串；H5 同域 URL 补前导斜杠 |
| P2-4 登录/绑定 guard | 登录请求加 `{ guard: false }` |
| P2-5 useList 页面钩子混用 | 新增 `pageHooks` 配置；demo 首页传 `false` |
| P2-6/7 home 注释/total | 注释改 40005；header 显示总数；删除未用 `alert` |
| P2-8 登录 toast 被卸载 | 去掉跳转前 toast |
| P2-9 create 键盘提交 | 名称输入挂 `confirm-type="done"` + `@confirm` |
| P2-10 H5 地图无 key | 删除未消费的 `MAP_MODE/canNativeMap` 与地图 token |
| P2-12 定位权限默认声明 | manifest 移除 `scope.userLocation` / `requiredPrivateInfos`；location.js 保留按需加回 |
| P2-13/14 换肤收敛 | README 明确还需改 `pages.json` 窗口色与 tabbar PNG |
| P2-15 SERVICE_TEL/viewHost | 「我的」增加客服电话入口；删除未用 `viewHost` |
| P2-16 demoApi.login 重复 | 删除；登录只在 `services/session.js` |
| P2-18 z-index 硬编码 | 新增 `$z-loading/$z-modal/$z-toast`，loading 不再盖 modal |
| P2-23 预览链接过期 | 首页入口标注「5 分钟内有效」 |
| P2-24 删除后 reload 未 await | `await reload()`，失败提示 |
| P2-25 40005 归类 | CLAUDE.md 改为「40005 登录失效（40xxx）；401xx 鉴权」 |
| P2-26 .gitignore | 补 `.codegraph/`、`.claude/settings.local.json` |
| P2-28/41/42 init 健壮性 | 显示名/端口/key 指引；域名补 scheme；`grep -I` 跳二进制；sed 转义 |
| P2-29/30 旧模板/检查 | 删除；`check-refs` / `check-api` / `check-http` 取代 |
| P2-31 lint/engines | 新增 `check` 脚本与 `engines` |
| 请求体统一（用户定版） | 删除 `curl.postJSON`；`check-http` 禁止绕过请求层与 JSON 入口；CLAUDE/README 标注「2026-11-26 定版：表单，不是 JSON」 |

## 未处理（需用户/后端决策）

- LICENSE 归属。
- C 端上传：后端模板没有 `/web/upload` 路由，`ENDPOINT_UPLOAD` 仍是占位。
- 微信 `wx.login → code2session` / 手机号绑定 / 分享：模板留了接入点与文档，未写业务实现（依赖真实后端契约）。
- 真机回归：H5 E2E 与双端编译已过，微信开发者工具/iOS/Android 未跑。
- `main.css` ColorUI 体积、`app-*` 部分组件暂无 demo 消费：保留为模板资产。

## 验证

- `npm run verify:mp-weixin` / `verify:h5`：通过
- `npm run check`（refs / api / http）：通过
- `init.sh` 临时副本（改名 my_new_app / 端口 15001 / 域名 / appid / 上传）：双端 verify 通过
- H5 CDP E2E：登录 → 列表 → 创建 → 预览 → 删除 通过；webview 非白名单被拒
- production H5：登录页显示「未接入登录」（demo 登录 fail-closed）
- 后端 demo curl 全链路：通过