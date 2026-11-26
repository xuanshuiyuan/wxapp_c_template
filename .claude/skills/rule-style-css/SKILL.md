---
name: rule-style-css
description: 在本项目写样式、改颜色/字号/间距/圆角/阴影、需要原子类或版式块（卡片、按钮、列表、徽标、宫格、筛选、底部栏）、给新项目换主色换肤、做新业务页面视觉、或遇到小程序样式不生效时使用。规定 theme.scss 唯一值源、三层样式结构与加载顺序、可用 token / 原子类 / scaffold 类名全清单、尺度基准、CSS 兼容黑名单，以及业务页默认视觉「HUD 座舱视觉语言」（四层结构 / 圆角尺度表 / 流光节奏 / 芯片档位 / 图标约定）——2026-10-29 换肤方案 A「青柠氧气」起，主色 = 薄荷绿、语言 = 圆角 + 主色流光（原「直角斜切 + 主色」已退役）。
---

# rule-style-css

> **本文件含「硬性禁令」小节（原 `rules/scaffold-musts.md` §6 已迁入，唯一权威）。**
>
> **路径口径**：本文件内不带前缀的模块路径（`common/` `styles/` `components/` `config/` `pages/` `packages/` `static/` `uni_modules/` `services/` `main.js` `App.vue` `pages.json` `manifest.json` `uni.scss`）**均相对 `src/`**——2026-09-20 起工程为 uni-app CLI 结构，业务代码全部在 `src/` 下，`@/` 别名 = `src/`。仓库根只放构建链文件（`package.json` `vite.config.js` `index.html` `.env*` `jsconfig.json` ）与 `.claude/` `docs/`；`docs/ARCHITECTURE.md`、`docs/uview-plus-components.md` **确在仓库根**，不要加 `src/` 前缀。

样式只有三层，**「值」只在一处定义**：

```
src/common/css/theme.scss  ← Design Token 唯一真源（只准有变量，禁止任何 CSS 规则）
   ↓ 经 src/uni.scss @import → uni-app 自动注入每个 scss 块（含页面 scoped 样式）
src/common/css/base.scss   ← page 默认观感 + .t-* 语义文字 + 原子类（.c-* .fz-* .m-* …）
src/styles/scaffold.scss   ← 版式块（.page .card .btn .list-item .chip .kv .footer-bar .hud-* …）
src/common/css/main.css    ← ColorUI（只当布局原子类用）
```
加载顺序在 `App.vue` 的全局 `<style lang="scss">` 里：uview `index.scss` → `main.css` → `base.scss` → `scaffold.scss`。**不要在页面里再 @import 这些文件**（已被注入/全局生效）。

## 四条规矩（条文以本文件「硬性禁令」小节为准，这里说的是它们的来由与边界）

1. **主色只在 `theme.scss` 定义**；`config/theme.js` 是它的 JS 镜像（给组件 `color` prop 用）。改色两处一起改，`theme.scss` 是真源。
2. 页面 `<style scoped>` **只写该页独有的结构**；通用的走原子类或 `scaffold.scss`。要复用时**把样式提升到 scaffold**，而不是复制到第二个页面。
3. ColorUI 与自有原子类**共存但不混用**：布局类（`.flex` `.flex-wrap` `.justify-between` `.align-center`）和 `.solid-*` 可以继续用 ColorUI；**颜色 / 字号 / 间距一律走本项目的 `.c-* .fz-* .m-*`**。两套只在 `.text-center/.text-left/.text-right`、`.grid` 重名且语义一致。
4. 单位统一 `rpx`（750 设计稿基准，别写 `upx`）；**写死颜色前先问自己是不是该用 token**。

## Token 全清单（`src/common/css/theme.scss`，2026-10-30 按换肤后真源逐行重校）

> ⚠️ **本体系的主色是薄荷绿 `#1FBF8F`**（2026-10-29 换肤方案 A「青柠氧气」）。早期「懂车帝绿 `#2fa871`」与
> 「主色 `#FFCC32`」两套色板**均已整体作废**。变量名**刻意一个没改**——`$color-brand-yellow` / `-dark` /
> `-orange` 现在是历史名别名，分别指向「主色 / 主色深 / 数值强调」，全仓 378 处旧名引用因此零改动。
> 抄旧稿、抄懂车帝或别的项目配色前先对这张表；数值一律引用本表 token，禁止在页面里写死。

