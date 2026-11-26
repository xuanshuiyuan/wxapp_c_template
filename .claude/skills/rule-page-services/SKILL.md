---
name: rule-page-services
description: 在本项目要弹提示框/确认框/需要用户选择后继续、控制 loading 转圈、做页面跳转或返回、处理 tabBar 切换与登录拦截跳转，或遇到"两个弹窗叠在一起""loading 关不掉""返回后白屏"时使用。给出 useModal、toast、route 三个统一入口的完整签名与队列/引用计数语义。
---

# rule-page-services

> **本文件含「硬性禁令」小节（原 `rules/scaffold-musts.md` §5 已迁入，唯一权威）。**

> **路径口径**（2026-09-20 起工程为 uni-app CLI + `src/` 结构）：本文件内不带前缀的模块路径（`services/` `store/` `config/` `components/` `composables/` `pages/` `packages/` `static/` `main.js` `pages.json` 等）**均相对 `src/`**（`@/` 别名 = `src/`）；`docs/`（`ARCHITECTURE.md` 等）与 `package.json` `.env*` 在**仓库根**，引用时不加 `src/` 前缀。

页面上的三类「副作用」各有唯一出口：**弹窗 → `composables/useModal`，轻提示与转圈 → `services/toast`，跳转 → `services/route`**。页面里不出现 `uni.showModal` / `uni.showToast` / `uni.showLoading` / `uni.navigateTo`。

## 用法约定

### 1) 弹窗：Promise 化，await 后才往下走

前提：页面模板里放一次 `<app-modal />`（渲染器，见 `rule-ui-components`）。

```js
import { alert, confirm, settle, MODAL_SETTLE } from '@/composables/useModal';   // 四个都从这里具名导出

await alert('保存成功');                                  // 字符串＝content，单按钮
await alert({ title: '提示', content: 'xxx', close: true });   // close:true → 卡片下方出现 ✕

if (await confirm({ title: '删除', content: '确定删除这条记录吗？' })) {
  await someApi.del({ id }, { loading: true });           // 返回 boolean：确定 true，取消/关闭 false
}

// 需要区分「确定 / 取消 / 点 ✕」时用 settle
const action = await settle({ title: '选择', content: '…', close: true });
// action: 'confirm' | 'cancel' | 'close'（常量在 MODAL_SETTLE）
```

配置字段（都有默认值，覆盖即可）：`title`('提示') `content`('') `showCancel`(false) `confirmText`('确定') `cancelText`('取消') `close`(false)。

**队列语义**：全局同时只显示一个，后来的排队；关闭后 `250ms`（等出场动画）才放下一个。所以
- 连续 `await` 多个弹窗是安全的，不会出现单例互相覆盖；
- 不想等就别 `await`，但顺序仍是调用顺序。

**`close` 的作用不只是显不显示 ✕**：只有 `close: true` 才允许点蒙层/点 ✕ 关闭，否则用户必须选按钮（防误触把确认框吞掉）。

### 2) toast 与 loading：引用计数，不用手写 hide

```js
import { toast, errorToast, successToast, showLoading, hideLoading, resetLoading, withLoading } from '@/services/toast';

toast('已复制到剪贴板');            // toast(message, icon='none', duration=2000)，返回 Promise（resolve 于消失后）
successToast('保存成功'); errorToast('格式不对');
await toast('提示后再继续');         // 想串行就 await

// 首选：让 http 层托管，页面完全不碰 loading
await someApi.save(data, { loading: true });

// 非请求型耗时任务
await withLoading(() => doSomethingSlow(), '处理中');     // 自动计数，异常也保证关闭

onUnload(() => resetLoading());      // 页面卸载兜底：计数漏减会让后面所有页面卡住转圈
```
计数归零才真正关闭，所以并发请求各自 hide 不会互相把别人的 loading 关掉。

**延迟显示 + 最短展示（2026-11-12 用户真机反馈「请求很快时 loading 一闪而过」后加）**：`showLoading` 不再立刻上屏，而是等 `SHOW_DELAY = 200ms`——请求在这之前结束就**一次都不渲染**（快请求全场景：gate 预检、按钮提交、点赞收藏类）；真的上屏后又保证至少停留 `MIN_VISIBLE = 300ms`，不会出现一帧就消失。两个值在 `services/toast.js` 顶部，引用计数语义不变，调用方 `{ loading: true }` / 局部 `<app-loading :show>` 的签名都不变。⚠️ 局部模式（`:show` 绑页面布尔量）**不走**这套延迟，快请求仍会闪，需要同样的观感就改用请求托管；`resetLoading()` 会同时撤掉两个定时器，页面卸载兜底照旧。

