---
name: rule-api-request
description: 在本项目新增或修改接口方法、对接后端、决定用 GET/表单 POST/JSON POST/上传、需要静默请求或托管 loading、以及 catch 请求错误时使用。规定接口 URL 统一登记在 config/endpoints.js、api 层一个域一个文件的写法、curl 四个方法与 options 语义、ApiError 的 type 分支和当前后端实测契约（分页字段 page/page_size、列表在 data.list）。
---

# rule-api-request

> **本文件含「硬性禁令」小节（原 `rules/scaffold-musts.md` §3 已迁入，唯一权威）。页面层通用禁止清单见 `rule-project-structure`。**

所有 HTTP 只有一条路：`api/<domain>.js` → `curl`（`services/http/index.js`）→ `request` 策略层。**页面里永远不出现 `uni.request` 和接口路径字符串。**

## 统一结构（硬约束，2026-11-26 定版：表单，不是 JSON）

所有 api 域文件必须遵守同一形状，`npm run check:api` 会静态检查：

```js
export const demoApi = {
  list(params, options) { return curl.get(ENDPOINT_DEMO_LIST, params, options) },
  create(data, options) { return curl.post(ENDPOINT_DEMO_CREATE, data, options) },
  remove(id, options) { return curl.post(ENDPOINT_DEMO_DELETE, { id }, options) }
};
```

- 方法签名一律 `(params|data, options)` 两参；`options` 必须透传（否则 `useList` 的 `toast:false`、页面的 `loading:true` 全部失效）。
- 响应统一 `{code,msg,data}`，且 `code` 必须能转成数字；非对象 / 缺 code / 非数字一律报「响应格式异常」，只有第三方裸响应才允许 `{ rawResponse: true }`。
- POST 统一 form（`application/x-www-form-urlencoded`）；`curl` 不提供 `postJSON`。
- 路径只从 `config/endpoints.js` 取；数组字段在 GET/POST 都序列化为逗号串，禁止 `key[]=`。

## 用法约定

### 1) 写一个接口方法

URL 常量统一登记在 `config/endpoints.js`（全项目路径集中一个文件，方便查看与修改；业务路径禁止就近写在 api/<domain>.js）：

```js
// config/endpoints.js —— 全项目接口 URL 唯一登记表（按后端文档章节分组，值不带 /v2 前缀）
export const ENDPOINT_DEMO_LIST = 'web/demo/list';

// api/demo.js —— 一个业务域一个文件，方法带 JSDoc，路径只引常量
import { curl } from '@/services/http';
import { ENDPOINT_DEMO_LIST } from '@/config/endpoints';

export const demoApi = {
  /**
   * demo 列表
   * @param {object} query 分页字段由 useList 注入，这里只放业务筛选条件
   */
  list(query, options) { return curl.get(ENDPOINT_DEMO_LIST, query, options) },
};
```

- **新增接口两步**：`config/endpoints.js` 加 `ENDPOINT_<域>_<动作>` 常量（带一行注释注明参数/文档章节）→ `api/<domain>.js` 加方法引用它。
- 方法签名一律 `(params | data, options)` **两参**，`options` 原样透给 `curl` —— 这样页面才能传 `{ toast: false }` / `{ loading: true }`。
- 新业务域：建 `api/<domain>.js` 导出 `<domain>Api`，再去 `api/index.js` 加一行 `export`。
- 页面调用：`import { demoApi } from '@/api'`（走汇总出口，能跳定义）。
- 路径**不带前导斜杠、不带 `/v2`**（`request.js` 统一拼 `rootPath` + `routeVersion`）；完整 `http(s)://` 地址（第三方）不放登记表，就近写在调用处并注明原因。

### 2) curl 四个方法

| 方法 | 用途 | 备注 |
|---|---|---|
| `curl.get(url, params, options)` | 查询 | `params` 转 query，数组展开成 `k=v1&k=v2`，`undefined/null` 自动丢掉 |
| `curl.post(url, data, options)` | 写 | **默认表单** `x-www-form-urlencoded`（后端统一格式），对象经 `toQueryString` 序列化 |
| `curl.upload({ filePath, name='file', formData }, url?, options?)` | 传文件 | 默认口 `ENDPOINT_UPLOAD`（模板后端未内置上传，接入时替换）；multipart 边界交给端上生成 |

