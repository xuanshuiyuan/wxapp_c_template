---
name: rule-project-structure
description: 在本项目（uni-app + Vue3 + uview-plus 多端脚手架）新增任何文件、不确定某个变量/函数/常量/组件该放哪个目录、要判断代码归属层、或评审别人的分层是否跑偏时使用。给出每个目录的职责、依赖方向、页面层禁止清单、"想做 X 就改哪几个文件"落点速查，以及本次任务该继续读哪个 rule-skill。
---

# rule-project-structure

> **本文件的「硬性禁令」与下方正文同等权威**：原 `rules/scaffold-musts.md` §1 §2 与架构总纲已迁入本文件（全项目唯一一份，不再单独维护 rules）；冲突时以禁令小节 + 代码为准。其它主题的禁令在对应 rule-skill 的「硬性禁令」小节，查表见 `.claude/project-meta/skills-index.md`。

> **路径口径**（2026-09-20 起工程为 uni-app CLI + `src/` 结构）：本文件里**不带前缀的模块路径一律相对 `src/`**（`pages/` 即 `src/pages/`，`@/` 别名 = `src/`，配在 `jsconfig.json`，只为编辑器跳转/补全服务）；仓库根只放构建链文件（`package.json` `vite.config.js` `index.html` `.env*` `jsconfig.json` `README.md` `dist/`）。`docs/`（`ARCHITECTURE.md`、`uview-plus-components.md`）与 `.claude/` 在仓库根，引用时不加 `src/` 前缀。

本项目的**唯一分层真相**：四层结构，依赖只能向下。基础设施只有一套写法；`pages/` 下是入门的三个页面（`home` 列表 / `login` 登录 / `mine` 我的）＋ `packages/demo` 两个分包页，**demo 模块就是全链路参考实现**——要照抄就抄现役页（请求 / 登录 / 弹窗 / toast 看 `pages/login/index.vue`、`pages/home/index.vue`），新页按 `rule-add-page` 内置骨架现写。

## 先看这张：任务 → 该读哪个 skill

| 你要做的事 | 主 skill | 顺带要读 |
|---|---|---|
| 加一个页面（列表/表单/详情） | `rule-add-page` | `rule-api-request` `rule-ui-components` `rule-style-css` |
| 加/改一个接口方法，处理请求错误 | `rule-api-request` | `rule-page-services`（loading/提示） |
| 涉及登录、用户信息、登录拦截 | `rule-auth-state` | `rule-page-services` |
| 写 UI、挑组件、封装公共组件 | `rule-ui-components` | `rule-style-css` |
| 写样式、改主色、加间距档位 | `rule-style-css` | `rule-ui-components` |
| 弹提示/确认框、跳转返回、loading | `rule-page-services` | — |
| 区分端、H5 接口不通、安全区适配 | `rule-multiplatform` | `rule-style-css` |

## 每个目录干什么（判据，不是背名字）

| 目录 | 职责判据 | 典型内容 |
|---|---|---|
| `pages/` `packages/` | **只有「调接口 + 渲染 + 反馈」**，删掉它不影响别处复用 | 主包 3 页 `pages/<模块>/index.vue`（home/login/mine）＋ 分包 `packages/demo/{create,webview}` |
| `composables/` | 把**一个能力**封成 hook，含加载/错误/空态三态 | `useList` `useModal` `usePullRefresh` |
| `api/` | **业务域名词 → HTTP**，一个域一个文件，URL 只引 `config/endpoints.js` 常量 | `demo.js`；新业务照此新增 `api/<域>.js` |
| `services/` | 所有**有副作用**的能力；**端差异只允许出现在这一层（＋ `config/env.js`）** | `http/` `session` `storage` `toast` `route` `platform` `guards`（全局业务码守卫，`main.js` 副作用 import）、`location`（跨端定位 gcj02＋会话缓存＋单飞）、`fieldEditor`（打开分包编辑页并 Promise 收回传值） |
| `store/` | **跨页响应式状态**（零依赖 reactive，不上 Vuex/Pinia） | `user` `modal` `loading` `toast` `demo` |
| `config/` | 环境/常量/字典/JS 侧色值/接口登记表，**无逻辑无副作用** | `env` `app` `dict` `theme` `endpoints`；业务字典按域拆 `config/dict/<域>.js` 后汇总 |
| `utils/` | **纯函数**：不 import services、不碰 uni API、不发请求 | `qs` `date` `oss` `text` `number` `url` |
| `components/` | **通用**组件：easycom 自动注册，目录名=文件名=标签名；只放跨页 `app-*` | 现有 7 个：`app-modal` `app-skeleton` `app-list-state` `app-loading` `app-navbar` `app-refresher` `app-score-ring` |
| `pages/<page>/components/` | **页面专用**组件：不在 easycom 扫描域，页面显式 import；第二个页面要用时再提升到 `components/`（分包页同理：`packages/<模块>/<页>/components/`） | 模板暂无页面专用组件；新建时按此目录形态 |
| `common/css/` | 全局样式三层：`theme.scss`(token 真源) `base.scss`(原子类) `main.css`(ColorUI) | 见 `rule-style-css` |
| `styles/` | 版式块 `scaffold.scss`（`.card` `.btn` `.list-item` `.hud-page*` `.hud-tile*` …） | 见 `rule-style-css` |
| `static/` | 图片等资源；**tabBar 图标在 `static/tabbar/`** | `tabbar/`（2 组 4 张）、`loading.png` |
| `uni_modules/` | 三方模块，**只放 `uview-plus`，不改它的源码** | — |