**渲染载体是 `<app-loading />`（每页放一次，同 `<app-modal />` 的规矩）**：`showLoading` 只写 `store/loading` 的 `loadingState`（组件挂载时 `addLoadingInstance()` 计数，`toast.js` 用 `hasLoadingInstance()` 判断这页有没有渲染方）。画面：`config/app.js` 的 `LOADING_IMAGE` **当前是空串 → 默认纯 CSS 品牌色转圈**（无网络依赖）；给它或组件 `image` prop 填 OSS 相对路径才上图（经 `utils/oss.js` 的 `ossUrl()` 拼域名，加载失败自动退 `LOADING_IMAGE_FALLBACK`）。当前页面没挂组件时 `toast.js` 自动降级 `uni.showLoading`，不会出现「发了没人渲染、卡死计数」——但降级是**静默**的，只有样式变旧、不报错，所以漏挂很难在真机外发现。

显示期间底层页面滚不动：触摸端靠组件根节点 `touchmove` 拦截，H5 桌面端滚轮/键盘靠 `platform.js` 的引用计数锁滚（与弹窗共用，叠开不互踩）。遮罩默认全透明只挡交互，要压暗传 `:mask="true"`（局部模式可用；全局模式走请求托管，需要暗遮罩时同样 `<app-loading mask />`）。

整页等待但不走请求托管时可用局部模式：`<app-loading :show="submitting" text="提交中" />`（`show` 显式传真/假即切局部模式，默认 `null` 才是全局模式）。局部与全局**可以同页共存两个实例**（`pages/home/index.vue` 即如此：一个跟本页 `isLoading` 做首屏转圈、一个不带 `show` 接请求托管，两段时间不重叠）。模块内小转圈用 `u-loading-icon`，列表首屏用 `app-skeleton`，都别拿全屏 loading 凑数（props 全表见 `rule-ui-components`）。

> **⚠️ 跨页 loading 泄露（2026-09-23 踩坑）**：tabBar 页（如首页）`navigateTo` 子页后，tabBar 页**不销毁**，其上的全局 `<app-loading />`（尤其是 `:mask="true"`）仍在监听 `loadingState`。此时若子页请求带上 `{ loading: true }`，loading 遮罩会渲染在**底层的 tabBar 页**上，用户看到子页内容被底页的暗遮罩盖住。
> **修法**：子页请求不要用全局 `{ loading: true }`。如果页面有自己的 article/loadError/notFound 等三态渲染逻辑，改局部 `<app-loading :show="localLoading" text="加载中..." />` 驱动，不走 `loadingState`。见 `news/detail/index.vue` 2026-09-23 修复：`{ loading: true }` → `<app-loading :show="pageLoading" />` + `try/finally { pageLoading.value = false }`。

### 3) 路由：路径集中，空栈有兜底

```js
import { route, requireLogin, HOME_PAGE, TAB_PAGES, VALUATION_PAGE,
         VALUATION_RESULT_PAGE, BIND_CAR_PAGE, OBD_PAGE } from '@/services/route';

route.to(VALUATION_RESULT_PAGE, { unique_id });  // 压栈；命中 TAB_PAGES 自动改用 switchTab（路径一律引 route.js 常量）
route.redirect(BIND_CAR_PAGE, { unique_id });    // 关闭当前页再跳
route.tab(HOME_PAGE);                            // 显式回 tabBar 页（也可直接 route.to(VALUATION_PAGE)，会命中 TAB_PAGES 自动 switchTab）
route.relaunch();                                // 关闭所有页面（默认 HOME_PAGE）：登录失效/切身份/绑车盒成功回首页
route.back();                                    // 返回；页面栈为空时（H5 直开链接、分享落地页）回落首页，不白屏
route.back(MINE_PAGE);                          // 自定义兜底页

if (!requireLogin()) return;                     // 未登录 → route.relaunch(LOGIN_PAGE)；requireLogin({ silent: true }) 只判不跳
```
- 路径**前导斜杠可省**（内部 `normalize()` 会补），query 传对象即可（内部走 `toQueryString`）；五个方法 `to / redirect / tab / relaunch / back` 都接受第三个 `options` 透传给 uni API。
- **`TAB_PAGES`** = `[HOME_PAGE, MINE_PAGE]`，与 `pages.json` 的 `tabBar.list` 一一对应；新增/删除 tab 必须两处同步，否则 `route.to` 对 tab 页用 `navigateTo` 失败。