⚠️ **数组参数的两种序列化不一致**（两边实现不同，踩过一次就知道）：
- GET 走 `request.js` 的 `buildURL` → `ids=1&ids=2`（重复 key）
- POST 表单走 `utils/qs.js` 的 `toQueryString` → `ids[0]=1&ids[1]=2`（带下标）

后端要的是 `"2,3"` 这种逗号串时，**自己 `join(',')` 再传**，别指望数组自动变过去。

### 3) options 语义（这是本层最需要记的）

```js
{ toast: true,      // 默认 true：失败自动 toast 用户文案。自己接管提示/静默兜底时传 false
  loading: false,   // true：http 层 showLoading + finally hideLoading，页面不碰 loading
  authRetry: true,  // 登录失效是否静默重登并重放一次；登录/绑定接口自身必须传 false
  timeout: 10000 }  // 默认 DEFAULT_TIMEOUT
```

典型写法：
```js
await demoApi.list({ page: 1 }, { loading: true });   // 有转圈、失败自动提示
await demoApi.remove(id, { toast: false });           // 静默，自己处理 e.type
await demoApi.list({ page: 1 });                      // 轮询场景：页面/composable 自管失败
```

### 4) 错误处理：catch 到的永远是 ApiError

```js
import { isApiError, errorTip } from '@/services/http';
import { toast } from '@/services/toast';
import { route } from '@/services/route';

try {
  const body = await demoApi.list(query, { toast: false });
} catch (e) {
  // e: { type, message, code(业务码), status(HTTP码), raw(原始响应) }
  if (e.type === 'network') {
    toast('网络不给力，请重试');
  } else if (e.type === 'auth') {
    route.relaunch();                 // 静默重登已失败，只能重进
  } else {
    toast(e.message);                 // business / http / unknown：后端话术直接用（构造时已归一 body.msg）
  }
}
```

| `type` | 含义 | 页面该怎么反应 |
|---|---|---|
| `network` | 断网/超时/H5 代理没起 | 提示重试（文案 `连接超时，请重试`） |
| `http` | 非 2xx | 一般只上报，不给用户看状态码 |
| `business` | 业务码非 0 | 展示 `e.message`（后端已写好话术） |
| `auth` | 40005 且静默重登未成功 | 走重新进入流程 |
| `guard` | 命中全局业务码守卫（未绑手机/未实名/冻结…，登记在 `services/guards.js`） | **直接忽略**——跳页/弹窗/拨号已由守卫统一处理且自带去重；本就在守卫目标页或想静默处理时给调用传 `{ guard: false }` |

- 判断用 `isApiError(e)` 而不是 `instanceof`（编译降级后 `instanceof` 会失真）。
- 要一句用户可读的文案：`errorTip(e)`。
- 文案字段是 **`e.message`**（Error 标准属性，ApiError 构造时已把 `body.msg` 归一进去）；**没有 `e.msg`**，写了恒 undefined。
- 业务码判断用 `Number(e.code)`（后端 code 可能是字符串）。
- **禁止静默吞异常**：要么让它冒到 http 层的默认 toast，要么自己 `catch` 后一定要有 UI 反应。

### 5) 全局业务码守卫：新增「状态码 → 动作」两步搞定

后端约定「某码返回时全局跳页 / 弹框 / 拨客服」——不写进任何页面，只动两个文件：

1. `config/dict.js` 加常量：`export const CODE_XXX = 码值;`（**0 = 关闭该守卫**，联调前没拿到真实码值就先写 0）
2. `services/guards.js` 登记动作：`registerCodeGuard(CODE_XXX, handler)`。常见形态——
   弹框引导跳页（`pushModal` 后 `route.to` 保栈）／弹框确认后跳页／弹框调设备能力（拨打客服：`callPhone(SERVICE_TEL)`，**号码只存 `config/app.js`**，全项目唯一来源，禁止再写死第二个号）。

