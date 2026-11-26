# wxapp_c_template 全面评审（合并版 v1.0.0）

- 评审对象：`/home/xuanshuiyuan/data/www/xuanshuiyuan/wxapp_c_template`（HEAD `b2ed30c`，工作区干净）
- 评审方式：只读；按 HEAD 全量读代码 + `.claude` 规则 + 后端模板 `go_project_template` 契约源码；未修改业务代码
- 契约真源：`go_project_template` 的 `internal/route/verification.go`、`internal/conf/{err_code.go,enum_demo.go,keys/keys.go}`、`internal/service/web_service/demo.go`
- **合并说明**：本文件合并了两份并发评审——`wxapp-c-template-60` 的 492 行版（demo 链路、H5 tabBar、规则漂移更细）与抽离窗口的 370 行版（架构判断、生产安全项、接入路径）。合并时把 demo 登录从 P1 升级为 **P0-2**，保留原 P1-1 编号便于交叉引用；新增 P1-12/13/14 与 8 条 P2；验证节区分「已执行」与「沿用反馈」。抽离窗口的另存件 `review-from-copy-window.md` 在合并后删除，内容已全部并入本文件。

---

## 0. 结论摘要与打分

### 0.1 五条最重要的判断

1. **请求链与后端契约是真对齐的**：签名模板、头名、source=1010、edition 白名单、token/userid、40005、page/page_size、`data.list/total`、webview access_token 逐项与后端源码一致，没有自创契约。这是模板最扎实的部分。
2. **登录态的“失败分支”没有闭环**：`40005 → relogin` 成功路径做了单飞与重放，但 relogin 失败时不清本地 token，`isLogin()` 仍为 true，用户会停在“永远 40005、永远不跳登录页”的坏状态；40101 守卫几乎打不到真实场景。
3. **demo 作为“全链路参考实现”存在两处可见缺陷**：`api` 方法不接 `options`，把 `useList` 的静默失败配置吞掉；`lastCreated` 没有 `name`（后端 create 不返回），首页“最近创建：”显示为空。另有退出登录不清 `demoState`，同设备换账号会看到上一账号的预览链接。
4. **模板化残留主要在 `.claude`，不在 `src`**：12 个 rule-skill 中至少 6 个存在指向本仓不存在文件/组件/常量/主题键的幽灵引用；`docs/ARCHITECTURE.md`、`docs/uview-plus-components.md` 被 10 个 agent + 多个 skill + 4 个 workflow 引用，但仓库根本没有 `docs/`（且 `.gitignore` 忽略它）。新人按规则写代码会直接踩空。
5. **有两个 P0**：① webview 页直接信任 query `url` 并塞进 `<web-view>`，H5 下可加载任意第三方 iframe，`javascript:`/`data:` 还会扩大攻击面；② demo 登录 stub 可被打进生产包，后端 weblogin 在生产也签发任意 `user_id` 的 token。两者都必须在上线前修。

### 0.2 八维打分（1–5）

| 维度 | 分数 | 一句话理由 |
|---|---|---|
| 设计层：模板边界与定位 | 3.5 | 请求链/分层/骨架/工程系统的切法正确；但 C 端最核心的微信身份链路被整段剥离，`platform.js` 又保留了扫码/地图等业务能力，边界不对称 |
| 架构层：分层与依赖方向 | 4.0 | 四层基本成立，两处“注册处理器”打破循环依赖是合理设计；扣分在 store↔services 同级互引、http 层依赖 UI toast、`api` 层被 session 绕过 |
| 请求层与后端契约 | 4.5 | 逐项对齐，无自创契约；扣分在数组序列化文档与实现冲突、缺 production 构建期密钥/占位校验 |
| 登录态与失败模型 | 2.5 | 成功路径完整，失败路径不闭环；单飞不区分 userId；登出不清业务跨页态 |
| demo 全链路正确性 | 3.0 | 页面骨架、分页、四态、二次确认、webview 链路都对；`options` 被吞、`lastCreated.name` 缺失是参考实现的硬伤 |
| 模板化完整性（残留 / init / 文档） | 2.5 | `init.sh` 设计不错；但标题/图标未覆盖、客服电话无消费、平台能力库未说明、规则文档大面积与代码脱节 |
| `.claude` 工程系统自洽 | 2.0 | 框架（CLAUDE.md + rule-skill + project-meta）是对的；内容大量来自源业务仓，幽灵引用与陈旧口径会让新人减速而不是加速 |
| 安全与可演进性 | 2.5 | 无密钥/密码入库、无 v-html、存储收口；但 webview 白名单缺失、demo 登录可进生产、develop 头未按环境收紧；签名密钥可提取需诚实说明；uni-app/uview 锁定版本 |

**总评：3.0 / 5（两版 3.1 / 3.3 合并后，因 demo 登录升级为 P0 下调）。可以作为“内部新项目的起点”，但还不能作为“公司标准模板”直接交付。**
必须先完成 2 个 P0（webview 白名单、demo 登录生产闸口）+ 13 个 P1（登录失败分支、api options、lastCreated、登出清理、工程系统失真等）+ 一轮 `.claude` 清理，才值得被复制。

---

## 1. 设计层：是否在解决正确的问题

### 1.1 模板边界（保留什么、剥离什么）

**方向正确，但两侧不对称。**

保留：请求链（签名/重登/错误归一）、登录态骨架（storage→store→session）、页面骨架、通用组件、设计 token、工程系统。
剥离：具体业务接口、业务页面、业务枚举。

问题：

- **C 端特有资产被剥得过多**。模板保留了“请求链”这个最强的通用资产，却把“登录即注册 / 手机号绑定 / wx.login / 分享 / 支付入口”整段剥离，只留一个**无任何身份凭据**的 demo 登录 stub。结果是：每个新 C 端项目都要重写同一段微信登录代码，而模板刚好在这一段最没有参考价值。
- **反过来，业务能力又留得过多**。`src/services/platform.js`（约 320 行）包含扫码分档、相机授权、原生地图分档、打开 PDF、横屏锁定、拨号、轻震、跨端定位；`src/utils/{number,text}.js`、`src/services/location.js`、`app-form-row`/`app-option-sheet`/`app-cta` 也基本无消费方。模板边界在“登录”一侧过窄、在“平台能力”一侧过宽。

判断：**需要调整**。建议 C 端骨架补齐（wx.login + getPhoneNumber 的扩展点，后端 code2session/绑定接口留 TODO），业务能力移到 `src/services/extras/` 或文档示例，避免“模板里既有不该有的，又缺最该有的”。

### 1.2 接入路径：clone → init.sh → 填占位 → 写业务

`init.sh` 的工程质量在模板里属于上游：优先 `git ls-files`、排除自身、排除 node_modules/dist/unpackage、可选占位、打印剩余待办。第一次接入会卡在以下 5 个断点：

1. **找不到 `doLogin`**：README:131、登录页注释:4、`session.js` 头注释:5 都让人改 `doLogin`，实际函数叫 `login`（`src/services/session.js:24`）。这是“换真实登录”的唯一入口文档，却说错函数名。
2. **标题仍是模板名**：`init.sh` 只替换 `wxapp_c_template`，不会改 `C 端小程序模板`（`src/pages.json:76`、`src/pages/home/index.vue:38`、`index.html:13`、`src/manifest.json:4`）。
3. **真机请求打不到后端**：`.env.development:10-11` 默认 `http://127.0.0.1:15000/`，真机上 127.0.0.1 是手机自己。README 只说“真机导入 dist/dev”，没说必须换 LAN IP、配合法域名。
4. **生产构建缺密钥不报错**：`VITE_API_KEY` 缺失时 `build:*` 仍成功，但产物签不出合法请求；没有构建期校验。
5. **上线检查清单不完整**：README:38 的“上线前必须全部替换”只列 `REPLACE_*`，**没有列“替换 demo 登录 stub”**（见 P1-1）。

