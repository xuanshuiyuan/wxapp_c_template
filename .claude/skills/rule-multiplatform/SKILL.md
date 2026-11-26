---
name: rule-multiplatform
description: 在本项目需要区分运行端（微信小程序/H5/App）、遇到某端表现不一致（H5 正常小程序空白、样式错位、滚动异常）、H5 调试接口报网络错或空 404、需要做状态栏/导航栏/底部安全区适配、或考虑写 #ifdef 时使用。规定 #ifdef 只允许出现的两个位置、platform.js 的端判定与布局接口（含**能力分档范式：扫码 SCAN_MODE**）、**跨端定位 getCurrentCoord 的降级口径**、构建与编译验证口径（验证必用 dev 环境 verify:*、`dist/build` 覆盖陷阱）。
---

# rule-multiplatform

> **本文件含「硬性禁令」小节（原 `rules/scaffold-musts.md` §8 已迁入，唯一权威；其内容本就与下文高度重合，此处收敛为清单）。**

同一套代码跑 **微信小程序 / H5 / App** 三端。规则只有一句：**端差异只允许出现在 `src/services/` 和 `src/config/env.js` 这一层，页面里永远不出现 `#ifdef`。**

> **路径口径**：本文件内不带前缀的模块路径（`services/` `config/` `components/` `pages/` `packages/` `static/` `App.vue` `pages.json` `manifest.json`）**均相对 `src/`**（`@/` = `src/`）；`package.json`、`.env*`、`dist/`、`README.md` 在仓库根。

## 用法约定

### 1) 判断端：调 platform.js

```js
import { RUNTIME, isMP, isH5, isApp, getLayout, systemVersionGte, callPhone, vibrateLight, lockPageScroll, unlockPageScroll } from '@/services/platform';

if (isH5) { /* 浏览器专属逻辑 */ }
RUNTIME   // 'mp' | 'h5' | 'app'（其余小程序端按 mp 分支处理）
```
`callPhone(number)` 是拨打电话的唯一出口（H5 走 `tel:` 协议，页面不再直调 `uni.makePhoneCall`）；
`systemVersionGte('14.05')` 用于低版本降级判断；
`vibrateLight()` 是「操作到手」的轻震反馈出口（扫码识别成功、关键动作完成这类；微信 `type:'light'`、App 默认短震、**H5 静默跳过**），页面禁止直调 `uni.vibrateShort`；
`lockPageScroll()` / `unlockPageScroll()` 全屏浮层锁底层滚动，**引用计数**（弹窗 + loading 各占一票），禁止组件里自写 `#ifdef H5` 或直接改 `document.body.style`。

### 1.5) 优先用「能力分档」而不是「判端」

`isMP/isH5/isApp` 适合"这一端整体走另一条路"的场景；**同一件事在各端能力不同、还要叠加版本降级时，把它封成一个能力常量 + 几个能力口**，页面只消费标志，不出现端名。现成范本 = 扫码（见 §1.6）。这样页面里没有端语义，加一端只改 `platform.js`。

### 1.6) 扫码能力分档 `SCAN_MODE`（通用能力范本）

```js
import { canScan, canInlineScan, authorizeCamera, scanCodeSystem, openCameraSetting } from '@/services/platform';
```
| 导出 | 含义 |
|---|---|
| `SCAN_MODE` | `'camera'` 页内全屏取景层就地扫 / `'system'` 系统全屏扫一扫 / `'none'` 无扫码能力（只剩手输）——进程内算一次 |
| `canScan` | 有没有扫码入口（H5 = false，扫码卡整块 `v-if` 掉） |
| `canInlineScan` | 能不能页内就地扫（true 才挂全屏相机层） |

分档判据全在 `platform.js` 内：H5 无相机权限模型 → `none`；App 端 `camera` 的 `scanCode` 模式表现不稳 → `system`；
微信小程序按**基础库版本**决定（`camera mode=scanCode` 认一维条形码需 ≥ **2.27.1**，一维码场景在低版本就地扫永远不出结果）→ `camera` 或降 `system`；其余小程序端 `camera` 口径不一 → `system`。
配套三个能力口：`authorizeCamera()` → `Promise<boolean>`（先显式拿 `scope.camera`，别靠 camera 组件自己弹框，被拒后页面没有引导位）、`scanCodeSystem()` → `Promise<string>`（取消/失败回空串，属正常路径）、`openCameraSetting()` → `Promise<boolean>`（设置页开回权限后续扫）。