```scss
/* 主色（唯一真源） */ $color-primary #1FBF8F（CTA/进度条/标题竖条/瓦片/选中芯片/活跃分页）
                      $color-primary-dark #12A276（按下态/图标 accent/次级强调）  $color-primary-light #E6F8F1（主色浅底）
/* 数值强调 */        $color-accent #0E9B72（续航大数字/估价金额/预计跌破日期/容量英雄数字）  $color-accent-soft #E8F7F2
/* 历史名别名 */      $color-brand-yellow = $color-primary   $color-brand-yellow-dark = $color-primary-dark
                      $color-brand-orange = $color-accent   $color-brand-red #EF4444（价格/强调数字/资讯红点）
/* 标签/牌照 */       $color-tag-warm-bg #FFF4E2 + $color-tag-warm-fg #B26A05（促销「惠」）
                      $color-nev-plate-1 #F0FAF2 / -2 #D6F2DF / -3 #AEE8C4（新能源牌照渐变绿三档，**换肤不动**——真实号牌色；仅样式类，不入 theme.js）
/* 语义色 */          $color-success #16A34A   $color-warning #F0A22E（**字面值，不许再 alias brand-orange**）   $color-danger #EF4444   $color-info #8C9B95
                      $color-warning-text #B26A05（浅底压深）  $color-warning-text-soft #C08A3E  $color-danger-text #B91C1C（红带文字档）
                      $color-track #2F7FE0（地图路线，**已入 theme.js 镜像**）
/* 文字 */            $text-title #1B2A25（ink-1 标题/正文/Tab/深色按钮底）  $text-main #2C3A34（ink-2 未选中芯片）
                      $text-sub #5D716A（ink-3 说明/单位）  $text-muted #95A7A1（ink-4）  $text-disabled #B9C6C1  $text-inverse #FFF
                      $text-on-yellow #FFFFFF（主色底主文字——**绿底白字**）  $text-on-yellow-2 rgba(255,255,255,.7)（主色底副文字）
/* 背景填充 */        $bg-page #FFF  $bg-card #FFF  $bg-hover #F2F7F5  $bg-mask rgba(0,0,0,.45)
                      $bg-fill-weak #F2F8F5（信息条/页底/图标底盘，HUD 页底基色）  $bg-fill-chip #EFF9F5（未选中芯片/间隙带/骨架块）
                      $bg-fill-icon #2F4A42（深绿墨）  $bg-fill-icon-soft #E4F4EE  $bg-fill-inverse #14261F（深色按钮底）
                      $bg-hero（头图区薄荷多段渐变，整条是一个 gradient 值，不是色号）
/* 窗口底色 */        $nav-solid #E9F4EF ← **导航栏 / tabBar / pages.json 窗口底色的唯一真源，三处必须同值**
/* 示意地图 */        $map-canvas-1 #E8EFEA / -2 #DDE8E2  $map-block rgba(255,255,255,.58)  $map-park rgba(205,226,194,.55)（需要地图的页面消费，仅样式类）
/* 描边 */            $border-color #E3EFE9（卡片描边/宫格列线）  $border-color-2 #E3EFE9（卡片底边）
                      $divider-color #E2EBE7（行内竖分隔）  $line-chip #3F5B52（选中芯片发丝）
/* 字号 rpx（9 档语义名，390pt×1.923 反推；换肤不动字号） */
                      $fs-micro 21  $fs-caption 23  $fs-body 25  $fs-label 29  $fs-cta 33  $fs-price 35  $fs-tab 42  $fs-display 46  $fs-hero 80
                      旧名映射：xs→micro  sm→caption  base/md→body  lg→label  xl→cta  2xl→tab  3xl→display（新代码优先用语义名）
/* 字重 */            $fw-bold 700  $fw-semibold 600  $fw-medium 500  $fw-regular 400
/* 行高（语义档配字号用） */ $lh-display 62  $lh-hero 80  $lh-tab 54  $lh-price 46  $lh-cta 42  $lh-label 38  $lh-body 35  $lh-caption 31  $lh-micro 27
                      倍数档：$lh-tight 1.25  $lh-base 1.6  $lh-loose 1.8
/* 间距 rpx（基数 8） */ $sp-0-5 4  $sp-1 8  $sp-1-5 12  $sp-2 16  $sp-3 24  $sp-4 32  $sp-5 40  $sp-6 48  $sp-7 56  $sp-8 64  $sp-10 80
/* 语义间距 */        $page-padding 32  $card-padding 32  $card-gap 24  $section-gap 12  $chip-gap 16  $nav-height 84
/* 安全区 */          $safe-bottom / $safe-top = env(safe-area-inset-*)  ← 安全距离唯一来源（2026-10-20 立，禁令在 rule-multiplatform）
/* 底栏 */            $bottom-bar-gap 16  ← 固定底栏下边距，全项目规定死；两行写法见「版式块清单」下方
/* 圆角（2026-10-29 斜切整体退役、改圆角后的全表） */
                      $rd-tile 26（.hud-tile 88rpx 瓦片）  $rd-tag 999（芯片/徽章胶囊）  $rd-card 28（舱体/卡片/列表行底）
                      $rd-chip 12（tip 多行条/输入框/小标签底，**别改 999**，长文本框会成药丸）  $rd-badge 999（分栏徽章）
                      $rd-lg 32（大卡片）  $rd-pill 999（正圆）  $rd-button 44（主 CTA/次级按钮/弹窗按钮，原为 0 靠 clip-path 斜切）
                      旧名：sm→chip(12)  md→card(28)  full→pill(999)
/* 阴影/发光 */       $shadow-card（软投影，替代原 drop-shadow）  $shadow-bottom-bar（底栏上投影）  $shadow-float（弹层/浮层）
                      $glow-primary（舱体外发光 0 0 20rpx rgba(31,191,143,.14)，与流光配套新增）
/* 组件尺寸 */        $size-cta-h 92  $size-chip-h 46  $size-icon-circle 38  $size-icon-button 84  $size-tab-underline-w/h 36/6
/* z-index */         $z-nav 100  $z-bottom-bar 200  $z-popover 500
/* 动效 */            $ease-standard cubic-bezier(.4,0,.2,1)  $duration-fast .15s  $duration-base .25s
```

> ⚠️ **`theme.scss` 的变量定义顺序是硬约束**：`$color-primary` 必须在 `$color-brand-yellow` 之前；
> `$color-warning` 必须是字面值，**不能**写成 `= $color-brand-orange`——后者已是「数值强调（深绿）」，
> 那样写会让告警跟着主色变绿。

新增档位：在 `theme.scss` 加变量 → 若是间距，还要去 `base.scss` 的 `$spacing-steps` 加值（否则原子类生成不出来）。

## 原子类清单（`src/common/css/base.scss`）