机制保证（不用你操心也别绕过）：同码动作未结束 + 结束 1s 内不再重复触发；命中后本请求抛 `ApiError(type='guard')` 且强制不 toast，页面 catch 到忽略；要豁免传 `{ guard: false }`；弹框经 `pushModal` 队列由页面 `<app-modal />` 渲染；接线靠 `main.js` 副作用 import，新增码不需要再动 main/request。

> 码值现状（对齐后端模板 `err_code.go`）：`CODE_UNAUTHORIZED`=40101（模板已登记 → 清会话回登录页）、`CODE_UNBOUND_PHONE`=50011、`CODE_RATE_LIMITED`=40205、demo 段 `CODE_DEMO_NOT_EXIST`=51001 / `CODE_DEMO_NAME_DUP`=51002。
> `40205`（频控）**不进守卫**：窗口按接口不同，由发起页面自行处置（置灰倒计时 / toast）；需要全局动作的码才登记进 `guards.js`。

### 6) 成功返回的是完整响应体

`{ code, msg, data }` —— 业务数据在 `.data`。`code` 无/为 0 视为成功（兼容不包统一结构的第三方接口）。

## 目录约定

- **接口 URL → 只写在 `config/endpoints.js`**（全项目唯一登记表，按后端文档章节分组；放 config 层是因为 `services/session` 与 `api/` 都要引它，config 最底层、两边向下引用不成环）。
- `api/<domain>.js` 只放方法与 JSDoc，路径引常量；一个业务域一个文件。
- 签名/重登/错误归一等策略都在 `services/http/` 内部，**业务开发不需要碰**：`sign.js`（MD5 签名头）、`transport.js`（`uni.request` 与 `uni.uploadFile` 归一）、`error.js`、`request.js`。
- 判据回顾：纯函数不 import services 的放 `utils/`（`qs.js` 序列化、`date.js` 格式化、`threshold.js` 阈值判档就是这类）。

## 当前后端契约（模板后端 go_project_template）

契约唯一真相源：后端仓的 `versions/vN/api-*.md` 版本切片 + `internal/conf/enum_demo.go` / `err_code.go` 实现。
本模板对接的 demo 模块：

- 路径统一带 `/v2` 前缀（`request.js` 拼 `routeVersion`）；`edition` 当前 **`v1.0.0`**（`config/app.js`，必须在后端 `EditionList` 白名单内）。
- 分页入参：`page` / **`page_size`**；列表返回 `data: { list, total }` —— `useList` 默认键名与 `defaultPick` 零配置吻合。
- 登录失效码前端**只认 40005**；后端 40005 → `session.relogin` → 原请求重放一次。
- 40205 频控窗口按接口不同（模板后端 demo 创建撞锁也回 40205）；**失败也计窗口**，页面自行置灰 / toast，不进全局守卫。
- 需登录接口带 `token` + `userid` 头——`sign.js` 自动从 storage 注入。
- 上传接口模板后端未内置（`ENDPOINT_UPLOAD` 是占位）；接入时按后端实际路由替换。
- 判分 / 金额 / 时间一律用后端成品串；前端只做展示格式化，不重算、不拼同义句。

## 本文件独有的现状与坑

- ⚠️ 上面「当前后端实测契约」一节是**会随时间失效的事实**，不是规则：换后端 / 换项目先重写它，也不要把它当长期约定写进代码注释。
- ℹ️ 上传：`curl.upload` 已实现（multipart）；模板后端未内置上传接口，接入时替换 `ENDPOINT_UPLOAD`。
- ℹ️ 构建链（2026-09-20 起）：项目已迁 uni-app CLI（根 `package.json` + `vite.config.js`，业务代码在 `src/`），改动验证跑 `npm run verify:mp-weixin` + `npm run verify:h5`（dev 环境；`build:*` 是 production 模式仅发布用，见 rule-multiplatform 构建节）。UI 库 uview-plus **不走 npm**、在 `src/uni_modules/`；MD5 用 npm 依赖 `blueimp-md5`。
- ℹ️ `body.code` 可能是字符串，http 层已统一按数字比较；页面拿到的是**完整响应体**，业务数据自己取 `.data`。
- ℹ️ 无 `code` 字段的响应一律视为成功（为兼容不包统一结构的第三方地址），这类接口 http 层帮不了你判断。

## 硬性禁令（MUST / MUST NOT）