判断：**需要调整**：README 增加“首次接入 5 步 + 真机 3 件事 + 上线 6 件事”，`init.sh` 增加标题/图标提示，构建期加 fail-closed 校验。

### 1.3 与后端模板的契约耦合

**单一真相源成立**：`config/app.js` 的 source/edition/routeVersion、`config/dict.js` 的错误码、`services/http/sign.js` 的签名模板都能在后端源码逐字对上（见 §5）。

但“诚实性”有两处不足：

- **demo 登录写得像生产登录**。后端 `DemoService.Login` 明确“没有任何身份凭据”，任意 user_id 都能签发 token；前端 README 把它列为“登录 stub”，但没有把它放进上线阻塞清单，也没有在 production 下 fail-closed。新项目最容易漏掉的就是这一段。
- **签名密钥被当作“密钥”宣传**。`VITE_API_KEY` 会被打进小程序/H5 产物，任何人都能提取；签名只能防“不会写客户端的人”，不是安全边界。真正的边界是 token + 服务端身份认定。`rule-security:16` 甚至写着“禁止前端执行签名核心逻辑”，与模板核心实现直接矛盾。

判断：**需要调整**：文档明确“签名不是安全边界、密钥可提取、演示登录必须替换”；规则与实现二选一。

### 1.4 演示模式 / demo 全链路

**demo 是值得保留的好设计**：登录→列表→创建→删除→webview 五段都能跑，新项目有可抄的完整形态。双轨维护的代价也已经出现（见 P1-4/P1-5/P1-6）。替代方案不是删 demo，而是：

- 给 demo 一个显式命名空间（`demoApi` / `store/demo` / `packages/demo` 已经做到）；
- 在 README/CLAUDE 中把 demo 标为“示例，不参与业务分层”；
- 增加一条“替换 demo 登录”的硬性上线检查；
- 修掉 `options`、`lastCreated.name`、登出清理这三处，否则示例会被原样复制。

### 1.5 工程系统（`.claude`）

**框架正确、内容失真。** CLAUDE.md 把“常驻硬约束”和“按需规则”分开，rule-skill 的“硬性禁令 + 落点速查”结构也是对的；但当前抽查的 rule-skill 大量内容来自源业务仓：

- `docs/ARCHITECTURE.md` / `docs/uview-plus-components.md`：**不存在**，且 `docs/` 被 `.gitignore:24` 忽略；它们被 10 个 agents、4 个 workflows、至少 5 个 skills 引用。
- 组件/函数/常量幽灵：`fieldEditor`、`app-score-ring`、`app-plate-keyboard`、`app-safety-band`、`VALUATION_PAGE`、`BIND_CAR_PAGE`、`OBD_PAGE`、`pages/vehicle/obd`、`static/icons/`（11 组 51 枚）、`useVehiclePolling` 等。
- 过期口径：`五个 tab`（实际 2 个）、`分包四页`（实际 2 个）、`page / size`（实际 page/page_size）、`brandYellow` 等 theme.js 不存在的键、`#ifdef` 白名单三处（实际两处）。
- QUICK_START 描述的是另一套系统（`@agent` 调用、`feature.yaml` 自动工作流、`context/current_sprint.md`），与当前 Claude Code 的实际机制不一致。

判断：**需要调整（优先级高）**。工程系统的价值在“新人照做就能对”，现在照做会踩空。建议先做“引用存在性检查”（见 §6），再逐文件修。

### 1.6 产品判断：模板的卖点

应该是：**请求链 + 登录态 + 可执行的工程约定**。
现状重心：请求链（做得好）> 工程系统（做得多但不可信）> 登录态（骨架好但失败分支不完整）。
建议把“工程系统”从卖点降为“可验证的附属资产”，先自洽再宣传；把“登录态全链路”补成真正的卖点。

---

## 2. 架构层：结构是否撑得住演进

### 2.1 分层与依赖方向（实际，不只看文档）

实际依赖图（已逐 import 核对）：

```
pages/packages
  ├─→ composables (useList / useModal / usePullRefresh)
  ├─→ api (demo)
  ├─→ services (session / route / toast / platform / storage)
  ├─→ store (user / demo)
  └─→ config / utils

api → services/http → config + utils
services/http/request → services/toast → store/{loading,toast}
services/session → services/http + services/storage + store/user
store/user → services/storage → config
services/guards → services/http + services/route + services/session
```

结论：**分层可以接受**。没有真正的循环依赖；`http ↔ session` 用注册处理器打破，`guards` 复用同一模式，是合理的。

需要记录的三处“同级/反向边”（不是 bug，但要在架构文档里说清）：

1. `store/user → services/storage`（store 依赖 services）与 `services/session → store/user`（services 依赖 store）形成同级双向边；无环，但意味着“store 是纯视图”这句话不严格成立。
2. `services/http/request → services/toast → store`：http 层依赖 UI 反馈层，导致 http 无法在纯 Node 环境无 mock 测试；可接受，但应在 rule 里写明“http 层只允许依赖 toast 这一个 UI 出口”。
3. `services/session.login` 绕过 `api/` 直接 `curl.post`，同时 `api/demo.js:23` 又留了一个没人用的 `login`；同一个接口两处定义，与“api 层一个域一个文件”的规则不一致。

### 2.2 扩展点收敛度（改动面矩阵）

| 想做什么 | 需要改的地方 | 文件数 | 评价 |
|---|---|---|---|
| 新增一个页面 | `pages.json` + 页面 `.vue` + `route.js` 常量 + `api` 方法 + `endpoints.js` + 必要时 `dict.js` | 4–6 | 顺手，`rule-add-page` 有骨架 |
| 新增一个业务域 | `api/<domain>.js` + `api/index.js` + `endpoints.js` + 页面/分包 + `store/<domain>.js`（可选）+ `project-meta/modules/<域>/` 三件套 | 5–8 | 落点清晰；模块知识库是加分项 |
| 新增一个接口 | `endpoints.js` + `api/<domain>.js` | 2 | 收敛得好 |
| 新增上传类型 | 后端注册表（目前只有 B 端 `AdminUploadTypes`，C 端无上传路由）+ 前端 `endpoints.js` + `api` + 上传组件 | 3–5 + 后端 | **C 端缺口**：模板前端有 `curl.upload`，后端没有 C 端上传口 |
| 新增全局业务码守卫 | `dict.js` + `guards.js` | 2 | 收敛得好；但登录/绑定接口自身要额外传 `guard:false`（当前未做） |
| 更换登录方式 | `session.login()` 取凭证段 + `storage` 会话字段 + 登录页 UI + README | 2–4 | 入口清晰，但文档写成了不存在的 `doLogin` |
| 改主色 | `theme.scss` + `config/theme.js` + `pages.json`（13 处 `#E9F4EF` + tab 选中色）+ tabbar PNG + `index.html`/manifest 文案 | 4–5，15+ 字面量 | **收敛度不足**：README 说“两个文件即可”不成立 |
| 升级 edition | `config/app.js:13` + 后端 `EditionList` | 2 | 收敛得好 |
| 新增 tab | `pages.json` + 两个 tabbar PNG + `route.TAB_PAGES` + 页面 | 4 | 收敛得好，规则里写了要同步 |

**结论**：新增页面/接口/业务域的落点很顺手；上传与换肤两处收敛度不足。

### 2.3 状态与数据流

- “storage 为唯一真相、store 为响应式视图”在登录态上成立：`writeSession → syncUser`，`logout → clearSession + resetUser`。
- 但**业务跨页态没有生命周期约定**：`store/demo.lastCreated` 只增不清，登出/换账号不清（P1-6）；模板没有“登出时清理哪些 store”的清单，这是模板级缺口，不是 demo 级小问题。
- 列表返回刷新：home 采用 `onShow` 无条件重拉，配合 `useList` 的 `immediate:false` 与 `ensureLogin` 先等登录，竞态处理是认真的；数据量大时应按 `rule-performance` 改 dirty 标记。
- 重登录：`request` 在无 token 时先 `await authHandler()`，并发请求靠 `session.login` 单飞合并；成功路径自洽。失败路径见 P1-2。
- 会话切换：`login(userId)` 的单飞只认“有没有 pending”，不认“pending 的是不是同一个 userId”（P1-3）。