**归类拿不准时的三问**：① 有没有副作用（请求/存储/uni API/UI）？有 → `services/`。② 是不是纯计算？是 → `utils/`。③ 是不是只在某一页用？是 → 就写在该页 `<script setup>` 里，别急着抽。

## 依赖方向

```
页面层 → composables → api → services → config / utils
                     ↘ store ↗
```

- 禁止反向（`services` 不 import `api`）、禁止同级互相 import 成环。
- **端差异只经 `services/platform.js` 暴露的能力标志消费**（`isMP/isH5/isApp`、`getLayout()`、`canScan/canInlineScan/SCAN_MODE`）；页面与业务组件不自己判端、不写条件编译。
- 唯一的环 `http ↔ session` 用「注册处理器」打破：`session.js` 末尾 `registerAuthHandler(relogin)`，`main.js` 副作用 import 它。**别去动这条线**，详见 `rule-auth-state`。
- `guards.js`（全局业务码守卫）沿用同一条注册路子：机制在 `services/http/guard.js`，`services/guards.js` 登记动作，`main.js` 第二条副作用 import 它——删掉后那些码只会当普通业务错误提示，同样**静默失效**。
- 接口 URL 统一登记在 `config/endpoints.js`（全项目唯一登记表，原 `services/http/endpoints.js` 已并入删除）—— config 在最底层，`services/session` 与 `api/` 都向下引它，不会形成 `api → http → session → api` 环。

## 页面层禁止清单（全项目唯一一份，10 条）

写页面时逐条对照，每条都可被一次 grep 证伪；正解在括号里，展开写法见对应 skill：

- ❌ `uni.request` 与裸接口路径 → `api/<domain>.js` + `curl`（`rule-api-request`）。
- ❌ `uni.navigateTo` / `redirectTo` / `switchTab` / `reLaunch` 与裸路径字符串 → `route.*`（`services/route.js`，见 `rule-page-services`）。
- ❌ `uni.showModal` / `uni.showToast` → `useModal` 的 `alert/confirm/settle` 或 `toast()`（`rule-page-services`）。
- ❌ `uni.showLoading` / `uni.hideLoading` → 请求传 `{ loading: true }`，非请求耗时用 `withLoading()`（`rule-page-services`）。
- ❌ `uni.setStorageSync` / `getStorageSync` → `services/storage.js`（key 由 `storageKey()` 统一加前缀，见 `rule-auth-state`）。
- ❌ `#ifdef` / `#ifndef` → `services/platform.js` 的 `isMP/isH5/isApp/getLayout()` 与能力标志（`rule-multiplatform`）；页面与业务组件一律不许写（现码页面层与 `components/` 实测零条件编译）。
- ❌ 裸色值、随手字号、随手间距 → Design Token（`rule-style-css`）。
- ❌ 字面量业务枚举（如 `item.status === 1`）→ 先进 `config/dict.js` 定义常量再引用。
- ❌ `this.$api` 之类全局属性挂载 → 一律显式 import（`main.js` 刻意不做全局挂载，为了让跳转与补全可用）。
- ❌ 手写 `v-if/v-else` 铺满「加载/空/失败/到底」四态 → `<app-list-state>` 直传 `useList` 状态（`rule-add-page`）。

## 常见改动落点速查