| 组 | 类名 |
|---|---|
| 语义文字 | `.t-h1 42 .t-h2 33 .t-h3 29`（标题三级，均 600 重；三档走 `$fs-2xl/$fs-xl/$fs-lg`，**base.scss 里 44/36/32 的行内注释是旧值，以 token 为准**） `.t-body .t-desc .t-note .t-strong .t-num .t-link .t-disabled` |
| 颜色 | `.c-primary .c-success .c-warning .c-danger .c-info .c-title .c-main .c-sub .c-muted .c-disabled .c-white .c-link` |
| 背景 | `.bg-page .bg-card .bg-hover .bg-primary .bg-primary-light .bg-success-light .bg-warning-light .bg-danger-light` |
| 字号 | `.fz-xs 21 .fz-sm 23 .fz-base 25 .fz-md 25 .fz-lg 29 .fz-xl 33 .fz-2xl 42`（旧名映射来的，**`.fz-base` 与 `.fz-md` 同值 25**；无 `.fz-3xl`，要 46 用 `$fs-display` 写样式） |
| 字重/行高 | `.fw-normal 400 .fw-medium 500 .fw-bold 600` / `.lh-tight 1.25 .lh-base 1.6 .lh-loose 1.8`（⚠️ `.fw-bold` = **600**，与 token `$fw-bold` = 700 不是同一档，要 700 得直接用 `$fw-bold`） |
| 间距 | `.m- .mt- .mr- .mb- .ml- .mx- .my- .p- .pt- .pr- .pb- .pl- .px- .py-` × **4/8/12/16/20/24/32/40/48/64/80**（数字即 rpx，源 `base.scss` `$spacing-steps`） + `.m-auto .mt-auto` |
| 圆角阴影边框 | `.rd-sm 12 .rd-md 28 .rd-lg 32 .rd-full 999`（2026-10-29 换肤后取值；旧值是 4/8/16） / `.shadow-card .shadow-float`（`$shadow-bottom-bar` 只在 scaffold 内部用，无原子类） / `.bordered .no-border` |
| 文本 | `.ellipsis .ellipsis-2 .justify-text .text-left .text-center .text-right` |
| 细线 | `.hairline-top .hairline-bottom`（`1rpx solid $divider-color`——小程序端 1rpx 比 1px 更稳，不是 0.5px 方案） |
| 布局 | `.flex-v-center .flex-h-between .flex-col .flex1 .flex2 .flex3 .flex-basis-auto .hidden .pointer` |

页面级排版用 `.t-*`（一类一个角色），**卡片内标题仍走 scaffold 的 `.card__title`**；要微调就叠原子类（`.t-h3.c-primary`）。

## 版式块清单（`src/styles/scaffold.scss`，2026-10-30 按换肤后真源校正）

| 类别 | 类名 |
|---|---|
| 页面（浅色常规） | `.page` `.page--hero` `.hero` `.hero__name/desc/meta/tag` |
| **页面（HUD 座舱页壳）** | `.hud-page`（flex 列 + 锁 100vh + **薄荷白底**：`linear-gradient(180deg, #F6FBF8 → $bg-fill-weak)` + 顶部主色氛围光；**导航栏 / tabBar / `pages.json` 窗口底色必须同为 `$nav-solid #E9F4EF`**） `.hud-page__scroll`（`flex:1 min-height:0`，滚动走内部 scroll-view） `.hud-page__body`（接管内边距：顶 `$sp-3` / 左右 `$page-padding` / 底 `$sp-10 + var(--tab-overlay,0)`）——**tabBar 页与绝大多数业务子页共用**，tabBar 业务页默认走这族而非 `.page` |
| **HUD 舱卡** | `.hud-frame` + `.hud-panel`（主舱双层，**圆角 28/26**；外层 = 静态主色渐变描边 + `box-shadow: $shadow-card, $glow-primary`，内层 = 白瓷面 + 左上极淡主色打光）；**流光变体** `.hud-frame--flow`（`background-size:200%` + `4.5s linear infinite`，**只给主模块**（一屏最多一两处））；**矮舱变体** `.hud-frame--band` + `.hud-panel--band`（圆角 **20/18**，且**带舱 `box-shadow: none` 去投影**——矮舱投影会糊在圆角外成脏块） |
| **HUD 瓦片** | `.hud-tile`（88×88 图标底盘，**圆角 26**，主色淡渐变 + `inset 1rpx` 主色发丝环） `.hud-tile__plate`（内缩 2rpx 瓷面盘底，圆角 `26 − 2`） `.hud-tile__icon`（44×44，**不再带辉光**）——宫格 / 服务列表 / 卡片系组件共用 |
| 卡片 | `.card`（圆角 `$rd-card 28` + `$shadow-card` + `inset 1rpx $border-color`） `.card--overlap` `.card__head` `.card__title`（**主色左竖条** `$color-primary → $color-primary-dark` 竖向渐变） `.card__aside` |
| 按钮 | `.btn`（圆角 28）/ `.btn--primary`（主色渐变 + **圆角 44**）/`.btn--danger/ghost/soft` / `.btn--sm`（**胶囊 `$rd-tag`**）/ `.btn--lg`（圆角 44）/ `.btn--block` / `.btn--hover`（配 `hover-class` 用） / `.btn-row` |
| 列表 | `.list-item` `.list-item--hover` `.avatar-letter`（圆角 28） `.avatar-letter--round`（正圆） |
| 标签 | `.badge`（**胶囊 `$rd-tag`**） `.badge--on/off/warning` `.badge-split`（胶囊） `.badge-split__left/__right`（左深墨右白底的分栏徽章，高 38；**当前 scaffold 已备、页面无消费方**） |
| 筛选 | `.chip-scroll` `.chip`（**胶囊 `$rd-tag`**，高 46） `.chip--on` |
| 状态 | `.state` `.state__text` `.state__retry` `.more` |
| 宫格 | `.grid` `.grid__cell`（宽 50%，两列） `.tile`（圆角 28，高 112） `.tile--hover` `.tile__label/desc` |
| 键值 | `.kv` `.kv__k`（宽 170） `.kv__v` |
| 其他 | `.tip`（圆角 12 + `rgba($color-warning,.10)` 底） `.divider` `.text-muted` `.safe-bottom` `.footer-bar` |

