# CLAUDE.md — 系统总状态（模板版）

> **本文件是唯一常驻上下文，只放「每次会话都要知道」的信息**（目标 ≤20KB）。
> 历史叙述、逐页口径、逐版明细**一律不写进来**，按需去下列位置查：

| 要查什么 | 去哪 |
|---|---|
| 某业务/某页面的行为与隐性口径 | `.claude/project-meta/modules/<模块>/business-logic.md` |
| 某版本的决策、被否方案、真机待验项 | `.claude/project-meta/versions/vN/` |
| 硬性「必须 / 禁止」 | `.claude/skills/rule-*` 的「硬性禁令」小节（唯一权威，本文件不复述） |
| 后端契约 | 后端仓 `.claude/project-meta/versions/vN/api-*.md`（模板后端：`go_project_template`） |

---

## 项目简介

`wxapp_c_template` —— 可复制的 uni-app（Vue3 + Vite）C 端小程序 / H5 / App 模板，
UI 走 uview-plus + 自有 `app-*` 组件，请求层与后端模板 `go_project_template` 的契约逐项对齐。

- `bash init.sh` 改名换占位后直接开始新业务
- 全链路参考实现：`api/demo.js` + `pages/home` / `pages/login` / `packages/demo/*`
- demo 模块的知识库格式范本：`.claude/project-meta/modules/demo/`

---

## 技术栈与构建

| 层级 | 技术 |
|---|---|
| 跨端框架 | uni-app（Vue3 + Vite CLI，业务代码全部在 `src/`，`@/` = `src/`） |
| UI | uview-plus + 自有 `app-*` 组件 |
| 状态 | Vue 3 Reactivity（`store/`，不上 Vuex/Pinia） |
| 请求 | `services/http/`（签名 / 40005 重登重放 / 错误码守卫） |
| 样式 | SCSS + Design Token（`common/css/theme.scss` 为唯一取值源） |

- 开发：`npm run dev:*`（watch）→ 产物 `dist/dev/<平台>`
- **编译验证：`npm run verify:*`（dev 环境，每批改动必跑，双端）** → 产物 `dist/build/<平台>`
- 发布：`npm run build:*`（production 环境）→ **同一目录** `dist/build/<平台>`
- ⚠️ `verify:*` 与 `build:*` 共用 `dist/build`，**后跑者覆盖前跑者**；发布前必须最后跑一次 `build:*`
- ⚠️ **真机联调只导入 `dist/dev/mp-weixin`**（`dev:mp-weixin` 的 watch 产物），不要用 `dist/build`
- ⚠️ `VITE_API_KEY` 只在未提交的 `.env.production.local`，不进 git；production 包签不出合法请求，不能用于联调
- H5 本地调试走相对路径 + `vite.config.js` 的 `/v2` 代理（后端未开 CORS 也不影响）

---

## 系统架构

```
页面层      pages/ packages/            → 调 api、渲染、反馈
复用逻辑层  composables/                → 一个能力一个 hook
接口层      api/                        → 业务域名词 → HTTP
基础设施层  services/ store/            → 签名 / 登录 / 路由 / 弹窗 / 多端 / 跨页状态
配置层      config/ utils/              → 环境、常量、字典、纯函数
```

- 依赖只能向下，禁止反向调用与同级循环依赖
- 页面层禁止清单见 `rule-project-structure`（唯一一份）

---

## 请求方式约定（硬约束）

- 读接口：`curl.get(url, params)` —— GET + query
- 写接口：`curl.post(url, data)` —— POST + `application/x-www-form-urlencoded`
- 上传：`curl.upload(...)` —— multipart
- 数组字段：逗号分隔字符串（`arr.join(',')`），禁止 `key[]=`
- **新接口禁用 `curl.postJSON`**（后端统一 form；存量 JSON 接口不追溯改）
- 路径只从 `config/endpoints.js` 取，不带 `/v2`、不带前导斜杠
- 登录/绑定类接口传 `{ authRetry: false }`，防止 40005 递归

### 与后端模板的契约（唯一真源：`go_project_template`）

| 项 | 值 |
|---|---|
| 响应 | HTTP 恒 200 + `{code,msg,data}`；`code=0` 成功 |
| 签名头 | `timestamp`（秒）/ `sign` / `source` / `random` / `edition`；`sign = UPPER(MD5("Source=..&TimeStamp=..&Key=..&Weight=<random>"))` |
| 免签名 | 后端 local/develop `DevelopBypass=true` 时带 `develop: develop` 头跳过（`.env` 的 `VITE_DEVELOP_BYPASS`） |
| 来源 | `source=1010`（微信小程序 C 端）；网页 C 端 `0110` |
| 登录态 | 头 `token` + `userid`，TTL 7200s；40005 → 静默重登 → 原请求重放一次 |
| 版本 | `edition=v1.0.0`（后端 `EditionList` 白名单，未登记值会被 fail-closed 拒绝） |
| 分页 | `page` / `page_size`，列表在 `data.list`，总数 `data.total` |
| 错误码 | 401xx 鉴权（40005 登录失效 / 40102 无权限）· 402xx 参数（40205 频控）· 50xxx 账号（50011 未绑手机）· 51xxx 业务段 · 6xxxx 系统 |
| webview | 仅 query `access_token`，用 `<web-view>` 打开；链接由后端下发 |

---

## 目录结构（根目录 = 构建配置；业务目录均在 `src/` 下）