**跨页路径常量现状**（`services/route.js` 是唯一登记表，**新增页面跳转必须在此登记常量，页面里禁止写路径字面量**）：

| 常量 | 路径 | 说明 |
|---|---|---|
| `HOME_PAGE` | `/pages/home/index` | 首页（tabBar），也是 `relaunch`/`back` 的默认兜底 |
| `MINE_PAGE` | `/pages/mine/index` | 我的（tabBar） |
| `LOGIN_PAGE` | `/pages/login/index` | 登录页（`requireLogin` 的目标） |
| `DEMO_CREATE_PAGE` | `/packages/demo/create/index` | demo 新建表单（分包） |
| `DEMO_WEBVIEW_PAGE` | `/packages/demo/webview/index` | demo 文档预览（web-view，query `url`） |

## 目录约定

| 能力 | 位置 | 备注 |
|---|---|---|
| 弹窗调用 | `composables/useModal.js` | 页面只 import 这个 |
| 弹窗状态机 + 队列 | `store/modal.js`（`modalState/pushModal/settleModal`） | **页面不要直接碰**，`store/index.js` 的 re-export 只为调试 |
| 弹窗渲染 | `components/app-modal/app-modal.vue` | 每页放一次 `<app-modal />` |
| loading 渲染 | `components/app-loading/app-loading.vue` | 每页放一次全局模式 `<app-loading />`（按钮发请求的页要 `:mask="true"`） |
| 轻提示/loading | `services/toast.js` | 引用计数与原生降级在这里 |
| 跳转 | `services/route.js` | 五个方法 + `requireLogin` + **全部跨页路径常量**（`HOME_PAGE`/`TAB_PAGES`/`LOGIN_PAGE`/分包四页…）都在这一个文件 |

新加一类需要跨页协作的 UI 状态（比如全局通知栏）：`store/<name>.js` 写状态机 + `components/<name>/` 写渲染 + `composables/use<Name>.js` 做调用入口 —— 照 `modal` 这三件套的形态。

## 本文件独有的说明

- 「提示后离开」的串行写法：`await toast('已删除'); route.back();`（`toast()` 返回 Promise，resolve 于提示消失后）。
- 登录页已落地（`pages/login/index`）：`requireLogin()` 未登录走的是 `route.relaunch(LOGIN_PAGE)`（清栈，避免登录后退不回原处），不再是早期口径的「只 toast 一句」。跳登录的**目标路径只有 `LOGIN_PAGE` 一个常量**，要改跳法只动 `services/route.js` 一处。
- 模板只有登录门槛；若以后加「绑手机」等二级门槛，在 `services/session.js` 里实现 `ensureXxx()`（弹框 → 确认后 `route.to`），页面只 `await` 和 `return`，逻辑见 `rule-auth-state`。
- 列表失败默认不弹 toast 是刻意的（`useList` 的 `toastOnError: false`），错误进 `error` 状态由页面重试 UI 承担。
- 新加一类跨页协作的 UI 状态，照 `modal` 三件套形态：`store/<name>.js` 状态机 + `components/<name>/` 渲染 + `composables/use<Name>.js` 调用入口。
- `route.back()` 的空栈兜底是为 H5 直开链接 / 分享落地页准备的（`pages.length > 1` 才 `navigateBack`，否则 `reLaunch` 兜底页）；`TAB_PAGES` 已随 tabBar 启用填好两个 tab，改动只发生在 `pages.json` + `services/route.js` 两处。

## 硬性禁令（MUST / MUST NOT）

> 原 `rules/scaffold-musts.md` §5 迁入，**本节是唯一权威**：

