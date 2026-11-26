---
name: rule-ui-components
description: 在本项目写界面 UI、要选组件（按钮/输入/弹窗/列表/表格/上传/日期/轮播…）、要封装自定义公共组件、或发现 uview 组件不生效/easycom 报错时使用。规定先查 docs/uview-plus-components.md 速查表再造轮子、easycom 免 import 规则、color 类 prop 必须走 config/theme.js、项目自有 app-* 组件的真实 props，以及自定义组件的目录与命名约定。
---

# rule-ui-components

> **本文件含「硬性禁令」小节（原 `rules/scaffold-musts.md` §7 已迁入，唯一权威）。**

> **路径口径**（2026-09-20 起工程为 uni-app CLI + `src/` 结构）：本文件内不带前缀的模块路径（`components/` `pages/` `packages/` `static/` `config/` `services/` `composables/` `styles/` `common/` `main.js` `pages.json` 等）**均相对 `src/`**（`@/` 别名 = `src/`）；`docs/`（`uview-plus-components.md`、`ARCHITECTURE.md`）与 `package.json` `.env*` 在**仓库根**，引用时不加 `src/` 前缀。

**造任何 UI 之前，先翻 `docs/uview-plus-components.md`**（139 个内置组件按 6 类速查，从源码 JSDoc 生成，标了本项目已用哪些）。本项目的原则是：视觉控件一律用 uview-plus，自己的组件只做「状态编排 + 委托渲染」，不重复实现按钮/输入框/空态这类东西。

## 用法约定

### 1) 组件怎么引：easycom，不 import

`pages.json` 已配：
```json
"easycom": { "autoscan": true,
  "custom": { "^u--(.*)": "...", "^up-(.*)": "@/uni_modules/uview-plus/components/u-$1/u-$1.vue",
              "^u-([^-].*)": "@/uni_modules/uview-plus/components/u-$1/u-$1.vue" } }
```
- `<u-xxx>` / `<up-xxx>` 直接写，**不需要 import**；`main.js` 里也不再 `app.component()`。
- 项目自有组件同理自动注册（`components/app-xxx/app-xxx.vue` 目录名 = 标签名）：`<app-modal />` `<app-skeleton />` `<app-list-state />` `<app-loading />` `<app-navbar />` `<app-refresher />` `<app-score-ring />` `<app-plate-keyboard />` `<app-safety-band />`。
- `main.js` 只装插件：`app.use(uviewPlus)`（这是唯一必要的注册，个别全局方法如 `uni.$u` 依赖它）。

### 2) 场景 → 先考虑这些组件

| 要做的东西 | 首选 |
|---|---|
| 按钮 | `.btn` 版式块（脚手架统一观感）或 `u-button`；行内小按钮 `.btn--sm`，主 CTA `.btn--lg btn--block` |
| 文字/图标/图片 | `u-icon` / `u-image`（带加载失败兜底）/ `u-text` / `u-avatar` / `u-tag` / `u-badge` |
| 输入 | `u-form` + `u-form-item` + `u-input` / `u-textarea`（自带字数校验） |
| 选择 | `u-select`（本地数组）/ `u-picker`（多列）/ `u-datetime-picker` / `u-calendar` / `u-cascader` / `u-radio(+group)` / `u-checkbox(+group)` / `u-switch` / `u-subsection` / `u-slider` / `u-rate` / `u-number-box` |
| 搜索 | `u-search` —— ⚠️ 先确认后端支持关键词字段（当前后端列表接口无 keyword 参，见 `rule-api-request` 实测契约） |
| 弹层容器 | `u-popup`（上下左右中，内容自绘）/ `u-action-sheet` / `u-modal`（**确认框别用它，见下**） |
| 提示反馈 | `u-toast` / `u-notify` / `u-alert` / `u-empty` / `u-no-network` / `u-overlay` / `u-tooltip` / `u-popover` |
| 列表结构 | `u-cell` + `u-cell-group`（设置页那种一行一项）/ `u-collapse` / `u-swipe-action`（左滑删）/ `u-divider` / `u-gap` |
| 长列表性能 | `u-list` / `u-virtual-list` / `u-refresh-virtual-list`（几千条必须用，不能一次渲染完） |
| 布局 | `u-row` + `u-col`（12 分栏）/ `u-grid` + `u-grid-item` / `u-box` / `u-sticky` / `u-safe-bottom` / `u-status-bar` / `u-transition` / `u-back-top` |
| 数据展示 | `u-card` / `u-table`(`u-tr/u-th/u-td`) / `u-swiper` / `u-scroll-list` / `u-waterfall` / `u-album` / `u-tabs` / `u-navbar` / `u-tabbar` / `u-steps` / `u-index-list` / `u-dropdown` / `u-pagination` |
| 进度/数值 | `u-line-progress` / `u-circle-progress` / `u-count-to` / `u-count-down` |
| 富文本/特殊 | `u-parse`（HTML）/ `u-markdown` / `u-read-more` / `u-qrcode` / `u-barcode` / `u-poster` / `u-cropper` / `u-canvas` / `u-copy` |
| 上传 | `u-upload`（配 `curl.upload`，见 `rule-api-request`） |