> 原 `rules/scaffold-musts.md` §3 迁入，**本节是唯一权威**：

- **接口 URL 只允许登记在 `config/endpoints.js`**；禁止在 `api/`、`services/`、页面里内联接口路径字符串（完整 http(s) 第三方地址例外，就近写并注明）。
- 所有 HTTP 只能经 `curl`（`get` / `post` / `upload`）；写接口统一表单，`curl` 不提供 `postJSON`。
- api 方法签名固定 `(params|data, options)`，且 `options` 必须原样透给 `curl` —— 否则页面无法关掉自动 toast、无法托管 loading。
- 失败一律是 `ApiError`，必须按 `e.type`（`network/http/business/auth/guard`）分支处理或至少展示 `e.message`；禁止忽略错误返回值（`guard` 型例外：守卫已全局处理，忽略是唯一正确反应）。
- 判型用 `isApiError(e)`；禁止 `instanceof ApiError`（编译降级后会失真）。
- 数组参数在 GET 与 POST 表单里序列化方式不同（重复 key / 下标 key）；后端要逗号串时自行 `join(',')`。
- 禁止到处手写 `hideLoading()` 收尾；loading 的开关只允许收敛在 `services/toast.js` 的计数逻辑里。
- **按钮点击发起的请求一律传 `{ loading: true }` 托管**（引用计数，请求层 finally 自动收尾）；进页自动加载 / 轮询 / 静默核对可保持无 loading，但按钮请求漏托管视为不合规。按钮侧 in-flight 防重入 + `<app-loading :mask="true" />` 暗遮罩见 `rule-page-services`「硬性禁令」——双保险各管一半，两边都要。
- **契约枚举字段的判档一律写「白名单」（`s === 1 || s === -2`），禁止写「不等于某个值」（`s !== -1`）**：哨兵值通常不止一个，而且同一字段在不同接口的取值域可能不同。白名单对多种取值域都成立，且与字段自己的注释口径天然一致。
- **契约数值字段一律经 `utils/number.js` 的 `toNum` 归一后再判**：空串 / `null` / 非数字统一成 `null`，**`0` 原样返回 `0`**——「没有这个值」与「真的是 0」在展示上是两回事（印 `--` 还是印 `¥0.00`）。判档时连未知档一起想清楚往哪边倒：**拿不准就让未知走「不可操作 / 置灰」那一侧**（fail-closed），别让它 fail-open 到「可点」——可点而点不动比看着不能点更糟。
- **日额度类码与 `40205`（几秒内点太快）必须分开处置**：40205 是接口级频控，**页面**置灰秒级倒计时即可恢复；「今日额度用满」一类的码是次日 0 点 / 客服手工放开才恢复，一律**全局守卫**（弹窗 + 客服入口，**不倒计时、不自动重试**，登记在 `services/guards.js`）。
- **记录列表响应没有 `total` 时，`useList` 直接可用**：它的 `finished` 判据是「`list.length < pageSize` **或** 有 total 且已拉满」。不要为了让 `total` 有位而自己造一个（会破坏「不足一页即到底」这条兜底）。
- **对接一个接口时，契约的「请求参数表」要像响应字段表一样逐格核**：标必填的项少传不报错、编译也不报错，只有真机走到那一步才回 40001。同一条硬前提往往不止一处要用 → 修的时候收进唯一出口，别在几个页面各写一遍。
- **媒体上传按后端频控串行排队**：上传接口常按「用户 + 类型 N 秒」频控，而 `wx.uploadFile` 一次只能带一个文件 → 多选后必须串行、相邻请求留足间隔；大文件优先走后端签名直传 OSS，不要把大文件传给业务服务器。
- **路由 query 里的中文一律 `safeDecode`**（`utils/qs.js`）：`route.to` / `toQueryString` 会 `encodeURIComponent`，部分端 `onLoad` 拿到的是**未解码**串；解不开就原样返回、绝不让 decode 抛错挡页面。
- **契约的「错误码表」不等于后端的实际闸口**：表里没写的码后端也可能回。**判据以「后端实现 + 真机」为准**，拿不准时按更严的那一侧处理（要门槛 / 加 `guard: false` / 只在点击后调），几条相关硬性禁令见 `rule-auth-state`。