**页面侧写法**（业务页示例）：扫码卡 `v-if="canScan"`、取景层 `v-if="scanning && canInlineScan"`、相机处理函数**全端定义**（非就地扫端 `scanning` 恒 false，它们是死代码）。
代价 = `<camera>` 标签会进 H5/App 产物（`v-if` 为假不渲染，只多几个组件标记），换来 = 页面链路零条件编译。

🔬 **同层渲染下手势归相机（2026-09-22 真机两轮实验定档，别再踩）**：
全屏取景层 `<camera>` 的**任何祖先节点都不许挂 `@touchmove.stop.prevent`（= `catchtouchmove`）**。
挂了之后的现象是「双指缩放毫无反应」——父层 catch 并 `preventDefault()` 掉 touchmove 序列，
原生相机的缩放手势识别收不到事件；**而给浮层加 `pointer-events: none` 救不了**（实验证过，无效）。
- 想防底层页面跟着滚：只准把 `catchtouchmove` 加在**不覆盖取景区**的局部（如屏底按钮条、成功后压在上面的确认层）。
- 覆盖在取景区上的纯视觉浮层（括号/扫描线/芯片/文案）保留 `pointer-events: none` 是好习惯，但**它不是解决方案**，别拿它去顶替摘除祖先的 catch。
- 同类陷阱推广到任何"原生组件 + 自绘浮层"组合（map、video、camera）：**祖先层的手势拦截会静默废掉原生交互**，出问题先往这查。
> ⚠️ 2026-09-22 变更：本页原有 **11 处页内 `#ifdef`** 违反禁令，本批按上述方式全部收敛进 `platform.js`。**新增端差异时照这个范式做，不要退回页内 `#ifdef`。**

### 1.7) 定位取坐标：只经 `services/location.js` 的 `getCurrentCoord()`

```js
import { getCurrentCoord } from '@/services/location';
const coord = await getCurrentCoord();        // { longitude, latitude } | null
const fresh = await getCurrentCoord({ force: true });  // 绕过会话缓存重定位（当前无调用方需要）
```

| 口径 | 为什么这么定 |
|---|---|
| **坐标系统一 `type: 'gcj02'`** | 国内逆地理/地图服务与后端图商同口径；坐标口径必须单一，否则后端排查时对不上 |
| **回包字段名沿用 `longitude`/`latitude`** | 本层不做业务侧改名。**调接口时按契约组装**（如契约要 `lon`/`lat`，转换发生在消费方，不在本层） |
| **会话级缓存 + 单飞** | 城市不随 tab 切换变化，一次冷启动定位一次就够（省电、不反复唤起系统定位）；onShow 与下拉刷新同刻并发也只发一次系统调用 |
| **失败一律回 `null`，禁止上抛** | 拒权 / 平台不支持（H5 非安全上下文、App 未配定位模块）/ manifest 未声明，全部降级为 `null` 由调用方兜底 —— 定位常是装饰位的前置，**异常不许扩散进页面主流程** |

**页面侧必须准备的降级链**（拒权/超时 → 用默认值或隐藏该模块，不阻断主流程）：
拿到坐标 → 用坐标；拿不到 → 回落配置里的兜底城市；连兜底也缺 → **整段隐藏**（不占位、不出 `--`）。

**两个外部前提（不是代码能保证的，缺了就恒走兜底）**：
① `src/manifest.json` 的 `requiredPrivateInfos` 必须含 `"getLocation"`；
② 微信公众平台侧的 **接口权限申请 + 隐私指引声明**。
真机表现"永远拿到的是同一个城市"时，先查这两项，别去翻业务代码。

### 2) 布局尺寸：只问 getLayout()（进程内算一次并缓存）