### 2.4 失败模型

| 场景 | 现状 | 判断 |
|---|---|---|
| 网络/超时 | `ApiError(type='network')`，toast “连接超时” | 完整 |
| HTTP 非 2xx | `type='http'`，带 status | 完整 |
| 业务码非 0 | `type='business'`，带 code/raw | 完整 |
| 40005 并发 | 单飞 relogin + 只重放一次 | 成功路径完整 |
| 40005 重登失败 | 只 `resetUser()`，不清 token；不跳登录页 | **不闭环（P1-2）** |
| 40101 | guard 清会话 + relaunch 登录页 | 代码对，但真实后端几乎只在缓存异常时返回，覆盖面小 |
| 40205 / 50011 | 普通业务错误 toast | 频控可接受；50011 无引导，C 端常见需求缺口 |
| 守卫去重 | busy + 1s 冷静期 | 设计合理 |
| 登录接口自身 40005 | `authRetry:false` 防递归 | 完整 |
| 登录/绑定接口自身 401xx | 仍可能触发 code guard | **缺 `guard:false`（P2）** |
| 上传中断/重试 | 无重试、无断点；JSON 解析失败被归为 network | 模板级缺口 |
| 无 code 响应 | 视为成功（`request.js:141`） | 网关/代理 HTML 会被静默当成功（P2） |

### 2.5 安全边界

- 仓库内无真实 appid/域名/密钥/手机号；`.env.local`、`.env.*.local` 被忽略；`.env.local` 未入库。
- token 只存本地 storage，无密码；登出清登录字段。
- 前端权限/登录态只是体验层；demo 接口的服务端身份取登录缓存，不信任客户端传的 user_id（后端正确）。
- **webview 是唯一直接渲染外部 URL 的入口，且没有白名单（P0-1）**。
- 签名密钥在客户端可提取；模板没有把这一点写成“安全边界之外”。
- `console.error` 会打印完整 `ApiError`（含 `raw` 后端响应）；当前不含 token，但规则应明确“raw 只允许在 dev 打印”。

### 2.6 可测试性

- 可静态/构建验证：签名、URL 拼接、`useList`/`usePullRefresh` 状态机、`session` 单飞、`api` options 透传、`init.sh` 在临时副本上的行为。
- 只能真机/浏览器验证：rpx 缩放、胶囊高度、`clip-path` 箭头、`scroll-view` 下拉 `dy`、键盘顶起、H5 tabBar 遮挡、web-view 业务域名。
- 模板把“可验证”的部分做成了 `verify:*`（编译关），但没有单测/CI/引用检查；`rule-testing` 还说“无 package.json”，与现状不符。

### 2.7 演进风险

| 变化 | 影响面 | 风险 |
|---|---|---|
| uni-app/uview 升级 | easycom、`u-popup` 的 `flex:none !important` 覆盖、`u-skeleton` CSS 变量、`u-empty` props | 中；样式覆盖是 scoped 编译产物，升级易失效 |
| edition 升级 | `config/app.js` + 后端白名单 | 低 |
| 后端契约变更（JSON/401xx/字段名） | `services/http/*`、`config/dict.js`、`useList`、`api/*` | 中；有集中点，但 `useList` 默认值也是契约 |
| 新增多端（支付宝/抖音） | `platform.js` 分档、`scroll-view` refresher、`web-view` | 中高；当前只在微信/H5 验证 |
| 工程系统继续从源仓同步 | `.claude` 幽灵引用继续增加 | **高；这是当前最大的可维护性风险** |

### 2.8 架构结论

- **分层与依赖方向：可以接受。** 四层成立，注册模式合理，没有环。
- **边界与扩展点：需要调整。** `platform.js` 过宽、C 端登录资产过窄、session 绕过 api、换肤收敛不足。
- **失败模型：需要调整。** 成功路径优秀，失败路径必须补齐。
- **模板化：需要调整。** `.claude` 内容失真比代码问题更影响“能不能当标准模板”。

---

## 3. 实现层：问题清单

> 分级：P0 = 阻断/安全/契约错；P1 = 明显缺陷或架构跑偏；P2 = 改进建议。
> 标签：`[模板级]` 会被新项目复制放大；`[示例级]` 只影响 demo。
> 类型：`代码级` 可直接修；`需用户定` 是产品或契约决策。

### P0

#### P0-1 webview 页信任任意 `url`，H5 可加载第三方页面（安全）
- 位置：`src/packages/demo/webview/index.vue:22-27`
- 现状：`src.value = safeDecode(query.url)` 后直接 `<web-view :src="src">`，没有 scheme/host 校验。
- 触发：H5 下打开 `https://<app>/#/packages/demo/webview/index?url=https://evil.example` → 应用内嵌第三方页面（钓鱼/点击劫持）；`url=javascript:...` 或 `data:text/html,...` 在部分浏览器还会扩大 XSS 面。小程序端受业务域名限制，风险低。
- 修法：只允许 `^https?://`；再比对 host 是否等于 `rootPath` 的 host 或显式白名单（后端下发的 webview 域名）；不合法直接走“链接缺失”空态。若 H5 不是交付目标，也应在 README 注明“H5 下 webview 仅限可信域名”。
- 归类：`[模板级]` / `代码级`（1 行 scheme 校验 + 1 个 host 比较）

#### P0-2 demo 登录 stub 可被打进生产包，任意 user_id 可冒充（模板级，安全）

- 位置：`src/pages/login/index.vue:15-17`、`src/services/session.js:24-45`；后端 `go_project_template/internal/route/mvc.go:117`、`internal/service/web_service/demo.go:36-44`
- 现状：前端没有任何 `isProd`/环境闸口；后端 demo 登录注册在 weblogin 组，`mvc.go:117` 三个环境同一份注册，无环境开关。任意 `user_id >= 1` 可签发 token。
- 触发：模板前后端一起部署到生产，任何人 `POST /v2/web/demo/login`（form `user_id=N`）即得 N 的登录态。
- 修法：前端 production fail-closed（`login()` 拒绝 + 登录页禁止输入）；后端 production 关闭 demo 路由；README/init.sh/上线 Checklist 增加硬性项。
- 归类：`[模板级]` / `需用户定`

### P1

#### P1-1（已升级为 P0-2，保留原编号）demo 登录 stub 未进入上线阻塞清单；生产后端仍会签发任意 user_id 的 token（模板安全）
- 位置：`src/services/session.js:24-45`、`src/pages/login/index.vue:1-6`、`README.md:38-51,131`、后端 `internal/service/web_service/demo.go` 的 `Login`
- 现状：前端明确标注“stub”，但 README 的“上线前必须”只列 `REPLACE_*`；`init.sh` 的“剩余待办”也没提替换登录。后端 `weblogin` 路由在三个环境都注册，`Login` 对任意 `user_id >= 1` 签发 token。
- 触发：新项目忘记替换登录即发布；任何人 `POST /v2/web/demo/login` 即可拿到任意用户 token。
- 修法：README/init.sh 增加硬性项“替换 `session.login()` 的 demo stub”；前端在 `isProd` 下对 demo login 打 `console.error` 或直接拒绝（可配置开关）；后端 production 关闭 demo 路由（跨仓，需后端配合）。
- 归类：`[模板级]` / `需用户定`（若后端 production 路由确认开放，则升 P0）

