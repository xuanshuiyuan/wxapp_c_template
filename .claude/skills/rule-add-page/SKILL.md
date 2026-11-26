---
name: rule-add-page
description: 在本项目新增页面、新界面、新业务模块页，或要把一份后端数据渲染成列表页/表单页/详情页时使用。给出完整流程：建 api 方法 → 按内置骨架现写页面 → 注册 pages.json → 接 useList/useModal → 样式走 token → 双端 verify 编译；含可直接照抄的列表页与表单页骨架代码。
---

# rule-add-page

> **本文件是流程与骨架。硬性「必须 / 禁止」分布在各 rule-skill 的「硬性禁令」小节：页面层通用禁止清单在 `rule-project-structure`，请求在 `rule-api-request`，弹窗跳转在 `rule-page-services`，样式在 `rule-style-css`，组件在 `rule-ui-components`，绑手机门槛在 `rule-auth-state`，**列表返回刷新 / 重复请求在 `rule-performance` §2.1**——写完页面逐条自查（skill 不会级联加载，需要时显式调用）。**

> **路径口径**（2026-09-20 起工程为 uni-app CLI + `src/` 结构）：本文件里不带前缀的模块路径一律相对 `src/`（`pages/` 即 `src/pages/`，`@/` 别名 = `src/`）；仓库根只放构建链文件（`package.json` `vite.config.js` `index.html` `.env*`）。`pages.json` = `src/pages.json`，`docs/` 与 `.claude/` 在仓库根、不加前缀。

在本项目「加一个页面」= 动 4 个地方：`api/<domain>.js`（取数）→ `pages/**.vue`（渲染）→ `pages.json`（注册）→ 必要时 `config/dict.js`（枚举）。页面文件本身**照本文件下面的骨架现写**——原模板页 `pages/template/list.vue` 与示例页 `pages/index/index.vue` 已于 2026-09-20 随脚手架清理**全部删除**，不再有可 `cp` 的文件；骨架与当前 `useList` / `app-list-state` 签名逐字核对过，写法可参照现役页 `pages/home/index.vue`。

## 流程（列表页，最常做的一种）

1. **加接口方法** —— URL 先去 `config/endpoints.js` 登记常量（全项目唯一登记表，值不带 `/v2` 前缀与前导斜杠），再在 `api/<domain>.js` 加一个方法（写法与 options 语义见 `rule-api-request`）：
   ```js
   // config/endpoints.js
   export const ENDPOINT_XXX_LIST = 'web/xxx/list';
   // api/xxx.js —— export const xxxApi = { ... }
   list(params, options) { return curl.get(ENDPOINT_XXX_LIST, params, options) }
   ```
2. **建页面文件** —— 按本文件下面的列表页骨架**现写** `pages/<模块>/index.vue`（现役页目录形态统一是「一屏一目录 + `index.vue`」，如 `pages/home/index.vue`；**无模板可 `cp`**，`pages/template/list.vue` 已删除）。
3. **改三处**：
   - `useList` 第一个参数 → 你的接口方法（api 方法不用 `this`，可直接当 fetcher 传）；
   - `params()` → 你的筛选字段；
   - 列表项渲染字段 → 你的数据字段。
4. **注册页面** —— `src/pages.json` 的 `pages` 数组加一项（`path` 写 `pages/<模块>/index`，业务 HUD 页同时写 `"navigationStyle": "custom"` ＋ `backgroundColor`）。**是否开 `"enablePullDownRefresh"` 取决于页壳走哪条下拉通道，见下面「下拉刷新的两档」——`src/pages.json` 里目前 0 处该配置。**
5. **改主色/样式** —— 只动 `<style scoped>` 里该页独有的结构，通用的一律用原子类和 `.card/.list-item/.btn`（业务 HUD 页走 `.hud-page*` / `.hud-frame*` / `.hud-tile*`，见 `rule-style-css`）。
6. **双端编译验证（每批必跑）** —— `npm run verify:mp-weixin && npm run verify:h5`（= `uni build --mode development`；`dev:*` 是 watch 开发、`build:*` 仅发布用，都不作验证入口）。