```js
const { statusBarHeight, navBarHeight, customBarHeight, capsuleReserve, tabBarOverlay, safeBottom, isNotch, windowWidth, platform } = getLayout();
```
| 字段 | 说明 | 注意 |
|---|---|---|
| `statusBarHeight` | 状态栏高度 | **H5 恒为 0**（改用 CSS `env()`） |
| `navBarHeight` | 自定义导航栏内容区高度 | 小程序按胶囊算：`(capsule.top - statusBar) * 2 + capsule.height`，默认 44 |
| `customBarHeight` | 状态栏 + 导航栏总高 | 自绘顶栏时内容顶部要让出这个值 |
| `capsuleReserve` | 自绘顶栏右侧要给微信胶囊让出的宽度（px） | 非微信端恒 **0**；公式 = `屏宽 - capsule.left + 8`（`app-navbar` 用它预留位） |
| `tabBarOverlay` | tabBar 页内覆盖高度（px） | **H5/App = 50**（tabBar 是 webview 内 fixed 浮层，页面底部要自让位）/ **MP = 0**（原生栏不占 webview）；首页写进 `--tab-overlay` 给 `.hud-page__body` 用 |
| `safeBottom` | 底部安全区 | **H5 恒为 0**（用 CSS `env(safe-area-inset-bottom)`） |

### 3) 底部安全区：唯一走 `$safe-bottom` 常量（+ 底栏下边距走 `$bottom-bar-gap`）

值定义在 `common/css/theme.scss`（经 `uni.scss` 注入，全端可用）：

```scss
$safe-bottom: env(safe-area-inset-bottom);   // 底部 home indicator —— 唯一定义处
$safe-top:    env(safe-area-inset-top);      // 顶部状态栏（只有扫码头这类顶到边的浮层用）
$bottom-bar-gap: $sp-2;                      // 16rpx —— 固定底栏下边距（非安全区那一段），规定死
```

| 场景 | 做法 |
|---|---|
| 有底部操作栏 | 套 scaffold 的 `.footer-bar`（已算进两个常量），别自己拼 padding |
| **自己写固定底栏** | **必须两行**：`padding-bottom: $bottom-bar-gap;` + `padding-bottom: calc(#{$bottom-bar-gap} + #{$safe-bottom});` —— 值不许改 |
| 压底浮层按安全区起算 | `bottom: calc(#{$safe-bottom} + 220rpx)`，**前面必须再来一行 `bottom: 220rpx;`** |
| 压底浮层按安全区起算 | `bottom: calc(#{$safe-bottom} + 220rpx)`；顶部同理 `top: calc(#{$safe-top} + 130rpx)` |
| 长文正文的底部留白（非底栏） | `padding-bottom: calc(#{$sp-6} + #{$safe-bottom})`（`agreement` 一例：那是排版留白，不是按钮贴底距离） |

结论（2026-10-20 用户两次要求：先「安全区的距离统一」，再「这个距离整个项目都需要一致，用常量、
规定死」）：

1. **安全距离只有 `$safe-bottom` / `$safe-top` 一个来源**——凡要留安全距离处都必须算进它们，
   禁止在页面 / 组件里手写 `env()` / `constant()`（此前写法分叉：有的双声明、有的只 `env()`
   连回退都漏、有的干脆没算，已全部收敛）。唯一例外是三方组件自带的安全区开关
   （`u-popup` 的 `:safe-area-inset-bottom="true"`），那是库内实现，照旧传 `true`。
2. **`calc()` 里混 `rpx` 与 `env()` 必须带纯 rpx 回退行**：小程序端这种混合写法兼容性不可靠
   （v1.0.9 行程页已踩过一次），那一行被整个丢掉时，生效的是**上一条同属性声明**。⚠️ 2026-10-20
   真机反馈「估价详情的按钮比充售电管家下降更多」即此：两页 `padding` 简写的底边值不同
   （`$sp-4` / `$sp-2`），env 行一旦失效就各回各的简写 → 同一条「规定死」的距离又分叉。
   故凡 `calc(...env/constant...)` 一律**上面先写一行不含 env 的同属性声明**（底栏把它写进 `padding`
   简写的第三值也等价；构建期 cssnano 会把 `padding` + `padding-bottom` 合并成简写，正好保留回退）。