#### P1-2 40005 重登失败后本地 token 不清理，用户卡在“永远 40005、永远不跳登录页”（登录态）
- 位置：`src/services/session.js:52-60`、`src/services/http/request.js:143-150`、`src/services/storage.js:70-75`
- 现状：`relogin()` 失败只 `resetUser()`，不清 `token/expires_at`；`isLogin()` 仍返回 true → `ensureLogin()` 返回 true → 页面不 `requireLogin()` → 后续请求继续 40005。
- 触发：服务端会话失效（Redis 重启/清空、真实登录接口失败、token 被服务端吊销），而本地 `expires_at` 仍在未来。
- 修法：relogin 失败时 `clearSession()`（或至少清 token）；在 request 层把“重登失败”升级为一个可注册的 auth-fail 处理器（与 guard 同模式），由 `services/guards.js` 统一 `logout + relaunch(LOGIN_PAGE)`；`ensureLogin` 在 login 失败时也走同一出口。
- 归类：`[模板级]` / `代码级`

#### P1-3 登录单飞不区分 userId，显式登录可能写成另一个账号（并发）
- 位置：`src/services/session.js:23-25`
- 现状：`if (pending) return pending`，没有记录 pending 对应的 userId。
- 触发：冷启动 `App.onLaunch` 正在为本地 user_id=3 静默登录；用户在登录页输入 5 并点登录，`login(5)` 直接复用 id=3 的 pending，最终写入 user_id=3，界面提示“登录成功”。
- 修法：pending 记录 `requestedId`；不同 id 不合并（或显式登录绕过单飞、取消旧请求）；写入会话前校验 `id === requestedId`。
- 归类：`[模板级]` / `代码级`

#### P1-4 `api` 方法不接 `options`，`useList` 的静默失败配置被吞，列表失败会双提示（示例级 + 模板级）
- 位置：`src/api/demo.js:31-46`、`src/composables/useList.js:81`、`.claude/skills/rule-api-request/SKILL.md:37-38`
- 现状：`useList` 调 `fetcher(query, { toast: toastOnError })`；`demoApi.list(params)` 只有一参，第二参被 JS 丢弃；`curl.get` 默认 `toast:true`。于是 `useList` 默认的 `toastOnError:false` 完全不生效。
- 触发：后端错误/断网 → 请求层 toast + `app-list-state` 错误态同时出现；与“列表失败默认不弹 toast”的设计相反。
- 修法：`list(params, options)` → `curl.get(url, params, options)`；`create(data, options)`、`remove(id, options)` 同理；把这作为 `rule-api-request` 的硬性检查项。
- 归类：`[示例级]` + `[模板级]`（参考实现会被照抄）/ `代码级`

#### P1-5 `lastCreated.name` 永远为空，首页“最近创建：”显示空白（示例级）
- 位置：`src/packages/demo/create/index.vue:82-85`、`src/store/demo.js:11-17`、`src/pages/home/index.vue:48`
- 现状：后端 `DemoCreateResult` 只有 `{ id, doc_preview_url }`，没有 `name`；创建页 `saveLastCreated(created.value)` 原样存，首页渲染 `lastCreated.name`。
- 触发：创建成功后回首页，预览卡片显示“最近创建：”。
- 修法：`saveLastCreated({ ...body.data, name })`（name 是提交成功的入参）；同时修 `store/demo.js` 的注释口径。
- 归类：`[示例级]` / `代码级`

#### P1-6 退出登录不清 `store/demo`，同设备换账号会看到上一账号的文档预览链接（隐私）
- 位置：`src/services/session.js:74-77`、`src/store/demo.js:11-17`、`src/pages/home/index.vue:45-51,133-141`
- 现状：`logout()` 只清 storage 与 userState，`demoState.lastCreated` 仍在内存；B 登录后首页显示 A 的预览入口（name 目前为空，但 URL 是 A 的），点击后后端按 token 里的 A 用户校验，仍能打开 A 的文档（5 分钟内）。
- 触发：A 创建文档 → 退出 → B 登录 → 首页点“文档预览”。
- 修法：`logout()` 清所有用户域 store（至少 `clearLastCreated()`）；模板补一条“登出清理跨页状态”的约定；更稳妥的做法是 `lastCreated` 按 userId 键控。
- 归类：`[模板级]`（跨页状态生命周期）/ `代码级`

#### P1-7 `.claude` 工程系统大面积幽灵引用，新人照规则会踩空（模板级，文档）
- 位置与实例（抽查，非全量）：
  - `docs/ARCHITECTURE.md` / `docs/uview-plus-components.md` 不存在：`.claude/agents/*.md:3`（10 个）、`.claude/workflows/*.yaml:5`（4 个）、`rule-project-structure:10,130`、`rule-ui-components:3,10,12,104`、`rule-style-css:10,248`、`rule-page-services:140`、`rule-multiplatform:221`、`rule-testing:32`
  - 不存在的组件/服务/页面：`rule-project-structure:33`（`fieldEditor`）、`:37`（`app-score-ring`，并写“现有 7 个”，实际 10 个）；`rule-ui-components:25`（`app-score-ring`/`app-plate-keyboard`/`app-safety-band`）；`rule-page-services:76-81`（`VALUATION_PAGE`/`VALUATION_RESULT_PAGE`/`BIND_CAR_PAGE`/`OBD_PAGE`）；`rule-style-css:179`（`pages/vehicle/obd`）、`:255-260`（`src/static/icons/` 11 组 51 枚，实际只有 tabbar + loading.png）；`rule-multiplatform:48,55,129,144`（`pages/vehicle/obd`、`.obd-cam__row`、obd/bind-car/valuation-report/charge-manager）
  - 不存在的 theme 键/token：`rule-ui-components:56-61`（`brandYellow`/`brandYellowDark`/`brandRed`/`brandOrange`，并称共 29 个；`src/config/theme.js` 实际 25 个且无这些键）；`rule-style-css:33-46`（`$color-brand-*`、`$color-nev-plate-1/2/3`、`$color-danger-text` 在 `theme.scss` 中不存在）
  - 过期现状：`rule-project-structure:90` 与 `rule-page-services:134`（“五个 tab”，实际 2 个）；`rule-page-services:88`（“五个方法”，实际 7 个：to/redirect/tab/relaunch/back/backTo/toMiniProgram）；`:110`（“分包四页”，实际 2 个）；`rule-testing:22,32`（“无 package.json”，实际有；`page / size`，实际 `page/page_size`）；`rule-multiplatform:138,141,214`（`#ifdef` 白名单三处并称 grep 命中 session.js，实际只有 platform.js 与 config/env.js 两处）
  - `agents/frontend_engineer.md:50`：`body.data.data` / `data.count`，与当前 `data.list` / `data.total` 直接冲突
  - `.claude/QUICK_START.md:22-60,31,146`：`@agent` 调用、`feature.yaml` 自动工作流、`context/current_sprint.md`、`CLAUDE.md 是唯一真相源`，与当前机制/CLAUDE.md 的“rule-skill 唯一权威”不一致
- 触发：新人按 `rule-ui-components` 传 `theme.brandYellow`（undefined）、按 `rule-page-services` import `VALUATION_PAGE`（undefined）、按 `rule-testing` 写 `pageSizeKey:'size'`（测试断言错）、按 `agents` 取 `body.data.data`（运行时报错）。
- 修法：以代码为准逐文件重写；删除 `docs/` 引用或把架构文档真正放回仓库（注意 `.gitignore` 目前忽略 `/docs/`）；加“引用存在性检查”（§6）；`agents/workflows/templates/checks` 若确定不日常使用，建议整体删除或移到 `legacy/` 并标注。
- 归类：`[模板级]` / `代码级`（文档）