### 3) 组件的颜色：只从 `config/theme.js` 拿

uview 的 `color` / `textColor` / `iconColor` / `activeColor` 这类 prop **只收字符串**，读不到 SCSS 变量，所以有 JS 镜像：

```js
import { theme } from '@/config/theme';
<u-icon name="info-circle-fill" :color="theme.primary" />
<u-empty :icon-color="theme.iconPlaceholder" :text-color="theme.textMuted" />
```
可用键（与 `config/theme.js` 逐项核对，共 29 个；2026-10-29 换肤后重校）：

- 主色：`primary`(**#1FBF8F 薄荷绿，真源**) `primaryDark`(#12A276) `primaryLight`(#E6F8F1) —— 新代码优先写这三个
- 历史名（**别删也别改名**，全仓旧引用绑在它们身上）：`brandYellow` = `primary` · `brandYellowDark` = `primaryDark` ·
  `brandRed`(#EF4444 价格/强调数字) · `brandOrange`(#0E9B72 **只给数值强调**；暖色语义请取 `warning`)
- 语义色：`success`(#16A34A) `warning`(#F0A22E，**与 brandOrange 已拆开**) `danger` `info` `track`(#2F7FE0 地图 polyline)
- 文字：`textTitle textMain textSub textMuted textDisabled textInverse textOnYellow`（`textOnYellow` = **主色底上的白字** #FFFFFF）
- 背景/填充：`bgPage bgCard bgFillWeak bgFillChip bgFillIcon` + `navSolid`(#E9F4EF 导航栏/tabBar/窗口底色)
- 描边与其它：`border divider bgHover iconPlaceholder`

**样式表里**（`<style scoped>`）反过来：用 SCSS 变量 `$color-primary`，**不要** import `theme.js` 去拼字符串。改主色时 `common/css/theme.scss`（真源）和 `config/theme.js`（镜像）**两处一起改**。

不需要传色的场景：主色/文字色/边框色已被 `base.scss` 里 `page { --up-primary: … }` 覆盖，按钮、开关、选中态**自动跟项目 token**，别逐个组件传色。

### 4) 项目自有组件（`components/`，easycom 自动注册，别重写）

全部为 `components/<name>/<name>.vue`，页面直接写标签、无需 import：

| 组件 | 用途 | 关键 props / 事件 |
|---|---|---|
| `<app-modal />` | 全局弹窗渲染方，配合 `composables/useModal` | 每页挂一次；`close: true` 才允许点蒙层关闭 |
| `<app-toast />` | 全局 toast 渲染方，配合 `services/toast` | 每页挂一次；未挂时自动降级 `uni.showToast` |
| `<app-loading />` | 全屏 loading 渲染方 | `show`(默认 null=全局模式)、`text`、`image`、`mask`(默认 false) |
| `<app-skeleton />` | 骨架屏（包装 u-skeleton） | `loading`、`type`(list/card/text)、`rows`、`count`、`animate` |
| `<app-list-state />` | 列表四态编排：骨架→空→失败→加载更→到底 | 直传 useList 的 `firstLoading/empty/error/loading/finished`；`@retry` |
| `<app-navbar />` | 自绘顶栏（pages.json `navigationStyle: custom`） | `title`、`showBack`、`backFallback`；高度问 `platform.getLayout()` |
| `<app-refresher />` | 下拉刷新指示器（三段态 + 自带浮层壳） | 配合 `usePullRefresh`：`show/state/lastAt/offset` |
| `<app-cta />` | 主 CTA 按钮 | `text`、`syncText`、`loading`、`@tap` |
| `<app-form-row />` | 表单行（左标签 + 右值/箭头） | `label/required/value/placeholder/arrow/unit/missing/divider`；prefix/suffix 具名插槽 |
| `<app-option-sheet />` | 单选选项底部抽屉 | `show/title/options/current`；`@pick`、`@update:show` |

要点：

- 三个全局渲染器（modal / toast / loading）**每个页面模板各挂一次**；缺 toast/loading 时服务层会降级原生，但不推荐。
- `app-list-state` 的状态优先级在组件内定义一次，页面不要自己写 v-if-v-else 状态链。
- `app-navbar` 的栏背景必须与 `pages.json` 窗口底色同值（`$nav-solid`），否则下拉回弹露色差。
- `app-refresher` 的状态由 `usePullRefresh` 给，页面不自己存进行态；浮层壳已内聚，不要再包 wrapper。
- `app-cta` 是单根满宽盒：调用方宿主必须是块级 + width:100%，不要塞进 flex 居中容器。
## 本文件独有的坑

- `u-section` 这个坑长什么样：`components/u-section/` 下只有 `section.js`（props 定义）、**没有 `.vue`**，easycom 解析不到且**不报错**，表现为整块标签凭空消失。同类问题用「先放一个显眼组件试渲染」定位。
- 属性/事件全量以官网为准：<https://uview-plus.jiangruyi.com/components/intro.html>；速查表只帮你选型，签名不清就读 `uni_modules/uview-plus/components/u-xxx/u-xxx.vue` 的 props（带 JSDoc）。
- 项目自有 `app-*` 组件分两形态：状态编排类（modal / skeleton / list-state / loading）自己不画按钮、输入框、空态，可见态一律来自 store（`modalState` / `loadingState`）再由组件渲染或委托 uview；视觉自绘类（navbar / refresher / score-ring）只服务于 HUD 座舱语言，样式尺度跟 `rule-style-css` 尺度表，色值靠 `theme.scss` token。
- `app-skeleton` 的灰块色靠 `--up-skeleton-bg-color` / `--up-skeleton-shimmer-color` 映射 token（`u-skeleton` 内部读这两个变量），换色板时骨架自动跟色，不用改组件。

## 硬性禁令（MUST / MUST NOT）

- **跨分包共用的组件必须放主包 `components/app-*`**：分包之间禁止互引；同一形态在 ≥2 个分包要用时就提升。
- 写任何 UI 前先查 `docs/uview-plus-components.md`（存在时）；禁止重复实现 uview 已有的视觉控件。
- 组件一律走 easycom（`u-*` / `up-*`、`components/<name>/<name>.vue`）；禁止手工 import 注册与 `app.component()`。
- 组件的 `color` 类 prop 只收字符串 → 取 `config/theme.js`；样式表里用 SCSS 变量，禁止 import `theme.js` 拼字符串。
- 禁止修改 `uni_modules/uview-plus` 源码；定制走 prop、插槽，或外层包一个 `app-*` 组件。
- ⚠️ **`u-popup` 的根节点自带 `flex: 1`**：作为 `.hud-page`（flex 列）直接子项时会与滚动区瓜分高度。
  已由 `styles/scaffold.scss` 的 `.u-popup { flex: none !important; }` 全局兜住；新页不要再包宿主，
  也不要引入其它自带 `flex: 1` 的弹层/容器根节点。小程序端样式隔离可能让该规则打不到内部节点，
  退路是给弹层传 `class`（页面样式能命中宿主）或页面侧包一层不增长的 `view`。
- **分隔线不要靠跨实例的兄弟选择器**：行/项是自定义组件时，两个实例内部根节点隔着各自宿主、不是相邻兄弟
  （MP 端宿主是真实元素，H5 侧不产生宿主 DOM）→ `.a + .a` 真机不生效。行是组件时由组件按 prop 画线
  （`app-form-row` 的 `divider`），调用方给分组内第 2..n 行显式传。
- **会弹软键盘的输入不进弹层**：
  - 多字段表单 → 独立整屏页；目标是独立页且只有一个输入项 → 页内直接 `<input>`，不要二次跳转。
  - 纯选择 / 确认 / 单选 → 弹层优先（`u-popup` / `u-picker` / `app-option-sheet`）。
  - **弹层里永远不放 `<input>` / `<textarea>`**——微信 `adjust-position` 会把 fixed 弹层顶飞。
- **页内 `<input>` 挂 `confirm-type` + `@confirm` 提交**（进页自动 focus 尤其）：键盘完成键直接提交，
  避免下方确认按钮被顶出可视区。⚠️ 微信端 `confirm-type` 仅 `type="text"` 生效，iOS 数字键盘无回车键，
  数字/金额档不能依赖键盘提交。多行 `textarea` 不挂（回车留给换行）。
- **默认插槽是「默认内容」的 fallback——传了就顶掉**：附加件（芯片 / 徽章 / 单位）走 prop 或具名插槽。
- 禁用 `u-section`（当前版本无 `.vue` 实现，easycom 解析不到，静默不渲染）。
- 复用判据：同一段结构出现在两页 → 样式进 scaffold；只是逻辑重复 → 抽 `composables/`；真独立可复用才建组件。

## 来源

对照 `components/app-*.vue` 的真实 `defineProps`、`pages.json` easycom 配置、`config/theme.js` 可用键整理。