3. **固定底栏「按钮底缘到屏幕底」= `$bottom-bar-gap` + `$safe-bottom`，全项目一个数**——
   现状：多个业务页底栏 + scaffold `.footer-bar`
   全部同档；新增底栏照抄这一行即可，**不要**按设计稿或参考图另挑值（旧页面原先各带
   24rpx、历史上各页底栏间距曾不一致，现已全部收敛）。

### 4) 允许写 `#ifdef` 的位置（白名单，只有这两处）

| 文件 | 用来做什么 |
|---|---|
| `services/platform.js` | 端判定、胶囊导航栏高度与 `capsuleReserve`、H5 锁滚（`lockPageScroll`/`unlockPageScroll`）、**扫码能力分档 `SCAN_MODE` 与微信基础库版本判断** |
| `config/env.js` | 选 host（浏览器有 CORS、小程序没有） |

**复核口径**：全仓（排除 `src/uni_modules/` 三方库）条件编译只允许出现在 `platform.js` 与 `env.js`；`grep -rl "#ifdef\|#ifndef" src --include=*.vue --include=*.js | grep -v uni_modules` 应只命中这两个文件。
要新增第四个位置，先想清楚能不能收敛进 `platform.js` 的一个能力档 —— 一般都能。两个已收敛的先例：
- 原白名单第四位 `components/app-modal/app-modal.vue` 的 H5 锁 body → 收进 `lockPageScroll`；
- 页面内的端差异一律收进 `SCAN_MODE` 等能力分档（见 §1.6）。
`components/app-navbar/app-navbar.vue` **不是**例外：它只在注释里提到 `#ifdef`（正文写的是"页面/组件层零 #ifdef"），自身无任何条件编译指令。

## H5 联调与代理

H5 本地联调使用 Vite dev server 的同源代理（`vite.config.js` 的 `/v2`），不再使用独立代理脚本。
`App.vue` 里那条「H5 dev host 不含 10416 就 warn」的自检也随之摘除。现在的事实是：

- `.env.development` 的 `VITE_HOST_H5` **留空**，请求走相对路径 `/v2/...`，由 `vite.config.js` 代理到 `127.0.0.1:<后端端口>`（`init.sh` 自动同步端口）。
- 代理只影响 `npm run dev:h5`；生产 H5 用 `VITE_HOST_H5`（同域留空 / 跨域由反向代理或后端 CORS 解决）。
- 微信小程序 / App 端不需要代理（无浏览器同源限制），走 `VITE_HOST_MP/APP` 绝对地址。
- `App.vue` 的 `onLaunch` 自检现存两条：非 H5 端 host 为空、或非绝对地址 → `console.error`。看到就先查 `.env*`，别查业务代码。

## 构建与编译验证（2026-09-20 起：uni-app CLI 链）

工程已迁 uni-app CLI（根 `package.json` + `vite.config.js`，业务代码在 `src/`）；HBuilderX 不再作为编译入口，旧「禁加 vite.config.js / package.json」禁忌作废。

| 命令 | 用途 | 加载环境 | **产物目录** |
|---|---|---|---|
| `npm run dev:mp-weixin` / `dev:h5` | 开发（watch；真机联调导入这个包） | `.env.development`(+`.local`) | `dist/dev/<平台>` |
| `npm run verify:mp-weixin` / `verify:h5` | **编译验证：每批改动必跑**（一次性不 watch，= `uni build --mode development`） | `.env.development`(+`.local`) | `dist/build/<平台>` |
| `npm run build:mp-weixin` / `build:h5` | 仅发布打包 | `.env.production`(+`.local`) | `dist/build/<平台>` |
| `npm run dev:prod:mp-weixin` / `dev:prod:h5` | **生产环境 watch**：真机验生产域名/OSS/密钥，边改边看（⚠ 走真实后端与**真实计费接口**） | `.env.production`(+`.local`) | `dist/dev/<平台>` |

> **两轴正交（2026-09-22 实测）**：产物目录只由 `uni`(watch) vs `uni build`(一次性) 决定，环境只由 `--mode` 决定 —— 所以「生产环境 + watch」落在 `dist/dev`，「dev 环境 + 一次性」落在 `dist/build`。分辨某个包的实际环境只能 `grep` 产物里的 host。