| 想做的事 | 改哪里 |
|---|---|
| 加一个接口方法 | `api/<domain>.js` 加方法；新域再去 `api/index.js` 加一行 `export` |
| 加一个页面 | 按 `rule-add-page` 的内置骨架**现写** `pages/<模块>/index.vue`（原 `pages/template/list.vue` 已删除，骨架与当前 `useList` 签名一致）＋ `pages.json` 注册；列表四态照 `pages/home/index.vue` 里 `<app-list-state>` 的真实用法 |
| 按模块分包 | 建 `packages/<模块>/<页>/index.vue`（分包页统一带 `/index` 目录形态）＋ `pages.json` 的 `subPackages`；现有 `packages/demo` 两页 |
| 换后端分页字段名 | `useList` 的 `pageNumKey` / `pageSizeKey`（默认已是 `page` / `page_size`，与现契约吻合，通常不用传），**不要改 useList 源码** |
| 后端返回结构不同 | `useList` 传自定义 `pick` |
| 加业务枚举/码值 | `config/dict.js`（页面里不写字面量数字） |
| 换环境 | 改仓库根 `.env.[mode]`（`development` / `production`）——`config/env.js` **只读 `import.meta.env`，不再有 `ENV` 开关行**；本机临时改地址/密钥写 `.env.*.local`（含 `VITE_API_KEY`，`.gitignore` 已忽略、禁止提交） |
| 改完怎么验（每批必跑） | `npm run verify:mp-weixin` ＋ `npm run verify:h5`（= `uni build --mode development`，dev 环境 host/密钥才可用）；`dev:*` 是 watch 开发、`build:*` 仅发布，不用作验证入口 |
| 改主色 | `common/css/theme.scss` + 同步 `config/theme.js`（两处一起） |
| 加一档间距/字号 | `theme.scss` 加变量 → `base.scss` 的 `$spacing-steps` 加值 |
| 加一个通用组件 | `components/<name>/<name>.vue`（见 `rule-ui-components`） |
| 加一个页面专用组件 | `pages/<page>/components/<name>/<name>.vue`（分包页为 `packages/<模块>/<页>/components/`）＋ 页面显式 import（不进 easycom）；现码两种形态都有：目录式与平铺单文件式 |
| 加/换一个 tab 页（tabBar **已启用**：5 个 tab 页） | `static/tabbar/` 放一对图标（常态 + `-active`）→ `pages.json` 的 `tabBar.list` 加项 → 同步 `services/route.js` 的 `TAB_PAGES`（漏同步则 `route.navigate` 不会自动走 `switchTab`） |
| 加跨页响应式状态 | 建 `store/<name>.js` + 在 `store/index.js` re-export |

## 本文件独有的补充

- ℹ️ **现状**：仓库不带 `.backup/` 模板页；需要表单/详情/上传写法时按 `rule-add-page` 的骨架现写，参考 `packages/demo/create`。
- ℹ️ **忘了某个基础设施怎么调就翻现役页**：登录 + 弹窗 + toast + 路由看 `pages/login/index.vue`；列表分页、`<app-list-state>`、`<app-refresher>`＋`scroll-view` 下拉、`app-modal`、分包跳转看 `pages/home/index.vue`；表单与 web-view 看 `packages/demo/*`。
- 🔧 **改完怎么验**：每批改动跑 `npm run verify:mp-weixin` ＋ `npm run verify:h5`（即 `uni build --mode development`，走 `.env.development`，host = 本地后端 `localhost:15000`，可与真接口联调）；`dev:*` 是 watch 开发（真机测试包来自其 `dist/dev/`），`build:*` 走 production 模式仅发布用，两者都不作验证入口。签名密钥 `VITE_API_KEY` 只写在 `.env.*.local`（不提交），换机器要先补该文件。**HBuilderX 不再作为编译入口**，工程也不允许「无构建链」口径。
- 为什么 `http ↔ session` 要绕一圈注册处理器：`api → http → 需重登 → session → 需 http` 会成环，用「注册 + `main.js` 副作用 import」打开；代价是删掉那行 import 会**静默失去自动重登且不报错**（详见 ARCHITECTURE §3.2）。
- 归类三问怎么用：先看有没有副作用（有 → `services/`），再看是不是纯计算（是 → `utils/`），最后看是否只在一页用（是 → 就地写，别抽）。三问都不满足的多半是 `composables/` 的料。

## 硬性禁令（MUST / MUST NOT）