`.safe-bottom` / `.footer-bar` 内部走 `theme.scss` 的 `$safe-bottom` + `$bottom-bar-gap` 常量 —— 有底部操作栏就套 `.footer-bar`，别再手写 `padding-bottom`（`.footer-bar` 的投影走 `$shadow-bottom-bar`）；自己拼固定底栏时也必须是 `calc(#{$bottom-bar-gap} + #{$safe-bottom})`（**全项目一个数，不许改**），**禁止手写 `env(safe-area-inset-*)`**（禁令与用法见 `rule-multiplatform` §3）。

## 尺度基准（小程序里按钮做大很笨重，固定这几档——2026-10-30 按换肤后 `scaffold.scss` 真值重校）

| 元素 | 尺寸 |
|---|---|
| 默认按钮 `.btn` | 高 **64** / 字号 **25**（`$fs-body`）/ 圆角 **28**（`$rd-card`）/ 左右内边距 32 / 底 `$bg-hover` + `$text-main` |
| 主按钮 `.btn--primary` | 同上，但**主色 135° 渐变**（`$color-primary → $color-primary-dark`）+ 字色 `$text-on-yellow`（**白字**）+ 600 重 + 圆角 **44**（`$rd-button`） |
| 行内小按钮 `.btn--sm` | 高 **52** / 字号 **23**（`$fs-caption`）/ **胶囊 `$rd-tag`(999)** / 左右内边距 24 |
| 大按钮 `.btn--lg` | 高 **88** / 字号 **33**（`$fs-cta`）/ 圆角 **44** / 左右内边距 48（配 `.btn--block` 成整行，**一屏最多一个**） |
| 页面主 CTA 放大档（各页自绘 `.cta`） | 高 **136** 主色渐变块 + 圆角 **20** + 主色投影（页面自绘；**不在 scaffold 里**） |
| 筛选 chip `.chip` | 高 **46**（`$size-chip-h`）/ 字号 25 / **胶囊 `$rd-tag`(999)** / 左右内边距 24 / 底 `$bg-fill-chip`，选中 `--on` 走白底 |
| 徽标 `.badge` | 高 **30** / 字号 23 / **胶囊 999** ｜ 分栏徽章 `.badge-split` 高 **38** / 胶囊 ｜ 头部标签 `.hero__tag` 高 40 / 圆角 12（`$rd-chip`） |
| 列表头像 `.avatar-letter` | **72×72**，圆角 **28**（`--round` 变正圆）/ 字号 25 / 右间距 24 |
| 宫格 tile | `.tile` 高 **112**（内边距 32、圆角 28、底 `$bg-fill-weak`）｜ HUD 瓦片 `.hud-tile` **88×88**（圆角 26）、内图标 `.hud-tile__icon` **44×44** |
| 卡片 `.card` | 内边距 **32 四边均一**（`$card-padding`）/ 卡间距 **24**（`$card-gap`）/ 圆角 **28**（`$rd-card`）/ 投影 `$shadow-card` + `inset 1rpx $border-color`；卡头 `.card__head` 高 48、下外边距 24 |
| 列表行 `.list-item` | 上下内边距 24（`$sp-3`），行底 1rpx `$divider-color`（去末行线用 **`.a + .a` 相邻兄弟**，见下） |
| 页面内边距 | `.page`：左右 32（`$page-padding`）/ 底 80（`$sp-10`）｜ HUD 页壳 `.hud-page__body`：顶 24 / 左右 32 / 底 80 + `--tab-overlay` |
| 键值行 `.kv` | 上下 8 / 键列宽 170 / 字号 25；状态块 `.state` 内边距 64×48；`.footer-bar` 内边距 24×32 |

> 备用档（theme 里已定义、scaffold 与页面**当前均未消费**，别误以为已生效）：`$size-cta-h 92`、`$size-icon-circle 38`、`$size-tab-underline-w/h 36/6`、`$nav-height 84`、`$border-color-2`、`$bg-fill-inverse`、`$color-accent-soft`、`$rd-lg`。
>
> ⚠️ **圆角档位就这么几个**：28（舱体/卡片/按钮底）/ 26（瓦片）/ 20（页面大 CTA）/ 12（tip、输入框、小标签底）/
> 44（主 CTA、次级按钮、弹窗按钮）/ 999（芯片、徽章、头像、胶囊）。**别再自造 8 / 16 / 24 这类旧值**。

## 换肤 / 复用这套样式（这就是分三层存在的意义）

1. 颜色/字号/间距的值 → **只改 `src/common/css/theme.scss` 一个文件**，base、scaffold、页面里的 token 引用全自动跟随；
2. 同步 `config/theme.js`（JS 镜像，只收需要传字符串 prop 的色；`$color-warning-text{,-soft}`、`$color-tag-warm-*`、`$color-nev-plate-*` 按 theme.scss 注释**故意不入镜像**，另有一个 `iconPlaceholder` 只在 JS 侧存在）；
3. 想改默认背景/正文观感或标题尺度 → 只动 `base.scss` 的 `page {}` 与 `.t-*`。