#### P1-8 `rule-multiplatform` 的 H5 联调口径与模板代码相反，会误导排障（模板级，文档+配置）
- 位置：`rule-multiplatform:149-155,182,207,214`、`.env.development:12-13`、`vite.config.js:12-17`、`src/manifest.json:81-96`
- 现状：skill 说 `VITE_HOST_H5=http://localhost:15000/`、H5 直连、后端不答 OPTIONS、没有代理；模板实际 `VITE_HOST_H5=` 留空 + `vite.config.js` `/v2` 代理 + `manifest.h5.devServer` 又有一份不生效的重复代理。skill 还让人“别再找那个已删除的脚本”，但模板现在正是用 Vite 代理规避 CORS。
- 触发：H5 请求失败时按 skill 去查 CORS/删代理；把 `VITE_HOST_H5` 填成 localhost 后反而撞 CORS。
- 修法：以 `vite.config.js` 为准重写该节；删除 `manifest.h5.devServer.proxy` 死配置；`#ifdef` 白名单改为两处（`platform.js`、`config/env.js`），并删掉 session.js 的说明。
- 归类：`[模板级]` / `代码级`

#### P1-9 `doLogin` 幽灵：README、登录页、session 头注释三处指向不存在的函数（模板级，文档）
- 位置：`README.md:131`、`src/pages/login/index.vue:4`、`src/services/session.js:5`
- 触发：换真实登录时找不到入口，或去 `session.js` 搜 `doLogin` 无结果。
- 修法：统一改 `login()`；在 `session.login` 上方给一段可直接抄的 `wx.login → code2session` / `getPhoneNumber` 骨架（或至少 TODO 标记）。
- 归类：`[模板级]` / `代码级`

#### P1-10 数组序列化：CLAUDE.md 硬约束与 helper 实现冲突（契约/文档）
- 位置：`.claude/CLAUDE.md:66`、`src/utils/qs.js:9-11`、`src/services/http/request.js:43-46`、`rule-api-request:50-54`
- 现状：CLAUDE.md 写“数组字段逗号分隔，禁止 `key[]=`”；`toQueryString` 实际输出 `ids[0]=1&ids[1]=2`；GET 输出重复 key；skill 承认两套不一致，但顶层硬约束没改。
- 触发：新接口按 CLAUDE.md 直接传数组 → 后端收到 `key[0]`；或按 skill 又 `join(',')`，两种写法混用。
- 修法：二选一——把 `toQueryString` 改为逗号串（并同步 skill/后端），或在 CLAUDE.md 改成“数组由 helper 序列化；后端要逗号串时业务自行 `join(',')`”，明确禁用 `key[]` 的边界。
- 归类：`[模板级]` / `需用户定`

#### P1-11 H5 tab 页底部让位机制未接线，tabBar 可能盖住内容底部（模板级，需实测）
- 位置：`src/services/platform.js:31,73`、`src/styles/scaffold.scss:196-198`、`src/pages/home/index.vue`、`src/pages/mine/index.vue`
- 现状：`getLayout().tabBarOverlay` 与 `--tab-overlay` 是为 H5/App fixed tabBar 设计的；`.hud-page__body` 用 `var(--tab-overlay, 0px)`，但**全仓没有页面写这个变量**；`.hud-page` 又是 `height:100vh; overflow:hidden`，H5 的 `uni-page-wrapper` 若已扣掉 tabBar 高度，底部约 50px 会落在可视区之外。
- 触发：H5 375×667 打开首页/我的，滚到底部看 CTA/文字是否被 tabBar 压住。
- 修法：home/mine 在 `onMounted`/setup 里写 `--tab-overlay: ${getLayout().tabBarOverlay}px`（或把 `.hud-page` 高度改为 `100%`/flex 撑满 wrapper）；实测后再决定是否保留 `tabBarOverlay`。
- 归类：`[模板级]` / `代码级`（需 H5 实测确认）

#### P1-12 develop 免签名头未按 isProd 收紧（模板级，安全加固）
- 位置：`src/services/http/sign.js:44-47`、`src/config/env.js:49`
- 现状：只判断 `VITE_DEVELOP_BYPASS` 是否非空；`.env.local` 是全局覆盖文件，误设会让 `build:*` 产物也带 `develop` 头。
- 触发：开发机 `.env.local` 配了 `VITE_DEVELOP_BYPASS=develop`，执行 `npm run build:*`；生产包带 `develop` 头（后端 `DevelopBypass=false` 时不生效，但属不必要的攻击面/误配面）。
- 修法：`if (developBypass && !isProd)`；或在 `env.js` 导出 `isProd ? '' : raw`。
- 归类：`[模板级]` / `代码级`

#### P1-13 npm 脚本不兼容 Windows（模板级，平台）
- 位置：`package.json:7-14`
- 现状：`SASS_LEGACY_JS_API=silence uni ...` 是 POSIX shell 语法；Windows cmd/PowerShell 下 `npm run` 直接失败。
- 触发：Windows 开发者按 README 执行 `npm run dev:mp-weixin`。
- 修法：加 `cross-env`（devDependency），或把 SASS 静音配置移入 `vite.config.js` 的 `css.preprocessorOptions`，去掉 shell 前缀。
- 归类：`[模板级]` / `代码级`

#### P1-14 init.sh 不处理后端端口，换端口要手改 3 处（模板级，接入）
- 位置：`init.sh:26-29`、`.env.development:10-11`、`vite.config.js:17`、`src/manifest.json:91`
- 现状：后端模板 init.sh 会问端口，C 模板硬编码 15000 三处（manifest 那份还可能不生效）。
- 触发：后端 init.sh 改成 15001，前端仍打 15000，真机/浏览器全部网络错误。
- 修法：init.sh 询问 `backend_port` 并替换三处；删除 manifest 死代理，只留 `vite.config.js`。
- 归类：`[模板级]` / `代码级`

### P2（改进建议，按主题）