> 原 `rules/scaffold-musts.md` §1 与 `rules/architecture.md` 总纲迁入，**本节是唯一权威**；收录标准：不看代码即可判定 + 违反代价大 + 换项目仍成立。

### 分层与归位
- 依赖只能单向向下：`pages|packages → composables → api → services → config|utils`；禁止反向调用、跨层调用、同级互相 import 成环。
- 归属用三问判定：有副作用（请求/存储/uni API/UI）→ `services/`；纯计算 → `utils/`；只在一页用 → 写在该页，不抽。
- 业务逻辑禁止写在 page 与 component 里；流程编排归 `composables/`，数据与副作用归 `services/`。
- 端差异只允许出现在 `services/` 与 `config/env.js`；`#ifdef` / `#ifndef` 只允许两个位置：`services/platform.js`、`config/env.js`——**页面与业务组件一律不许写**。
- 接口 URL 只写在 `config/endpoints.js`（2026-09-20 用户定：全项目路径集中一个文件，方便查看与修改）；`api/<domain>.js` 只放方法并引用常量（原因见 ARCHITECTURE §2）。
- 新增跨页响应式状态：建 `store/<name>.js` 并在 `store/index.js` re-export；禁止在组件里各自存一份全局态。
- **被两个以上分包用到的控件，必须提到主包 `components/app-*`**（easycom 自动注册、任何分包都能写标签）：**分包之间禁止互引**，这是唯一出路——别在第二个分包里再抄一份。先例 = `app-form-row` / `app-option-sheet` 由分包页内提升到主包，提完原目录那份已删、**不留两份**。
- **大体积纯数据表可以下放分包**（对「数据归 `config/`」的一处**明示例外**）：只有某个分包消费、且体量可观的静态数据（区划表 / 字典快照），放那个分包自己的 `config/` 下，别塞进主包 `config/`——主包每个用户都要下载。⚠️ 代价随之而来：**分包之间禁止互引**，主包与其它分包里的控件就引不到这张表了——只能把控件也搬过来、或反过来把表放主包（按「谁下载」权衡，别两边各存一份）。

- 服务端规则（权限、金额与状态流转、库存判断）禁止在前端重新实现一遍；前端判断只用于交互体验，不能作为安全边界。

### 架构总纲
- **分层**：`pages|packages → composables → api → services → config|utils`，依赖单向向下；禁止反向、跨层、同级成环。
- **职责**：页面只做「调接口 + 渲染 + 反馈」；业务规则与流程编排不得下沉到页面/组件；数据与副作用不得上浮到业务层。
- **收敛**：同一能力只允许一处实现（登录重登、loading、弹窗、路由、存储、色值、**数值归一与金额格式化**）。看到第二处实现就是重构信号，而不是「照抄那份」。
  - 数值 / 金额的现成实现就在 **`utils/number.js`**：`toNum`（空串·`null`·非数字 → `null`，**`0` 原样返回 `0`**）、`numOr`（缺值兜底）、`yuanToWanText`（元 → `¥x.xx万`，缺值印 `--` 而不拼成 `¥--万`）。api 层要按域的配置包一层薄包装就够（只传自己的单位 / 缺值文案），**不要再写一份逐字相同的 `toNum`**。

### 跨语言架构约束（后端 / 其它模块沿用）
- Repository / DAO 层只做数据存取，禁止业务逻辑；第三方服务必须封装，禁止业务代码直调。
- 禁止循环依赖；公共能力下沉到基础设施层或独立工具包。
- 模块划分判据：**能否共用一份业务逻辑描述** —— 能则是一个模块，只有各端完全独立设计两套规则时才拆成不同模块。

## 来源

提炼自 `docs/ARCHITECTURE.md`（§1/§2/§7）+ 实际目录结构核对；2026-09-10 并入原 `.claude/rules/scaffold-musts.md` §1 §2 与 `rules/architecture.md` 全部内容（rules 目录已删除）。文档更新后重跑 `project-skill-manager` 的 RULES-TO-SKILLS 流程同步。

**最后同步于 2026-09-22**：CLI + `src/` 口径全量校正（目录职责表、落点速查、tabBar 与环境切换按现码核对）；模板页已删，改指现写骨架与现役页；补 `npm run verify:*` 双端编译验证；`#ifdef` 白名单按 obd 页收敛后收紧为三处（`rule-multiplatform` 由另一会话同步，本文件只改白名单表述）。