2026-10-29 换肤实测出来的三条附加口径：

- **改主色只需动 `$color-primary` 三档**，全仓 378 处 `$color-brand-yellow*` / `-orange` 引用会自动跟随（它们是别名）。
  ⚠️ 但**不要顺手把 `$color-warning` 也改成别名指向 alias**——它在 2026-10-29 被刻意拆成字面值，
  否则「告警」会跟着主色变绿、红黄绿三档语义全废。
- **`$nav-solid` 是三处同值项**：`theme.scss` 的 `$nav-solid`、`app-navbar` 的底色、`pages.json` 的
  `backgroundColor / backgroundColorTop`（112 处）。只改一处，下拉回弹就会露出色差白块。
- **主色底上的文字是白的**（`$text-on-yellow #FFFFFF`）。旧稿里「黄底墨字」的 `color: $text-title` 一律要改，
  否则深墨压深绿读不清（v1.0.19 就地追加时补过 7 处遗漏）。

`base.scss` / `scaffold.scss` 里没有写死色值（浅色底用 `rgba($token, α)` 从 token 推导），整体拷走即可复用。

## 组件库跟色机制

`base.scss` 的 `page {}` 把 uview-plus 的 CSS 变量覆盖成项目 token：
```scss
--up-primary / --up-primary-dark / --up-primary-light
--up-main-color / --up-content-color / --up-tips-color
--up-border-color / --up-bg-color
```
→ 按钮、开关、选中态、分割线**自动跟色，不用逐个组件传 `color`**。需要传色的只有收字符串 prop 的那些（走 `theme.js`，见 `rule-ui-components`）。骨架屏的灰块色另外由 `app-skeleton` 用 `--up-skeleton-bg-color` / `--up-skeleton-shimmer-color` 映射到 token。

## 本文件独有的解释与实测差异

- **暗面 UI 的色档豁免（2026-09-22 定）**：本项目全局 token 是**浅舱**体系（白瓷面 + 深墨字），没有「压在全屏相机预览上的暗色 UI」这一族。P4 扫码取景层需要的那几个色（`#12141A` 底 / `#2A2E38` 渐变亮端 / `#FFE58A` 暗面提亮黄 / `#B3282D` 权限拒绝带红）**为全局找不到对应的单页特例**，处理口径：
  ① **有全局档的一律直接用 token**——白 = `$text-inverse`、深墨 = `$text-title`、卡片白底 = `$bg-card`，半透明写 `rgba($token, α)`；
  ② **确无对应的收成页面内具名 SCSS 变量**（范本 = `pages/vehicle/obd` 样式块顶部的 `$obd-ink` / `$obd-ink-2` / `$obd-accent` / `$obd-warn-ink`，带 why 注释），**禁止把 hex 散在每条规则里**；
  ③ 只为单页服务、无换肤需求，**不许为它扩全局 token 表**（一档全局色会牵动 `theme.js` 镜像与所有页面）。
  判据：同一值被 ≥2 个页面需要 → 才提全局档；只 1 页用 → 页内具名变量 + 注释说明为什么不开档。

- 为什么 token 不能直接写进 `base.scss`：`base.scss` 带样式输出，一旦被 `uni.scss` 注入，**全部原子类会在每个页面重复打包**；所以「值」必须独立成纯变量的 `theme.scss`。
- ⚠️ 间距档位两向不重合（旧文档说「`$sp-*` 没有 4 和 48」已反向——`$sp-0-5`=4、`$sp-6`=48 现在都在）：
  - 原子类档位（`base.scss` `$spacing-steps`）= `4/8/12/16/20/24/32/40/48/64/80`
  - token 档位（`theme.scss` `$sp-*`）= `4/8/12/16/24/32/40/48/56/64/80`
  - 差集只有一个：**20** 有原子类（`.mt-20` 可用）却没有 `$sp-*` 变量——SCSS 里要 20rpx 得先补 token；**56** 有 `$sp-7` 却生成不出 `.mt-56`——模板里要用就先把它加进 `$spacing-steps`（加档流程见上面「新增档位」）。
- 半透明一律 `rgba($token, α)` 编译期推导（含 `$shadow-card` / `$shadow-float`、warning 压深字色 `$color-warning-text` / `$color-warning-text-soft`），换主色时阴影与浅色底自动跟随。
- `base.scss` `page {}` 覆盖的 uview CSS 变量只有 **8 个**（`base.scss:34-41`）：`--up-primary{,-dark,-light}`、`--up-main-color`、`--up-content-color`、`--up-tips-color`、`--up-border-color`、`--up-bg-color`；不在名单里的组件属性仍需显式传色（骨架屏那两个 `--up-skeleton-*` 是 `app-skeleton` 组件内部自己映射的，不算 `base.scss` 的名单）。
- 验证：工程 2026-09-20 起有 npm 构建链（HBuilderX 不再是编译入口），改全局样式必跑 `npm run verify:mp-weixin` + `npm run verify:h5`（dev 环境模式，production 的 `build:*` 只用于发布）；页面 `scoped` 里 `$color-*` 报 undefined，先查是否绕过了 `src/uni.scss` 注入链。
- `App.vue` 全局块保留 `.uni-row` / `.uni-column` 的 flex 方向补丁（ColorUI 与 uni 内置类混用所需），动全局样式顺序前先看它。

## HUD 座舱视觉语言（2026-10-29 换肤 A「青柠氧气」：薄荷白 + 圆角 + 主色流光）