- 弹窗只用 `useModal`（`await` 后才继续）；禁止绕过它直接 import `pushModal`（会丢掉 Promise 包装）。唯一例外：**`services/` 层文件**（现为 `services/guards.js` 的全局业务码守卫）—— services 层不允许反向 import composables，直接 `pushModal` 拿队列 Promise 属既定设计；页面/组件/composable 一律不在此列。
- 每页模板必须放一次 `<app-modal />`，否则弹窗不渲染。
- 每页模板必须放一次 `<app-loading />`（全局模式，不带 `show`），否则该页请求 loading 走原生降级样式。
- **tabBar 页 navigateTo 的深层子页，请求禁止用 `{ loading: true }`**（上方「跨页 loading 泄露」说明）：tabBar 页不销毁，全局 loadingState 会被底页的 `<app-loading>` 消费，暗遮罩盖在底页而非子页上。改用局部 `<app-loading :show="localLoading" />` 驱动。
- **按钮点击请求 = 双保险**（用户定 2026-09-21）：按钮/热区点击发起的接口请求必须同时有 ① 请求层 `{ loading: true }` 托管全局 loading（请求侧口径见 `rule-api-request`）② 按钮自身 in-flight 态——进行中标志防重入 + 转圈/换态反馈，两个状态同一调用点同起同收（finally 归位）。走请求托管的页面一律挂 `<app-loading :mask="true" />`：暗遮罩明示「进行中不可操作」；透明层虽也挡误点，但用户不知道页面被锁（P1/P3/P4 三页已按此收口，新页照办）。
- 确认类弹窗保持 `close: false`（必须选按钮，防误触吞掉确认）；只有纯信息展示才开 `close: true`。
- 「提示后再离开」必须 `await toast(...)` 再 `route.back()`。
- tabBar 已启用（五个 tab），增删 tab 页必须同步维护 `services/route.js` 的 `TAB_PAGES`（否则 `route.to` 对 tab 页用错 API）。
- **多步流程的「完成页」必须 `reLaunch` 清栈，不能用 `redirect`**（2026-10-29 v1.0.19 实证）：`redirect` 只换掉当前页，链路里更早的中间页（如 S4 车牌查车型 → S5 选配置 → S3 表单 → 成功页）仍在栈里，从成功页返回就能回到中间页继续下一步（用户实报「发布成功了还能一直返回」）。判据：**从完成页返回，不应能到达任何「还能再提交/再走一遍」的页面**。
- **单字段独立页可直接用页内 `<input>`**（2026-10-29 改价页定）：被禁的是**弹框 / 底部抽屉里的输入**（键盘顶起、样式不可控）；一张整页、且只有这一个输入项时（如改价）直接页内输入 + 进页自动弹键盘，不再二次跳 `field-editor`。多字段表单仍一律跳页。页内 input 挂 `confirm-type="done"` + `@confirm` 提交（**多行 textarea 不挂**，回车留给换行）；⚠️ `confirm-type` 仅 `type="text"` 生效、iOS 数字键盘无回车键——自动 focus + `footer-bar` 固定底栏的组合必须真机验提交按钮不被键盘压住。判据全文见 `rule-ui-components` 硬性禁令。

## 来源

提炼自 `docs/ARCHITECTURE.md` §2（composables/store/toast/route）+ `composables/useModal.js`、`services/{toast,route}.js`、`store/modal.js`、`components/app-modal/app-modal.vue` 的真实默认值与签名核对；2026-09-10 并入原 `.claude/rules/scaffold-musts.md` §5（rules 目录已删除）。2026-09-22 按代码全量重校：`pushModal` 直用的豁免名单补 `services/session.js`（原只写 guards.js）；`route.js` 补跨页常量现状表并清掉已删除的示例路径（`pages/index/index`、`pages/template/list`）；`TAB_PAGES` 由「空数组」改正为已启用五个 tab；登录页口径由「无独立登录页」改正为 `requireLogin → relaunch(LOGIN_PAGE)` 并补绑手机门槛分工；`<app-loading />` 画面口径改正（`LOADING_IMAGE` 现为空串 → 默认纯 CSS 转圈）与局部/全局双实例共存说明；路径补 `src/` 总说明。**2026-11-25 补键盘口径**：页内 input 挂 `confirm-type` + `@confirm`，iOS 数字键盘无回车键 + 固定底栏为真机风险组合。