**验证必须用 dev 环境（`verify:*`），禁止拿 `build:*` 当验证**（2026-09-20 用户定，2026-09-22 校正理由——旧说法是「production host 为空」，实际 host 已填、缺的是密钥）：
- `.env.production` 的 host 是占位值（`REPLACE_API_BASE_URL`，由 init.sh / 手动替换成生产域名），且 `VITE_API_KEY` 按红线不进 git、只在未提交的 `.env.production.local` 里——**production 模式产物没有签名 key，直连本地后端也签不出合法请求**，所以它只能用于发布打包，不能当联调验证；
- dev 模式把 `localhost:15000` 打进产物，并带 `develop` 头跳过签名（`.env.development.local` 可本地覆盖，不提交）；
- 产物环境自查：`grep -r localhost:15000 dist/build/mp-weixin/`（有命中 = development 包；生产包应命中真实接口域名）。两条命令产物同目录，**这条 grep 是唯一可靠的分辨手段**，别靠目录名猜。

⚠️ **`verify:*` 与 `build:*` 写同一个目录 `dist/build/<平台>`，后跑的覆盖先跑的**（2026-09-22 实测：跑完 verify 后 `dist/build/mp-weixin` 里是 dev 包）。
两条后果，都很容易踩：
1. **发布前必须最后跑一次 `build:*`**——只跑过 verify 就打包上传，传上去的是 host 指向 `localhost:15000` 的开发包；
2. **真机联调不要依赖 `dist/build`** 的当前内容（可能刚被别人的 `build:*` 换成生产包）——用 `dev:*` 的 `dist/dev/mp-weixin`（watch、恒 dev 环境）。
> 历史教训：build 脚本里曾有一条 `cp build→dev`，会把生产包灌进 `dist/dev` 导致真机测试报 host 错，2026-09-20 已删，**禁止再加回**。

其余禁忌：
- ❌ 不要指望 `manifest.json` 的 `h5.devServer` 代理：CLI dev 以 `vite.config.js` 为准（manifest 只保留端口）。
- ⚠️ 发小程序/App 前必须确认 `.env.production` 的 `VITE_HOST_MP`（现已填生产域名）与 `.env.production.local` 里的 `VITE_API_KEY`（密钥三环境各不同、走线下发放，**禁止明文提交**）；H5 若与后端同域可留空走相对路径。

## 样式与滚动的小程序兼容

| 坑 | 处理 |
|---|---|
| `gap` 不支持 | 靠 cell 自带 `padding` 出间隙（`.grid__cell` 的做法） |
| `inset:` 简写 | 展开写 `top/right/bottom/left` |
| `:only-child` 等结构伪类不稳 | 用显式类（如 `.app-modal__btn--alone`） |
| 弹窗打开时底层页面还能滑 | 蒙层 `@touchmove.stop.prevent`（等价小程序 `catchtouchmove`）；H5 桌面端另锁 `body`。**但覆盖原生组件（camera/map/video）的浮层禁用这招**——会把原生手势一起吃掉，见 §1.6 |
| `scroll-view` 真机滚动异常 | 检查外层是否有 `catchtouchmove` 与嵌套滚动冲突 —— 这类只能在微信真机验，H5 表现不作数 |

## 本文件独有的排查与现状

- H5 请求 `ApiError(type:'network')`：先看 `vite.config.js` 的代理 target 是否与后端端口一致（`init.sh` 会同步），再查后端是否可达；生产跨域才查 CORS/反代。
- `App.vue` 的 `onLaunch` 自检日志含义：非 H5 端 host 为空或非绝对地址 → `console.error`。看到就先查 `.env*`，别查业务代码。
- `getLayout()` **进程内缓存一次**：横竖屏切换等场景不会自动重算，需要新值时自己处理。
- 编译能否通过已由 `npm run verify:mp-weixin` + `verify:h5` 覆盖（dev 环境）；仍需真机/开发者工具验、AI 侧验不了的：渲染观感、rpx 缩放与字体、动画、小程序胶囊在各机型的高度、`scroll-view` 真机滚动（外层 `catchtouchmove` 与嵌套滚动的关系）、模板标识符笔误（script setup 下编译不报错、运行时静默 undefined）。
- 现状：`.env.production` 三端 host 与 API Key 留空（按需求），发版前必须填（线下发放，不提交）。