这套语言只换皮、不换骨：
四层结构、栅格、字号、间距、信息层级一律不动，变的只有**色值**（主色 → 薄荷绿）、
**轮廓**（直角斜切 → 圆角）和**动效配比**（流光从「所有舱体」收成「只主模块」）。
之后的业务页面默认按这套做；值全走 token，本节只规定「组合方式」。

### 四层结构（自底向上）
1. **页面底「薄荷白」** = scaffold **`.hud-page`**（配 `.hud-page__scroll` 滚动区 + `.hud-page__body` 内容层）：
   `linear-gradient(180deg, #F6FBF8 0%, $bg-fill-weak 60%)` + **顶部主色氛围光**
   `radial-gradient(120% 26% at 50% -4%, rgba($color-primary, .14), transparent 62%)`
   ——⚠️ 这抹绿**只铺很浅的一段（26% 高、起点在框外）**：铺到 40% 会把上半屏整体压绿，白卡浮不起来。
   自绘顶栏背景必须是**与窗口底色同值的纯色 `$nav-solid #E9F4EF`**，`pages.json` 的
   `backgroundColor / backgroundColorTop`（112 处）与 tabBar 底色必须同步同值，否则下拉回弹露出区色差成白块。
   `base.scss` 的 `page` 底色也用 `$bg-fill-weak`（H5 端 `uni-page-wrapper` 给 tabBar 预留的那段会露底，纯白就是一条白带）。
2. **舱卡** `.hud-frame/.hud-panel`（scaffold 版式块）：外层 = **静态主色渐变描边**（`115deg`，`.50 → .26 → 墨 10% → .26 → .50`）
   + `border-radius: $rd-card` + `box-shadow: $shadow-card, $glow-primary`；内层 = **白瓷面**
   （纯白 + 左上极淡主色打光 `radial-gradient(120% 85% at 8% -8%, rgba($color-primary,.06), transparent 52%)`），
   圆角 `calc(#{$rd-card} - 2rpx)`（圆角同心、描边等宽）。
   ⚠️ **不要在舱面上再叠「上白下薄荷」的大面积渐变**：页底本身已是薄荷白，卡面再罩一层会整屏糊成一片绿。
   行数少的收尾带换矮舱变体 **`.hud-frame--band/.hud-panel--band`**（圆角 20/18 + `box-shadow: none` 平贴无投影）。
   所有业务卡复用这几类，**禁止手写白卡 + 圆角 + 阴影另造舱体**。
3. **强调层**：主色流光描边（**只给主模块**，走 `.hud-frame--flow`）、主色标题竖条
   （`.card__title::before` 语言，`$color-primary → $color-primary-dark` 竖向渐变）、`$glow-primary` 外发光；
   **数值强调用 `$color-accent`（深绿）**；**暖色提示与告警用 `$color-warning`（暖橙，不要用 `brand-orange`——
   它已是数值强调）**；危险色只给危险/上涨语义。
4. **文字层**：浅底一律深墨四档 `$text-title/main/sub/muted`；舱内不出现白字（深色舱方案已废弃）。
   **唯一例外是主色底**（CTA / 实心芯片）：那里必须用白字 `$text-on-yellow`，深墨压深绿读不清。

### 圆角尺度表（2026-10-29 起：`clip-path` 斜切整体退役，改圆角）
| 元素 | 圆角 | 备注 |
|---|---|---|
| 舱卡 `.hud-frame` / `.hud-panel` | **28 / 26rpx** | 外层 `$rd-card`，内层 `- 2rpx`（同心、描边等宽） |
| 矮舱带 `.hud-frame--band` / `.hud-panel--band` | **20 / 18rpx** | 与主舱错开一档做节奏 + 去投影 |
| 图标瓦片 `.hud-tile` / `.hud-tile__plate` | **26 / 24rpx** | `$rd-tile`，内层同样 `- 2rpx` |
| 按钮 / 热帖块 / 封面上传槽 | **12–28rpx** | 小件 `$rd-chip 12`，卡片级 `$rd-card 28` |
| 主按钮 / 行内按钮 / 弹窗按钮 | **44rpx** | `$rd-button`（原为 0，靠斜切） |
| 页面主 CTA 放大档（`136rpx` 高主色块） | **20rpx** | 页面独有，不在 scaffold |
| 芯片 / 徽标 / 头像 / 胶囊 | **999rpx** | `$rd-tag` / `$rd-badge` / `$rd-pill` |
| tip 多行提示条 / 输入框 / 小标签底 | **12rpx** | `$rd-chip`，**别用 999**（长文本框会成药丸） |

双层结构 = 外层渐变当描边、内层同形内缩 2rpx 盖底；**内层半径恒 = 外层 − 2rpx**。
新圆角从表里选档，**禁止自造 8 / 16 / 24 这类旧值**。仅**图形类**才允许 `clip-path`（闪电标 / 下拉箭头 / 雷达多边形 / 曲线面积）。

### 流光与动效节奏
- **默认静态**（用户 2026-10-29 定「只主模块流光」）：118 处舱体里绝大多数是次级模块，全部巡游既吵又在长列表页掉帧。
  需要流光时给模板加 **`.hud-frame--flow`**（一屏最多一两处），
  样式 = `115deg` 带状渐变（首尾同色近似无缝）+ `background-size: 200%` + `4.5s linear infinite` 位移。
- **scoped 组件里引用流光时 keyframes 必须本地定义**（vue scoped 会改写 animation 名，对不上全局帧）。
- 呼吸点 `2s ease-in-out`（实时点/信标点统一节奏）、刷新环 `0.9s linear`、hover/按压 `$duration-base + $ease-standard`；
  圆角件按下用 `box-shadow` 外发光（`rgba($color-primary, .45)`）而不是 `filter: drop-shadow`。