## 列表页骨架（照抄，不要自己重新发明状态分支）

```vue
<template>
  <!-- 这是 A 档页壳（页面级滚动 + 原生导航栏 + enablePullDownRefresh）。
       业务 HUD 页（自绘 app-navbar + scroll-view）改走 B 档，见下面「下拉刷新的两档」。 -->
  <view class="page">
    <!-- 筛选：选项优先复用列表响应自带的字典，不额外请求 -->
    <scroll-view class="chip-scroll" scroll-x :show-scrollbar="false">
      <view class="chip" :class="{ 'chip--on': filter === '' }" @click="setFilter('')">全部</view>
      <view v-for="opt in options" :key="opt.key" class="chip"
            :class="{ 'chip--on': String(filter) === String(opt.key) }" @click="setFilter(opt.key)">
        {{ opt.value }}
      </view>
    </scroll-view>

    <view class="card">
      <view class="card__head">
        <text class="card__title">标题</text>
        <text class="card__aside">共 {{ total }} 条 · 已加载 {{ items.length }}</text>
      </view>

      <view class="list-item" v-for="item in items" :key="item.id"
            hover-class="list-item--hover" @click="show(item)">
        <view class="avatar-letter">{{ (item.name || '?').slice(0, 1) }}</view>
        <view class="flex1">
          <text class="c-title fz-base">{{ item.name }}</text>
          <text class="c-muted fz-xs">{{ item.create_time ? formatDate(item.create_time, 'mdStr') : '' }}</text>
        </view>
      </view>

      <!-- 骨架/空态/失败重试/加载更·到底 全在这一个组件里，useList 状态直传 -->
      <app-list-state :first-loading="firstLoading" :empty="isEmpty" :error="error"
                      :loading="loading" :finished="finished" @retry="reload" />
    </view>

    <app-modal />
    <app-loading /><!-- 每页各放一次：弹窗 / 请求 loading 靠它们渲染 -->
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useList } from '@/composables/useList'
import { alert } from '@/composables/useModal'
import { yourApi } from '@/api'
import { formatDate } from '@/utils/date'

const filter = ref('')

// 零配置：useList 默认 pageSize=20、pageNumKey='page'、pageSizeKey='page_size'，
// 与当前后端真分页契约（page / page_size，data.{list,total}）逐字吻合，不要再传 override。
// 只有遇到个别接口字段不同时才传 pageNumKey/pageSizeKey 或自定义 pick（见 rule-api-request）。
const { items, body, total, loading, firstLoading, finished, error, isEmpty, reload } =
  useList(yourApi.list, {
    params: () => ({ type_id: filter.value || undefined })  // undefined 由 http 层丢掉
  })

function setFilter(v) {
  if (String(filter.value) === String(v)) return
  filter.value = v
  reload()               // 条件变化必须手动 reload（onLoad 只跑首次）
}
function show(item) { alert({ title: item.name, content: JSON.stringify(item), close: true }) }
</script>
```

**页面里从此不出现** `v-if="loading"/v-else-if="empty"/...` 四件套 —— 优先级只在 `app-list-state` 内定义一次（props 与 `useList` 返回值一一对应，直传即可；真实用法参照 `pages/home/index.vue` 里的 `<app-list-state :first-loading :empty :error :loading :finished @retry>`）。

## 下拉刷新的两档（决定 `pages.json` 要不要开 `enablePullDownRefresh`）

`useList` 内部注册的是**页面级** `onPullDownRefresh` / `onReachBottom`，所以能不能用它自带的下拉/触底，取决于滚动容器是谁：

| 档 | 什么时候用 | 怎么接 |
|---|---|---|
| **A 页面级滚动**（普通页，原生导航栏） | 不自绘顶栏、页面本身滚动 | `pages.json` 该页 `style` 开 `"enablePullDownRefresh": true`；`useList` 的 `onPullDownRefresh` → `refresh()`、`onReachBottom` → `loadMore()` **自动生效，页面零代码** |
| **B `scroll-view` 容器**（现役 HUD 页） | 用页壳 `.hud-page*` + 自绘顶栏 `app-navbar`（`navigationStyle: "custom"`），内容在 `<scroll-view scroll-y>` 里滚 | **`useList` 的下拉通道与触底通道都不触发**（滚动发生在 `scroll-view` 内，页面级 `onPullDownRefresh/onReachBottom` 收不到事件），要自己接： |