## 硬性禁令（MUST / MUST NOT）

> 原 `rules/scaffold-musts.md` §8 迁入，**本节是唯一权威**（展开解释见上文各节）：

- **日常改动的编译验证必须用 dev 环境**：`npm run verify:mp-weixin` + `npm run verify:h5`（`uni build --mode development`，加载 `.env.development`）；**禁止用默认 production 模式的 `build:*` 当验证**（host/密钥为空、产物不可联调；`build:*` 只在发布打包用）。
- 布局尺寸只问 `getLayout()`；禁止页面/组件自己算状态栏、导航栏、安全区（H5 端相关值恒为 0）。
- 发小程序/App 前必须填 `.env.production` 的 `VITE_HOST_MP/APP` 与 `VITE_API_KEY`（相对路径只对 H5 有效；密钥禁止明文提交）。
- 底部安全区只有 `theme.scss` 的 `$safe-bottom` / `$safe-top` 一个来源，**禁止手写 `env(safe-area-inset-*)` / `constant(safe-area-inset-*)`**（唯一例外 = 三方组件自带的安全区开关）。
- **固定底栏下边距恒为 `padding-bottom: $bottom-bar-gap;` + `padding-bottom: calc(#{$bottom-bar-gap} + #{$safe-bottom});` 两行**（或直接套 `.footer-bar`）：全项目一个数、不许各页自己挑（用户 2026-10-20「这个距离整个项目都需要一致，用常量、规定死」）。
- **`calc()` 里出现 `env(safe-area-inset-*)` / `constant(...)` 时，上面必须有一行不含 env 的同属性回退**（如 `bottom: 220rpx;`）：混合写法失效时不留回退，元素会掉到 `auto` 或各页简写值上。
- **页内输入框的键盘提交走 `confirm-type` + `@confirm`**（判据见 `rule-ui-components`）：微信端 `confirm-type` **仅 `type="text"` 生效**，且 **iOS 数字 / 小数键盘没有回车键** → 数字 / 金额输入无法从键盘提交，提交按钮必须保证键盘收起后可见（在文档流内，或真机确认 `fixed` 底栏未被压住）。**自动 focus（`onReady` 后约 300ms 置位）+ `.footer-bar` 固定底栏是本项目已知的真机风险组合**，只能真机验；**多行 `textarea` 不挂 `confirm-type`**（回车留给换行）。⚠️ **文档流 CTA 与 `fixed` 底栏对键盘的反应不是一回事**：文档流内容靠整页上滚保持可见；`fixed` 元素是被顶起、还是留在原位被盖住，取决于 webview 是否 resize。**前者验过不代表后者安全**，跨项目/跨布局的结论只作参照，`fixed` 底栏页面必须自己真机看（单字段输入页即此类）。
- `#ifdef` 只允许上文白名单两个位置（`services/platform.js`、`config/env.js`）；页面/业务组件里要写端差异，改成「`platform.js` 出能力档 + 页面消费标志」（范本 = `SCAN_MODE`），注释里也别留 `#ifdef` 字面量（会让这条禁令的 grep 证伪出假阳性）。
- 发布打包前必须最后跑一次 `build:*`：`verify:*` 与 `build:*` 同写 `dist/build/<平台>`，只跑过 verify 的产物是 dev 环境包（host 指向 `localhost:15000`），直接上传会把开发包发上生产。
- 全屏浮层要锁页面滚动一律调 `lockPageScroll` / `unlockPageScroll`（引用计数），禁止组件里自写 `#ifdef H5` 或直接改 `document.body.style`。
- **覆盖原生相机/地图/视频层的浮层，其祖先节点禁止挂 `@touchmove.stop.prevent`**（`catchtouchmove` 会静默废掉双指缩放等原生手势，真机才验得出）；确需锁滚只准加在不覆盖取流区的局部。轻震反馈一律调 `vibrateLight()`，禁止页面直调 `uni.vibrateShort`。