- 下拉指示器走**贴顶栏下缘的浮层**（z 低于 `$z-nav`，上半截滑进栏体时被栏盖住 = 从栏底「长出来」；restore/abort 淡出）；**scroll-view refresher 槽内禁放视觉内容**——原生回弹收缩时固定高度内容会溢出遮盖（本项目踩过）。⚠️ 指示器**不能钉住不动**：它整块骑在「下拉让出的空档」里、底边贴住被顶下去的内容上沿（否则空档还浅时它会与内容挤在同一块地方，看着像文案被内容压住）——位移用内层纯 px 的 `translateY` + 纯 CSS `bottom` 锚点实现，**不写 `calc(百分比 + px)`**（小程序端 transform 里的 calc/百分比不可靠）。

### 芯片与状态色（浅舱档）
- 芯片 / 徽标一律**胶囊**（`$rd-tag` 999）；选中芯片 `--on` 走白底 + `$line-chip` 发丝，未选中走 `$bg-fill-chip`。
- 来源/促销芯片：`$color-tag-warm-bg #FFF4E2` 底 + `$color-tag-warm-fg #B26A05` 字。
- 语义淡芯片（delta 等）：实色字 + `rgba(实色, .07–.12)` 底 + `rgba(实色, .25)` 描边；warning 字色浅底压深走 `$color-warning-text`。
- 发丝线统一 `rgba($text-title, .06–.08)`；深色舱遗留的 `rgba($text-inverse, …)` 写法禁止再用。
- ⚠️ **红黄绿三档语义不许被主色带跑**：`$color-success #16A34A`（健康/正常）、`$color-warning #F0A22E`（关注/暖提示）、
  `$color-danger #EF4444`（异常/危险）各自独立；主色绿是**结构色**，不能拿来表达「正常」或「成功」。

### 图标约定
- 线稿图标集按业务域分目录，实际有 **11 组**（`src/static/icons/`，共 51 枚）：
  **`service/` 11 · `mine/` 11 · `battery/` 6 · `safety/` 6 · `scrap/` 4 · `trip/` 3 · `valuation/` 3 ·
  `account/` 2 · `social/` 2 · `vehicle/` 2 · `sell/` 1**——**`icons/` 下没有 `tabbar/` 目录**。
  PIL 4x 超采样生成的墨线线稿（`$text-title` / 次级灰）+ 单处**主色 accent**（2026-10-29 由主色改为 `#1FBF8F`）+ 圆角/图形轮廓。
  生成脚本在 `docs/scripts/`（仓库根，勿加 `src/` 前缀）：`gen-{account,battery,checkin,insurance,mine,safety,scrap,sell,social,trip,valuation,vehicle-live,icons-main,...}.py`，
  每个脚本各有一处 accent 常量（名字不一，如 `YELLOW` / `ACCENT`）——**换肤/改色时统一改常量后重跑覆盖 `src/static/icons/**`，不要手工 PS 单张**；
  资产总表与档位判据见 `docs/scripts/README-icons.md`（`docs/` 不进版本库，换机器需另行同步）。
- tabBar 图标在 **`src/static/tabbar/`**，与 `icons/` 同级、每 tab 两枚（`{name}.png` 未选中 / `{name}-active.png` 选中 = 主色）；
  `pages.json` 里文字色 `color #95A7A1`（= `$text-muted`）/ `selectedColor #12A276`（= `$color-primary-dark`）/
  `backgroundColor #FFFFFF`。新增图标按「线稿 + 单主色 accent」生成，**禁止彩色 emoji 或引入填充图标库**。

## 硬性禁令（MUST / MUST NOT）

> 原 `rules/scaffold-musts.md` §6 迁入，**本节是唯一权威**：

- 颜色/字号/间距/圆角/阴影只允许用 token；token 唯一真源是 `common/css/theme.scss`，改色必须同步 `config/theme.js`（JS 镜像，给组件 prop 用）。
- `theme.scss` 只准写变量，禁止任何 CSS 规则（它会被注入每个 scss 编译块，带样式就每页重复打包）。
- 页面 `<style scoped>` 只写本页独有结构；跨页复用的样式一律提升到 `styles/scaffold.scss`，禁止复制到第二个页面。
- 单位只用 `rpx`；间距只用生成档位，禁止自定义奇数值（如 `.mt-13`）。
  - ⚠️ **唯一例外：横屏页面**（`pageOrientation: "landscape"`）**必须用 `px`**。`rpx` 按**窗口宽度**换算，
    横屏时窗口宽度是长边（812/844…），1rpx ≈ 1.08px（竖屏约 0.5px）→ 同一份 rpx 样式在横屏下**凭空放大一倍**
    （2026-11-18 手写签名页「画面放的很大」即此）。横屏页里左右安全区仍用 `$safe-left/$safe-right`。
- **自造类名不得与 ColorUI 的全局原子类撞名**（`common/css/main.css` 是 app 级全局样式，**它的类会作用到组件根节点**）——
  尤其两字母档：**`.fr` = `float: right`、`.fl` = `float: left`**（同级还有 `.cf/.pad/.margin/...`，共 448 个类名，写前缀前先 `grep '^\.前缀' src/common/css/main.css`）。
  ⚠️ 撞名的后果不是「样式略偏」而是**整块布局崩**：根节点被浮动后收缩成内容宽并贴边，
  内部 flex 全乱（2026-10-23 三个表单「排列是乱的」：`form-row` 用了 `.fr`；该机制在 H5 侧确证，
  小程序端组件有样式隔离、app.wxss 未必命中组件内部节点，**但改名两端都必须做**）。
  **组件类名一律 ≥3 字母、带语义前缀**（本项目的 `frow__*` / `vpk__*` / `tf__*` / `iv__*` 都是这么定的）。