```vue
<!-- B 档：下拉指示器 = <app-refresher>（**自带浮层壳**：fixed 定位 / 渐隐 / 跟手位移，
     页面不再包一层 .xx__pull），三段态由 composables/usePullRefresh.js 驱动 -->
<view class="hud-page" @touchstart="onTouchStart" @touchmove="onTouchMove">
  <app-navbar title="…" />
  <app-refresher :show="visible" :state="pullState" :last-at="lastRefreshAt" :offset="offset" />
  <scroll-view scroll-y refresher-enabled refresher-default-style="none" refresher-background="transparent"
               :refresher-triggered="refreshing" :refresher-threshold="threshold"
               @refresherpulling="onPulling" @refresherrefresh="onRefresh"
               @refresherrestore="onPullEnd" @refresherabort="onPullEnd"
               @scrolltolower="loadMore">
    <!-- 槽内只放 0 高占位：原生 refresher 区不放内容，回弹收缩无东西可溢出/遮盖 -->
    <template #refresher><view class="xx__refresher-slot"></view></template>
    <!-- 列表渲染 + <app-list-state ...> -->
  </scroll-view>
</view>
```

```js
// loadMore 是 useList 直接返回的；下拉那一套**不再自己存进行态**，交给 usePullRefresh
const {
  items, body, total, loading, firstLoading, finished, error, isEmpty,
  reload, refresh, loadMore
} = useList(yourApi.list, { params: () => ({ type_id: filter.value || undefined }) })

// 三段态：下拉刷新（向下箭头）→ 松开立即刷新（向上箭头）→ 正在刷新数据中…（黄环 + 最后刷新时刻）
// `can` = 在飞判重（`useList.refresh()` 在 loading 时直接 return，不挡就是白转一圈指示器）
const { pullState, refreshing, lastRefreshAt, offset, visible, threshold,
        onPulling, onRefresh, onPullEnd, onTouchStart, onTouchMove }
  = usePullRefresh({ can: () => !loading.value, onRefresh: refresh })
```

B 档四条不可省的口径（漏一条就出可见故障）：

- **`:refresher-triggered` 必须绑 usePullRefresh 给的 `refreshing`**——它是唯一能把原生刷新区收回去的东西，漏绑 = 指示器转圈卡死；
- **`:refresher-threshold` 必须绑它给的 `threshold`**（= `PULL_THRESHOLD`，**45px**，平台默认值）——它一身两职：判箭头朝哪边的依据，**也是原生刷新区回弹后停留的高度 = 指示器要装进去的那段空档**（指示器骑着空档走）。改小它会让指示器顶到导航栏下缘，见 composable 里该常量的注释；
- **根节点的 `@touchstart/@touchmove` 别删**——下拉距离的兜底来源（原生 `detail.dy` 在真机上尚未验证齐全，见 `usePullRefresh` 的 `dyOf`）；
- **指示器不要自己包 `position: fixed` 的壳**，也不要往 `#refresher` 槽里放视觉内容（原生回弹会溢出遮盖，见 `rule-style-css`）——它自己骑在下拉空档里，钉住不动的写法会让空档还浅时指示器与内容挤在一起。
- **取数函数要如实回报「这次有没有拉回来」**：`lastRefreshAt`（「最后更新 今天 10:49」）的含义是
  **屏幕上这批数据是什么时候取的**，而 `usePullRefresh` 只能靠返回值分辨成败——`try/catch` 只挡得住
  **抛出**那种失败，而本项目的取数路径**都不抛**（「静默失败保旧值」是本项目的一贯口径）。
  ⇒ 两条现成路径**已经替页面回报好了、直接用即可**：① `useList` 的 `reload`/`refresh`/`loadMore`
  返回 boolean（失败/在飞/已到底都是 `false`）；② 页面自建的轮询 composable 的 `reload` 同样应返回 boolean。
  **页面自管的 `load()` 需要自己写**：`catch` 里 `return false`（成功路径 `return true`，
  自己吃掉失败就别说成成功）。