```
api/              接口层（一个业务域一个文件）
components/       跨页通用组件（easycom，只放 app-*）
composables/      复用逻辑（useList / useModal / usePullRefresh）
config/           配置、常量、字典、endpoints、theme
pages/            主包页面（tabBar 页必须在主包）
packages/         分包（demo 示例）
services/         请求 / 登录 / 路由 / 弹窗 / 存储 / 多端能力
store/            跨页响应式状态
styles/ common/css/  版式块 / 全局样式 / Design Token
utils/            纯函数
main.js App.vue pages.json manifest.json
```

---

## Rule-Skills 清单（`.claude/skills/`）

按需触发，不常驻上下文。**正文里写「见另一个 skill」不会自动加载，需要显式调用。**

| 主题 | Skill | 什么时候用 |
|---|---|---|
| 分层归位 | `rule-project-structure` | 新增文件、不确定放哪、评审分层 |
| 新增页面 | `rule-add-page` | 列表 / 表单 / 详情 / 分包页（含可抄骨架） |
| 接口请求 | `rule-api-request` | 加接口、GET/POST/JSON/上传、错误处理、分页契约 |
| 登录与用户态 | `rule-auth-state` | 登录登出、绑手机门槛、50011 守卫、userState |
| 组件选型 | `rule-ui-components` | 选 uview 组件、封装 app-*、easycom |
| 样式 | `rule-style-css` | token / 原子类 / 版式块 / HUD 视觉 / 换肤 |
| 弹窗跳转 | `rule-page-services` | alert/confirm、loading、route 跳转 |
| 多端兼容 | `rule-multiplatform` | 端判定、条件编译、安全区、构建禁忌 |
| 编码基础 | `rule-coding-basics` | 命名、注释、函数规范、魔法值 |
| 测试 | `rule-testing` | 写/评审测试（默认不执行） |
| 安全 | `rule-security` | 敏感信息、XSS、token、鉴权、日志脱敏 |
| 性能 | `rule-performance` | 长列表、请求去重、包体积、重渲染 |

非 rule 类：`project-dev`（开发主入口）、`design-preview`（贴设计稿出 HTML 预览）。
`.claude/agents/` 与 `.claude/workflows/` 保留但不日常使用；实际工作是 project-dev + rule-skill。

---

## demo 模块（全链路参考）

| 层 | 文件 |
|---|---|
| 请求 | `api/demo.js`（login / list / create / remove + `pickDemoList`） |
| 契约 | `config/endpoints.js` 的 `ENDPOINT_DEMO_*` |
| 页面 | `pages/login`（输入 user_id → 登录）· `pages/home`（分页列表 / 删除 / 预览入口）· `pages/mine`（登录态 / 退出） |
| 分包 | `packages/demo/create`（表单 → create）· `packages/demo/webview`（web-view 预览） |
| 状态 | `store/demo.js`（最近创建结果，列表接口不返回 doc_preview_url） |
| 后端 | `go_project_template` 的 demo 模块（`enum_demo.go` / `web_service/demo.go`） |

---

## 工程禁忌（真踩过、会直接出错）

1. **`docs/` 与 `.codegraph/` 不进版本库**——别 `git add docs/`
2. **不要往 `manifest.json` 加 `navigateToMiniProgramAppIdList`**——字段已作废，devtools 报「无效的 app.json」
3. **构建产物别搞混**：真机包只能来自 `dist/dev`；发布前最后一步必须是 `build:*`
4. **禁 `calc(百分比 + px)` 做 transform**；`calc(...env(safe-area...))` 前必须有一行不含 env 的同属性回退（小程序兼容）
5. **安全距离只用 `$safe-bottom` / `$safe-top`**，禁止手写 `env(safe-area-inset-*)`；底栏贴底距离用 `$bottom-bar-gap`
6. **组件类名 ≥3 字母 + 语义前缀**，前缀先 grep ColorUI 448 个类名（`.fr` 曾被 `.fr{float:right}` 打乱整个表单）
7. **跨分包共用件必须提升到主包 `components/app-*`**，分包之间禁止互引
8. **`u-popup` 根节点自带 `flex:1`**，`scaffold.scss` 已统一 `flex:none !important`，别再逐页包宿主
9. **金额 / 分数 / 时间一律用后端成品串**，前端不相加、不重算、不自拼同义句；缺值印 `--`，未知档 fail-closed
10. **`project-meta/versions/` 与 `modules/*/changelog.md` 是历史，不回头改写**（口径变化写新记录）
11. **页面里禁止 `#ifdef`**，端差异收在 `services/platform.js`
12. **禁止提交密码 / 密钥 / AppID / token / 真实域名**（见 `rule-security`）

---

## 变更记录策略

每个版本在 `.claude/project-meta/versions/vN/` 建档：

- `requirement.md`（需求与决策）+ `CHANGELOG.md`（变更记录与代码变更表）
- 契约有更新时留档 `api-*.md`
- 涉及模块的 `changelog.md` 追加一行：`版本号 | 日期 | 类型 | 概述 | 改动区块 | 链接`
- 含**代码里看不出来的隐性口径** → 同步模块 `business-logic.md`（`last-updated`）
- 代码写完、双端 `verify:*` 通过后，回填 CHANGELOG 的代码变更表与 requirement 的最终口径
- 评审走 `project-dev` 的评审步骤：报告写 `versions/vN/review.md`，结论回填 CHANGELOG
- 收尾把 `git rev-parse HEAD` 写入 `.claude/project-meta/.last-sync`
- commit message 第一行：`<type>(<scope>): <一句话原因>`

---

## 输出规范

- 注释与文档用中文，注释解释 **why**
- Commit message 说明变更原因；PR 标题 <70 字符
- 默认不执行测试（除非用户明确要求）