| # | 位置 | 问题 / 触发 | 建议 |
|---|---|---|---|
| P2-1 | `src/services/http/sign.js:40-41` | `token/userid` 用魔法占位串 `'token'/'userid'`；`timestamp/userid` 是数字，个别端对 header 值类型敏感 | 占位常量化；所有 header 值 `String()`；注释说明“占位是为了满足后端 TokenHeaders 存在性检查” |
| P2-2 | `src/services/http/request.js:141` | 无 `code` 字段即视为成功；网关/代理返回 HTML 时会被当成功，列表变空 | 要求 body 为对象且含 `code`；或增加 `raw` 选项显式允许 |
| P2-3 | `src/services/http/request.js:29-34` | rootPath 为空（H5 同域）时拼出 `v2/...`，没有前导斜杠；部署在子路径时会指错 | rootPath 为空时返回 `/${routeVersion}/${path}` |
| P2-4 | `src/services/session.js:32-33`、`rule-auth-state:49` | 登录/绑定接口只传 `authRetry:false`，没有 `guard:false`；若后端返回已注册守卫码（如未来的 50011），会在登录页触发全局跳转/弹窗 | 登录/绑定类请求统一 `{ authRetry:false, guard:false }` |
| P2-5 | `src/composables/useList.js:125-135` | 无条件注册页面级 `onReachBottom/onPullDownRefresh`；B 档 `scroll-view` 页面用不到，A/B 混用可能双触发 | 增加 `config.pageHooks=false`，或拆 `useScrollList` |
| P2-6 | `src/pages/home/index.vue:105` | 注释说未登录会“先吃一次 40003”，实际后端缺 token 返回 40005 | 改注释为 40005 |
| P2-7 | `src/pages/home/index.vue:106-108` | 解构了 `total` 但未使用 | 删除或展示总数 |
| P2-8 | `src/pages/login/index.vue:81-83` | `toast('登录成功')` 后立即 `relaunch`，登录页卸载导致 toast 被 `removeToastInstance` 收起 | `await toast(...)` 再跳，或跳转到首页后由首页提示 |
| P2-9 | `src/packages/demo/create/index.vue:31-37` | 名称输入框没有 `confirm-type` / `@confirm`，与 `rule-ui-components` 的键盘提交规则不一致 | 补 `confirm-type="done"` + `@confirm="onSubmit"`（数字键盘问题不适用，但一致性该有） |
| P2-10 | `src/services/platform.js:310-322` | `canNativeMap` 在 H5 返回 true，但 `manifest.json` 没有 H5 地图 key；使用 `<map>` 会直接失败 | H5 改为 `schematic`，或在 README 写明需配腾讯地图 key |
| P2-11 | `src/services/platform.js:22-320` | 扫码/相机/地图/PDF/横屏/拨号/轻震/定位等能力模板无消费方，部分有隐含前提（H5 地图 key、相机授权、下载域名） | 标注“能力库，未在 demo 验证”；或移到 `services/extras/`；README 列一张能力表 |
| P2-12 | `src/manifest.json:19-26` | 默认声明 `scope.userLocation` + `requiredPrivateInfos:["getLocation"]`，但模板无定位页面；小程序审核需要用途说明，新项目容易忘删 | 默认移除；`location.js` 保留，规则里写“按需加回” |
| P2-13 | `src/pages.json:17-80,84` | 13 处 `#E9F4EF` + tab 选中色 `#12A276` 硬编码；换主色要手工改 14 处 | README 补“第三处：pages.json”；或加一个 token→pages.json 的生成脚本 |
| P2-14 | `README.md:139` | 说“改 theme.scss + theme.js 两个文件即可换主色”，与 P2-13 不符；tabbar PNG 也是固定色 | 修正文档；补图标替换说明 |
| P2-15 | `src/config/app.js:23`、`src/config/env.js:40` | `SERVICE_TEL`、`viewHost` 无消费方；`init.sh` 收集了客服电话却没有入口 | 在“我的”加客服电话入口（`callPhone(SERVICE_TEL)`），或从 init/README 移除；`viewHost` 删除 |
| P2-16 | `src/api/demo.js:23-25` | `demoApi.login` 与实际 `session.login` 重复且无人调用；`ENDPOINT_DEMO_PREVIEW` 无消费方 | 删除 `demoApi.login` 或让 session 调它；PREVIEW 常量保留并注明“仅文档用途” |
| P2-17 | `src/components/app-cta|app-form-row|app-option-sheet` | 三个组件无任何页面消费，但 `rule-ui-components` 当作模板资产宣传 | 在 demo 页用一次（form-row/option-sheet 可放进 create 表单），或删除 |
| P2-18 | `src/components/app-modal:103`、`src/components/app-loading:99` | z-index 10000/10010 硬编码，loading 盖在 modal 上；守卫弹窗与并发 loading 同时出现时，按钮可能被透明拦截层挡住 | z 档收进 theme token；loading 低于 modal，或给 loading 的根节点在非 mask 时 `pointer-events:none` |
| P2-19 | `src/common/css/main.css` | 64KB、286 个 `.cu-*` 组件类，与“只用 ColorUI 原子类”的声明不符；主包体积 | 只保留需要的原子类/布局类，或明确接受这份体积 |
| P2-20 | `src/config/theme.js:13-53`、`src/common/css/theme.scss` | 保留 `track`（地图）、`textOnYellow`（历史名）等业务域色彩；`theme.js` 25 键与 skill 宣称的 29 键不一致 | 重命名/注释；把业务域 token 移到“可选扩展” |
| P2-21 | `src/services/route.js:80` | 注释“换车 / 重选”是源业务残留 | 改成通用描述（“切换对象/重选”） |
| P2-22 | `src/components/app-refresher/app-refresher.vue:13,195` | 箭头用 `clip-path`；微信 Android WebView 对 clip-path 的支持需真机确认 | 保留但加入真机清单；或退回 border 折角 |
| P2-23 | `src/pages/home/index.vue:45-51` | 预览链接 token 只有 300s；`lastCreated` 无过期时间，久留后点击会看到后端 HTML 错误页 | 记录签发时间，超时隐藏入口；或点击前提示“链接可能已过期” |
| P2-24 | `src/pages/home/index.vue:151-156` | `reload()` 未 await；若删除成功但 reload 在飞失败，列表仍显示已删除项 | await 并按返回值提示，或先本地移除再重拉 |
| P2-25 | `.claude/CLAUDE.md:82` | 把 40005 归到“401xx 鉴权”，实际是 40xxx | 文案修正 |
| P2-26 | `.claude/CLAUDE.md:144` vs `.gitignore:24` | 说 `.codegraph/` 不进版本库，但 `.gitignore` 没有 `.codegraph/`；也没有 `.claude/settings.local.json` | 补两条 ignore |
| P2-27 | `.claude/project-meta/.last-sync` | 值为 `213b468`，HEAD 是 `b2ed30c`；按 CLAUDE.md 应收尾写 HEAD | 更新 |
| P2-28 | `init.sh` | 不替换显示标题 `C 端小程序模板`（4 处）、不提示 tabbar PNG 换色；`sed` 替换值含 `&` 会被展开；无 dry-run | 增加提示/转义/dry-run；把标题替换列进“剩余待办” |
| P2-29 | `.claude/templates/*` | 内置 Go/Java/Python 模板与 `CODE_INVALID_PARAM=400`、`order` 业务码，与当前 40xxx 契约冲突；`examples` 仍讲 `@feature`/Go service | 删除或标 legacy；只留 `frontend/page.vue.tmpl` 且按当前骨架校对 |
| P2-30 | `.claude/checks/README.md` | 示例 grep 路径是 `pages/ api/ services/`（无 `src/`） | 修正路径 |
| P2-31 | `package.json` | 没有 `engines`/lint/format 配置；Node 版本不明确 | 加 `engines` 与至少一个 lint 脚本；模板不强制测试但应有静态检查 |
| P2-32 | `src/config/dict.js:24-25` | 40205/50011 有码无引导；50011 是 C 端常见需求（绑手机） | 至少给一个 50011 守卫的注释示例（已有）或完整实现 |
| P2-33 | `src/utils/oss.js:15` | `ossHost` 为空时返回无前导斜杠的相对串（如 `foo/bar.png`），`<image>` 会按当前路由解析而 404；模板默认 OSS host 为空 | host 为空返回 `''`（或至少 `/` + path），并 `console.warn`；README 说明先配 `VITE_OSS_HOST` |
| P2-34 | `src/manifest.json:83` vs `README.md:26` | manifest 写 devServer 8080，README 写 5173；CLI 实际用 Vite 默认 5173，manifest 的 port 不生效 | 统一端口：在 `vite.config.js` 显式 `server.port` 或改 README；删 manifest 的重复 devServer 配置 |
| P2-35 | `src/pages/home/index.vue:90` | 只 import 了 `alert` 未使用（`confirm` 在用） | 删 `alert` |
| P2-36 | `src/composables/useList.js:91-95` | 刷新失败时 `error` 非空，`app-list-state` 用整页错误态覆盖已有列表；用户下拉一次失败就看不到旧数据 | 有旧数据时保留列表 + toast（或给 `error` 加 `keepList` 语义） |
| P2-37 | `src/packages/demo/create/index.vue:59-70` | 分包表单页没有自己的 `ensureLogin/requireLogin`；深链进来先填完表单，提交才触发 40101 守卫 | `onShow` 先 `ensureLogin()`，失败 `requireLogin()`；与 home/mine 一致 |
| P2-38 | 根目录 | 无 `LICENSE`；公开仓/公司内部仓的授权范围未声明 | `需用户定`：MIT/内部专有/不公开 |
| P2-39 | 全仓 | 仓库内无单测/冒烟脚本；本次验证靠 `/tmp` 脚本与后端临时实例 | 加 `scripts/smoke.sh`、`scripts/check-refs.mjs`、`vitest`（sign/qs/useList/session）；CI 跑双端 verify |
| P2-40 | `src/config/dict.js:36` | `GUARD_UNBOUND_PHONE` 定义但未使用（守卫示例被注释） | 删常量，或补完整 50011 守卫示例 |
| P2-41 | `init.sh:26-29` | 域名输入不校验 scheme：用户填 `api.example.com` 会得到无协议头的 host；OSS 同理 | 无 scheme 自动补 `https://`；非法值直接拒绝 |
| P2-42 | `init.sh:55-59` | `grep -q` + `sed` 遍历 git 全部文件，若二进制恰好命中标识会被改写损坏 | `grep -I` 只处理文本；或按 `file --mime` 过滤 |
| P2-43 | `.claude/CLAUDE.md:82` | 把 40005 归到「401xx 鉴权」，实际 40005 属 40xxx | 文案修正为「40005 登录失效（40xxx）；401xx 鉴权另有 40101/40102」 |