现状核对：`src/pages.json` 全文 **0 处** `enablePullDownRefresh` 配置（自绘导航栏下原生转圈会被栏体盖住、要拉很深才露出）。主包页全部 `navigationStyle: "custom"`，内容都在 `scroll-view` 里滚；**模板的 home / mine / login / demo 分包页全部走 B 档**——**新建 HUD 风格页走 B 档，别再开 A 档配置。**

## 表单页 / 详情页骨架（无模板可抄，照这个结构写）

表单页现成参考：`packages/demo/create/index.vue`（自绘 label + input/textarea + 提交 + 结果态）。**简单表单**照下面 `u-form` 骨架；会弹键盘的多字段输入优先独立整屏页，**不要塞弹层**（判据见 `rule-ui-components`）：

```vue
<template>
  <view class="page">
    <view class="card">
      <view class="card__head"><text class="card__title">编辑</text></view>
      <!-- 表单控件优先用 uview-plus：u-form / u-form-item / u-input / u-textarea /
           u-picker / u-datetime-picker / u-radio / u-checkbox / u-switch / u-upload -->
      <u-form ref="formRef" :model="form" :rules="rules" errorType="toast" labelPosition="left" labelWidth="90">
        <u-form-item label="名称" prop="name"><u-input v-model="form.name" placeholder="请输入" /></u-form-item>
      </u-form>
    </view>

    <!-- 底部主 CTA：footer-bar 已处理安全区，不要再手写 padding-bottom -->
    <view class="footer-bar">
      <view class="btn btn--primary btn--block btn--lg" hover-class="btn--hover" @click="submit">保存</view>
    </view>
    <app-modal />
    <app-loading />
  </view>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { yourApi } from '@/api'
import { toast, successToast } from '@/services/toast'
import { confirm } from '@/composables/useModal'   // 删除/离开二次确认时用
import { route } from '@/services/route'
import { userState } from '@/store'                // 只读，见 rule-auth-state

const form = reactive({ name: '' })
const formRef = ref(null)
const submitting = ref(false)
// rules 不能留空对象：u-form.validate() 在 rules 为空时开发环境直接 return undefined（校验被跳过）
const rules = { name: [{ required: true, message: '请输入名称', trigger: ['blur', 'change'] }] }

onLoad(q => { if (q?.id) form.id = q.id })

async function submit() {
  if (submitting.value) return            // 自己挡重复提交

  // 表单校验单独挡：失败 reject 的是 errors 数组，不是 ApiError，别和下面的错误分支混在一起
  try {
    await formRef.value.validate()        // errorType="toast" 时组件内部已提示第一条错误
  } catch (errors) {
    return
  }

  submitting.value = true
  try {
    // loading 交给 http 层托管，页面不碰 showLoading
    await yourApi.save({ ...form, user_id: userState.user_id }, { loading: true })
    successToast('保存成功')
    await toast('已保存')                 // 要「提示后再返回」就 await
    route.back()                          // 空栈时自动回落首页，不白屏
  } catch (e) {
    // 失败已被 http 层 toast 过，这里只兜需要页面自己处理的分支
    if (e.type === 'business') { /* 按业务码走特殊 UI */ }
  } finally {
    submitting.value = false
  }
}
</script>
```

详情页取数：`onLoad` 里 `await yourApi.detail({ id }, { loading: true })`，用 `ref` + `computed` 渲染，结构类用 `.kv / .kv__k / .kv__v`。没有对应详情接口时先跟后端确认（契约真相源见 `rule-api-request` 的实测契约节）。

## 目录约定