- 禁止 `gap`、`inset:` 简写、`:only-child` / `:first-child` / `:last-child` / `:nth-child` 等结构伪类（小程序不支持）；单元素特例用显式类。
  - 「除首行 / 末行外都要有分隔线」的通用写法 = **把线给 `.a + .a`（相邻兄弟，末行天然无下一条兄弟）**，
    不要 `border-bottom` + `:last-child` 去线；元素之间隔着别的节点（如分界小标）时，那条分界线由**隔断件自己**给。
  - ⚠️ **但这一招对「组件实例」不成立**：MP 端自定义组件的**宿主是真实元素**（本仓 v1.0.6 已证：
    `app-cta` 宿主在 flex 容器里被按内容收缩，而 H5 侧组件不产生宿主节点），两个组件实例的
    内部根节点隔着各自宿主、**不是相邻兄弟** → 兄弟选择器在真机一条线都出不来（H5 反而出线，两端不一致）。
    行 / 项是**组件**时，分隔线改由**组件自己按 prop 画**（本项目 `form-row` 的 `divider` prop，
    调用方给分组内第 2..n 行显式传）；`.a + .a` 只适用于页面里裸 `<view>` 之间。
- ColorUI 只准用布局类；颜色/字号/间距只准用本项目 `.c-* .fz-* .m-*`。
- 禁止在 `uni.scss` 里加项目变量（它是注入通道，不是配置点）。
- 业务页舱卡必须复用 scaffold `.hud-frame/.hud-panel`；禁止手写白卡 + 圆角 + box-shadow 另造舱体（见「HUD 座舱视觉语言」）。
- **圆角只用 `theme.scss` 的 `$rd-*` 档**（28 舱体/卡片/按钮底 · 26 瓦片 · 20 大 CTA / 矮舱 · 18 · 12 小件 · 44 主按钮 · 999 胶囊），
  双层结构内层 = 外层 − 2rpx；**禁止自造 8/16/24 这类旧值**。
- **`clip-path` 只准用于图形**（闪电标 / 下拉箭头 / 雷达多边形 / 曲线面积 / 视频进度条）；
  **卡片、按钮、瓦片、缩略图、上传槽、芯片一律用 `border-radius`**——2026-10-29 换肤起斜切语言整体退役。
- **流光只挂主模块**（`.hud-frame--flow`，当前两处）；禁止把 `animation` 加回 `.hud-frame` 本体（长列表掉帧、抢重点）。
- **暖色语义不许用 `$color-brand-orange`**（它已改指「数值强调」深绿）：暖提示与告警一律 `$color-warning`；
  `$color-warning` 也不许写成 `= $color-brand-orange` 的别名（否则告警跟着主色变绿）。
- **主色底上的文字必须是白字 `$text-on-yellow`**，不许写 `$text-title`（深墨压深绿读不清）。
- **导航栏 / tabBar / `pages.json` 窗口底色三处必须同为 `$nav-solid`**；只改一处，下拉回弹就露色差。
- 禁止往 scroll-view refresher 槽放视觉内容（原生回弹收缩会溢出遮盖）；下拉指示器走顶栏下缘浮层 `app-refresher`（骑在下拉空档里、随下拉下移，见动效节奏节）。

## 来源 / 最后同步

提炼自 `docs/ARCHITECTURE.md` §4（含 §4.1–§4.5）+ `src/common/css/theme.scss`、`src/common/css/base.scss`、`src/styles/scaffold.scss`、`src/App.vue` 全局块的实际变量/类名清点；2026-09-10 并入原 `.claude/rules/scaffold-musts.md` §6（rules 目录已删除）。

**最后同步 2026-10-30（换肤批 v1.0.20）**：按换肤后的 `theme.scss` / `scaffold.scss` / `config/theme.js` / `pages.json` 全量重写——
主色改薄荷绿 `#1FBF8F`（`$color-brand-yellow*` / `-orange` 降为历史名别名，`$color-warning` 拆成字面值）、
新增 `$nav-solid` / `$color-accent` / `$map-*` / `$glow-primary`、圆角表整组换新（斜切语言退役）、
「斜切尺度表」整节改为「**圆角尺度表**」、流光从全量改为「只主模块 `.hud-frame--flow`」、
尺度基准表按新真值重校（按钮 28/44、芯片与徽章胶囊、卡片 28）、图标目录改为 11 组 51 枚并改主色 accent、
tabBar 三色改为 `#95A7A1 / #12A276 / #FFFFFF`；硬性禁令补圆角档、clip-path 仅图形、暖色不许用 brand-orange、
主色底白字、窗口底色三处同值五条。

**历史同步（2026-09-22）**：token 与尺度清单按 `theme.scss` / `scaffold.scss` 全量重校（旧「懂车帝绿」色板值、旧字号/间距/圆角档、旧尺度基准表全部作废重写）；补登 `.hud-page` 页壳族、`.hud-frame--band/.hud-panel--band` 矮舱、`.hud-tile` 三件套、`.badge-split`；间距档位差集改正（无 token 的是 **20**，无原子类的是 **56**）；uview 覆盖变量数改 **8**；图标目录改 `static/icons/{service,mine,battery,valuation,social}` + `static/tabbar/`；全文模块路径统一 **`src/`** 口径（见文件开头「路径口径」）。