---

## 4. 模板化风险：哪些会被复制放大

### 4.1 模板级（必须优先修）

1. **登录失败分支**（P1-2）——每个项目都会继承同一段 relogin 代码。
2. **登出不清业务 store**（P1-6）——模板没有“store 生命周期”约定，后续每个业务 store 都会漏清。
3. **api 方法签名**（P1-4）——参考实现不接 options，所有新域会照抄一参签名。
4. **webview 白名单**（P0-1）——每个用到 web-view 的项目都会复制这个入口。
5. **`.claude` 失真**（P1-7）——这是模板的核心卖点之一，失真会让“工程系统”从加速器变成负担。
6. **demo 登录 stub 的上线检查**（P0-2）——漏一次就是任意账号登录。
7. **换肤收敛**（P2-13/14）——新项目第一件事通常是换主色，会立刻发现文档不对。

### 4.2 示例级（只影响 demo，但会误导）

1. `lastCreated.name`（P1-5）。
2. `demoApi.login` 重复（P2-16）。
3. `home` 的 `total` 未用、注释 40003（P2-6/7）。
4. 预览 token 过期无提示（P2-23）。
5. `route.back` 注释“回首页”实际回上一页（P2-21 同类）。

---

## 5. 契约对齐矩阵（C 端 web 组 / source=1010）

| 项 | 后端真源 | 前端实现 | 结论 |
|---|---|---|---|
| 统一响应 | HTTP 恒 200 + `{code,msg,data}`，`code=0` | `request.js:136-163` | ✅ 一致 |
| 签名原文 | `Source=%s&TimeStamp=%d&Key=%s&Weight=%s`（`conf/enum.go:28`） | `sign.js:37` | ✅ 逐字一致 |
| sign 大小写 | `fmt.Sprintf("%X", md5.Sum(...))` 大写 | `.toUpperCase()` | ✅ |
| 请求头 | timestamp/sign/source/random/edition/token/userid/develop（`conf/keys/keys.go:101-108`） | `sign.js:34-47` | ✅ 头名一致（HTTP 头大小写不敏感） |
| 时间戳 | 秒级，±300s | `Math.floor(Date.now()/1000)` | ✅ |
| develop 免签 | local/develop `DevelopBypass=true`，头值=develop | `.env.development` + `sign.js:47` | ✅；生产 `.env.production` 未开 |
| source | 1010 微信小程序 C（`keys.go:77`） | `config/app.js:20` | ✅ |
| edition | `v1.0.0` 三环境白名单 | `config/app.js:13` | ✅ |
| 路由前缀 | `RouteVersion="/v2"` | `config/app.js:17` + `request.js:33` | ✅ |
| 登录响应 | `{token, expires_in}`，无 user_id | `session.js:34-39` 补 user_id | ✅ |
| token 头 | `token` + `userid`，TTL 7200 | `storage.js` + `sign.js` | ✅ |
| 40005 | token 不匹配/缺失 | 重登+重放一次 | ✅ 成功路径；失败路径见 P1-2 |
| 40101 | Service 层 userId==0 | guard 清会话+回登录 | ✅ 实现一致，触发面小 |
| 分页 | `PaginationParams` page/page_size | `useList` 默认键 | ✅ |
| 列表结构 | `{total, list}` | `pickDemoList` / `defaultPick` | ✅ |
| 创建响应 | `{id, doc_preview_url}` | 创建页消费 | ✅ 契约一致；前端多用了不存在的 `name`（P1-5） |
| 删除 | POST form `{id}` 软删 | `demoApi.remove` | ✅ |
| 状态文案 | `status_text` | 直接展示 | ✅ |
| 时间字段 | 秒级 `create_time` | `mdHmText` ×1000 | ✅ |
| webview | `/v2/webview/demo/preview?access_token=`，短时效 HMAC；失败 HTML 错误页 | `absoluteUrl` + `<web-view>` | ✅ 契约一致；入口需白名单（P0-1） |
| 上传 | 后端只有 B 端 `AdminUploadTypes`，C 端无路由 | `ENDPOINT_UPLOAD='REPLACE_UPLOAD_ENDPOINT'` + `curl.upload` | ⚠️ 诚实占位，但 C 端上传是缺口 |
| 数组参数 | 后端按需（demo 未用） | GET 重复 key / POST `key[0]` | ⚠️ 文档冲突（P1-10） |
| 错误文案 | 签名/来源/版本失败回 `40003` + “Im Invalid Request!” | 原样 toast | ⚠️ 用户会看到英文；建议 dev 映射/提示 |

---

## 6. 验证建议

### 6.1 已有验证（合并两窗口的证据）

**抽离窗口本机执行（HEAD b2ed30c）**：

- `npm run verify:mp-weixin` / `verify:h5` 通过；`build:mp-weixin` 通过。
- `init.sh` 临时副本实测：改名 + appid/域名/OSS/电话替换通过；确认标题/端口/key 不会自动改（P1-14/P2-28 的证据）。
- 静态审计：`src` 无缺失 import、无跨文件循环依赖；theme JS 键无缺失。
- 文档路径审计：列出 P1-7 的幽灵引用。
- 历史同代码验证：后端临时实例 login→create→list→delete→webview 全通过；H5 + headless Chrome E2E（静默登录→列表→创建→预览→删除）通过；fresh clone + `npm ci` + verify 通过。

**并发窗口只读评审**：未运行构建（避免写 `dist/`），双端可编译性沿用上述结论；未做真机回归。

### 6.2 建议补的自动化

1. **引用存在性检查（最高性价比）**：`scripts/check-refs.mjs` 扫描 `.claude/**/*.md`、`.yaml`，提取反引号里的路径/`app-*`/`theme.*`/route 常量，断言存在。可直接消掉 P1-7 的大部分。
2. **构建期环境校验**：`vite.config.js` 加插件，production 模式若 `VITE_API_KEY` 为空或 host 含 `REPLACE_` 直接 fail；development 若 `VITE_HOST_MP` 仍是 127.0.0.1 打 warning。
3. **api options 单测**：mock `curl`，断言 `demoApi.list(params, opts)` 把 opts 透传；`useList` 断言 fetcher 第二参。
4. **session 单测**：`login` 单飞不同 id、`relogin` 失败清会话、`logout` 清 store。
5. **CI**：`npm ci` + 双端 verify + check-refs；不需要引入完整测试框架。
6. **真机清单**（脚本化不了，但写进 README）：
   - H5 375×667：tab 页底部是否被 tabBar 盖住；
   - 微信 Android/iOS：`clip-path` 箭头、`scroll-view` 下拉 `detail.dy`、键盘顶起、`web-view` 业务域名；
   - 真机 LAN IP / HTTPS 合法域名；
   - 低版本微信基础库（`getDeviceInfo`/`getWindowInfo`/`getAppBaseInfo` 回退）。

---

## 7. 如果我接手，前两周会做什么

**第 1 周：先把“会复制放大的错误”修掉**

- D1：P0-1 webview 白名单；P0-2 demo 登录 production fail-closed；P1-2 relogin 失败清会话 + 全局 auth-fail 跳登录；P1-3 单飞按 userId。
- D2：P1-4 api options；P1-5 lastCreated.name；P1-6 logout 清 demoState；补 `guard:false` 到登录/绑定接口。
- D3：P1-8 vite 代理口径 + 删 manifest 死配置；P1-11 H5 tab overlay 实测与修复；P1-12 develop 头 isProd 收紧；P1-13 Windows 脚本；P1-14 后端端口；P2-1/2/3 请求层小修。
- D4：跑双端 verify + 后端联调 + H5 浏览器回归；更新 `.last-sync`。
- D5：把“上线前必须处理”扩成 10 项清单，加入 demo 登录 stub 与 API key 检查。