- 主包页面：`pages/<模块>/index.vue`（一屏一目录，如 `pages/home/index.vue`、`pages/login/index.vue`——模板 3 页全部这个形态，不要用扁平 `pages/<模块>/<page>.vue`）。
- 分包页面：`packages/<模块>/<页>/index.vue`（与主包同为目录形态，`path` 写 `<页>/index`），在 `pages.json` 与 `pages` 同级加：
  ```json
  "subPackages": [{ "root": "packages/demo", "pages": [{ "path": "create/index", "style": { "navigationStyle": "custom", "navigationBarTitleText": "新建记录" } }] }]
  ```
  现码已有 `packages/demo` 两页（create / webview）。
  分包规则：**分包可 import 主包，主包不能 import 分包，分包之间也不能互引**。首屏页/高频页（tabBar 页 + 登录页）留主包；跨包跳转一律走 `services/route.js` 的路径常量。
- 页面独有的子组件：**就写在页面同级的 `components/` 下 + 页面显式 import**（不进 easycom 扫描域，这是 `rule-project-structure` 的口径与全仓现行实践）——通用（第二个页面也要用）才提升到根 `components/` 走 easycom。两种落盘形态现码都有，任选其一：
  - 目录式：`pages/<页>/components/<name>/<name>.vue`（目录名=文件名=标签名，与 easycom 同手感）；
  - 平铺单文件式：`pages/<页>/components/<name>.vue`；
  - 分包页同级同理：`packages/<模块>/<页>/components/…`；
  - 只有「一段渲染逻辑、构不成组件」的才留在页面 `<template>` 里，跨页复用的**能力**（不是 UI）才抽 `composables/`。

## 本文件独有的坑

- `useList` **必须在 `setup` 顶层调用**（内部注册 `onLoad/onReachBottom/onPullDownRefresh`），不能放条件分支或 `onLoad` 回调里。
- 下拉/触底要先定档（见上面「下拉刷新的两档」）：**A 档**（页面级滚动）必须在 `pages.json` 该页 `style` 里开 `"enablePullDownRefresh": true`，否则 `useList` 注册的 `onPullDownRefresh` 永不触发；**B 档**（`.hud-page*` + `scroll-view`）开了也没用，得自己接 `@refresherrefresh="refresh"` / `@scrolltolower="loadMore"`。
- ⚠️ `u-form` 三个坑（已核 `uni_modules/uview-plus/components/u-form/u-form.vue`）：`labelWidth` **单位是 px 不是 rpx**（默认 45）；`rules` 传空对象时 `validate()` 开发环境只打一条日志然后 `return undefined`，**校验被静默跳过**；`validate()` `reject(errors 数组)` 不是 `ApiError`，必须单独 `try/catch`。
- **页内 `<input>` 的两条硬要求**（判据全文在 `rule-ui-components` 的硬性禁令清单）：① 会弹键盘的输入不进弹层——多字段表单走独立整屏页，**单字段独立页可页内输入、不要再二次跳**；② 页内 input 挂 `confirm-type="done"` + `@confirm="onConfirm"`（多行 textarea 除外，回车留给换行）。⚠️ `confirm-type` 仅 `type="text"` 生效、iOS 数字键盘无回车键——**自动 focus + `footer-bar` 固定底栏的组合必须真机验**，确认按钮不能被键盘压住。
- 写操作成功后刷新：`await` 接口再 `reload()`；后端回传字段不全，**不要做乐观更新**。
- **`onShow` 里是否无条件重拉列表要按数据量权衡**：模板 demo 首页为了让「创建后返回立刻可见」故意每次 onShow 重拉（数据少）；列表大时改成子页 `mark` dirty、列表 `take` 一次，或单调修订号（见 `rule-performance`）。
- 骨架的可信度级别：列表 / 表单骨架按当前源码签名逐字核对（`useList` 返回值 / `app-list-state` props / `u-form` 三坑），落地后由双端 `npm run verify:mp-weixin && npm run verify:h5` 把编译关，但**不等于真机跑通过**；首次落地先真机验一遍再当模板复用。四态渲染的现役实证是 `pages/home/index.vue` 里的 `<app-list-state>` 用法（数据走 `useList`）。

## 来源

提炼自 `composables/useList.js` / `usePullRefresh.js`、`components/app-list-state` / `app-refresher` 与 `pages/home`、`packages/demo/create` 的现役实现。