**第 2 周：把工程系统变成可信资产**

- D6–D7：P1-7 全量清理 `.claude`：删除/重写幽灵引用；`agents/workflows/templates/checks/examples` 决策（建议删或 legacy）；补 `scripts/check-refs.mjs`。
- D8：P1-9 登录扩展点：补 `wx.login → code2session` 与 `getPhoneNumber` 的骨架（后端 TODO），README 换成 `login()` 口径；评估把 50011 守卫做成完整示例。
- D9：P1-10 数组口径拍板并统一；P2-13 换肤收敛（pages.json 生成脚本或 README 清单）。
- D10：CI（verify + check-refs + 环境校验）；真机清单跑一遍；输出 v1.0.1 的 requirement/CHANGELOG。

---

## 8. 需要用户拍板的问题

1. **`docs/ARCHITECTURE.md` 的归属**：恢复进库（并改 `.gitignore`）还是彻底删除所有引用？建议：把架构说明收进 `.claude/project-meta/architecture.md`（常驻上下文之外、按需读），避免与“docs 不进库”冲突。
2. **`.claude/agents`、`workflows`、`templates`、`checks`、`examples` 的去留**：当前明确“保留但不日常使用”，与 QUICK_START 的强引导矛盾。建议删除或移入 `legacy/`，只留 rule-skill + project-dev。
3. **C 端登录资产的范围**：模板是否内置 `wx.login/code2session` 与 `getPhoneNumber` 骨架？如果目标客户都做微信登录，建议内置；代价是要定义一个后端契约（后端模板目前只有 demo stub）。
4. **demo 登录 stub 的生产策略**：前端 production fail-closed、后端关闭 demo 路由、还是只在 README 警告？建议三者都做。
5. **数组序列化口径**：逗号串（CLAUDE.md 现状）还是重复 key/下标 key（helper 现状）？这是接口契约，必须与后端统一。
6. **C 端上传**：是否要求后端模板补一个 `/web/upload` 路由？不补则模板的 `curl.upload` 只是半成品。
7. **平台能力库的保留范围**：扫码/地图/定位/PDF/横屏是否属于“标准 C 端模板”的必备？保留则要补 README 与真机验证；不保留则删。
8. **换肤的单一来源**：pages.json 不支持变量，是接受 14 处手改 + 脚本提示，还是引入构建期生成（成本更高）？
9. **签名密钥的安全定位**：是否接受“密钥在客户端、签名不是安全边界”的诚实说明？如果不能接受，需要改后端鉴权方案（超出模板范围）。
10. **Windows 是否一等支持**：决定是否引入 `cross-env`、改造 npm 脚本与真机联调文档。
11. **LICENSE 与公开范围**：内部专有 / MIT / 不公开；tabbar 图标与 loading 图是否必须替换。
12. **测试门槛**：`check-refs`、`check-env`、`vitest`、CI 是否作为模板发版必须项。

---

## 9. 上线前必须处理（Checklist）

- [ ] **替换 demo 登录 stub**：`session.login()` 改为微信 `code2session` / 手机号验证码；确认生产后端不开放 `/web/demo/login`。
- [ ] **修 webview 白名单**（P0-1）：只允许 `https?://` + 允许域名。
- [ ] **确认生产包不含 `develop` 头**（P1-12）：`grep -r "develop" dist/build/mp-weixin/` 不应命中请求头配置。
- [ ] **修 40005 失败分支**（P1-2）：relogin 失败清会话并跳登录页。
- [ ] **修登出清理**（P1-6）：清 `store/demo`（以及所有用户域 store）。
- [ ] **替换全部 `REPLACE_*`**：appid / API 域名 / OSS 域名 / 客服电话 / 上传路径。
- [ ] **配 `VITE_API_KEY`** 到 `.env.production.local`，并确认构建期校验通过。
- [ ] **微信后台业务域名**：web-view 预览域名。
- [ ] **真机联调**：`VITE_HOST_MP` 改 LAN IP/HTTPS 合法域名；确认 `dist/dev` 导入。
- [ ] **定位权限**：若不用定位，删除 `manifest.json` 的 `scope.userLocation`/`requiredPrivateInfos`。
- [ ] **换标题与图标**：`C 端小程序模板` 4 处、tabbar PNG、`index.html`/`manifest` 描述。
- [ ] **H5 tab 页底部**：实测不被 tabBar 盖住（P1-11）。
- [ ] **发布前最后跑 `build:*`**：避免把 `dist/build` 里的 dev 包发上生产。

## 10. 模板可接受、但必须在 README 说明

1. **demo 登录无凭据**：只用于联调；生产必须替换；后端 demo 路由不得开放。
2. **签名不是安全边界**：`VITE_API_KEY` 会进客户端产物、可被提取；真正的鉴权是 token + 服务端身份。
3. **production 缺密钥不会构建失败**：当前产物会“能打包但签不出合法请求”，必须在 `.env.production.local` 配 key。
4. **H5 同域/跨域前提**：`VITE_HOST_H5` 留空走相对路径 + Vite `/v2` 代理；跨域部署需后端 CORS 或反向代理。
5. **真机 127.0.0.1 不可用**：需 LAN IP / HTTPS 合法域名 / 不校验合法域名（仅 devtools）。
6. **web-view 业务域名**：小程序端必须在后台配置；H5 端模板只做 scheme 校验，域名白名单由业务补。
7. **预览链接 5 分钟过期**：`lastCreated` 是短期入口，不是持久文档中心。
8. **上传是占位**：`ENDPOINT_UPLOAD` 未接入；后端模板无 C 端上传路由。
9. **定位/相机/地图能力**：默认 manifest 声明了定位；H5 地图需要腾讯地图 key；不使用请删。
10. **换主色不止两个文件**：`theme.scss` + `config/theme.js` + `pages.json` 14 处 + tabbar PNG。
11. **`.claude/agents`、`workflows`、`templates`、`checks`、`examples` 是保留的历史系统**，不日常使用；`docs/ARCHITECTURE.md` 当前不在库（或清理后删除引用）。
12. **构建产物目录**：`verify:*` 与 `build:*` 共用 `dist/build`，后跑覆盖前跑；真机只用 `dist/dev`。
13. **develop 免签名头只允许 dev**：`.env.development` 配 `VITE_DEVELOP_BYPASS=develop`；生产不得设置，代码应按 `isProd` 收紧。
14. **Windows 限制**：当前 npm 脚本使用 POSIX 环境变量前缀，Windows 需 `cross-env` 或改用 WSL；README 应写明。

---

## 附录：本次评审的边界

- 未运行 `npm run verify:*` / build（只读评审，且会写 `dist/`）；双端可编译性沿用两个并发会话的验证结论。
- 未在真机/浏览器重新跑 E2E；涉及 H5 tabBar 遮挡、`clip-path`、下拉 `dy`、键盘的结论标注为“需实测”。
- 后端模板只读参考，未修改；`weblogin` 在生产是否注册、demo 路由是否关闭属于后端仓决策，本报告只标注 C 端模板应做的防护。
- 未逐行审阅 `src/uni_modules/uview-plus`（三方库）与 `src/common/css/main.css`（ColorUI）内部实现。
- **合并来源**：`wxapp-c-template-60` 的 492 行只读评审 + 抽离窗口的 370 行评审。合并时已核对其关键发现（api options、lastCreated.name、tabBar overlay、CLAUDE.md 数组冲突、agent `body.data.data`、relogin 失败分支）；抽离窗口另存件 `review-from-copy-window.md` 已删除，内容并入本文件。
