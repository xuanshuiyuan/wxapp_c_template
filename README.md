# wxapp_c_template

可复制的 uni-app（Vue3 + Vite + uview-plus）C 端小程序模板。
`git clone` → `bash init.sh` 改名填占位 → `npm install` → 直接开始写业务。

- 契约真相源：后端模板 [`go_project_template`](../go_project_template)（状态码 / 签名 / 登录态 / 分页 / webview 全部与之对齐）
- 全链路参考实现：**demo 模块**（登录 stub → 列表分页 → 创建 → 删除 → web-view 文档预览）
- 工程约定：`.claude/CLAUDE.md`；按需加载的规则：`.claude/skills/rule-*`；评审流程：`.claude/project-meta/review-process.md`

已内置：签名请求层、40005 静默重登重放、统一错误对象、Promise 弹窗 / 引用计数 loading / 自绘 toast、
列表分页与下拉刷新状态机、多端差异适配、设计 token 与版式块、tabBar + 分包骨架。

---

## 快速开始

```bash
# 1. 初始化：项目名 / 显示名 / 后端端口 / appid / 接口域名 / OSS 域名 / 客服电话 / 上传路径
bash init.sh

# 2. 安装依赖（Node >= 18）
npm install

# 3. 开发
npm run dev:mp-weixin   # 微信开发者工具导入 dist/dev/mp-weixin（真机联调只用这个目录）
npm run dev:h5          # http://localhost:5173，/v2 已代理到后端端口

# 4. 编译验证（每批改动必跑，双端）
npm run verify:mp-weixin
npm run verify:h5

# 5. 发布构建（production 环境；与 verify 共用 dist/build，发布前最后跑）
npm run build:mp-weixin
```

> ⚠️ `verify:*` 与 `build:*` 共用 `dist/build`，后跑者覆盖前跑者；真机联调不要用 `dist/build`。
> ⚠️ **Windows**：npm 脚本已用 `cross-env`，但真机联调/`init.sh` 仍建议 WSL 或 Git Bash。

### 首次接入 5 步

1. `bash init.sh`：改标识、显示名、后端端口、appid、生产域名。
2. `.env.production.local` 写 `VITE_API_KEY`（后端线下发放，绝不进 git）。
3. 微信后台 → 开发管理 → 业务域名：配置 web-view 预览域名。
4. 真机联调把 `.env.development` 的 `VITE_HOST_MP` 改成 **LAN IP / HTTPS 合法域名**（`127.0.0.1` 在手机上是手机自己）。
5. 替换 `src/static/tabbar/` 图标与 `src/static/loading.png`。

### REPLACE_* 占位清单

```bash
grep -rn 'REPLACE_' . --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=unpackage
```

| 文件 | 占位项 | 说明 |
|---|---|---|
| `src/manifest.json` | `REPLACE_WX_APPID` | 微信小程序 appid（init.sh 可填） |
| `.env.production` | `REPLACE_API_BASE_URL` | 生产接口域名（init.sh 可填） |
| `.env.production` | `REPLACE_OSS_BASE_URL` | OSS / CDN 域名，必须带尾斜杠（init.sh 自动补） |
| `src/config/app.js` | `REPLACE_SERVICE_TEL` | 客服电话（init.sh 可填） |
| `src/config/endpoints.js` | `REPLACE_UPLOAD_ENDPOINT` | 后端上传接口路径（模板后端未内置 C 端上传） |
| `.env.production.local`（不提交） | `VITE_API_KEY` | 后端线下发放的签名密钥 |

> `npm run build:*` 前会跑 `scripts/check-env.mjs`：key / host 仍为空或含 `REPLACE_` 时**直接失败**，避免「能打包但签不出合法请求」。
> 本地只验证编译可临时 `SKIP_ENV_CHECK=1 npm run build:mp-weixin`，不要用于发布。

---

## 与后端模板联调

### 1. 起后端

```bash
cd ../go_project_template
bash init.sh                 # 项目名 + 端口（默认 15000）
# 填 cmd/conf/local/logic.toml 的 MySQL / Redis，建库并导入 docs/sql/schema.sql
make build env=local && make run env=local
```

### 2. 前端配置

- 小程序 / App：`.env.development` 的 `VITE_HOST_MP` / `VITE_HOST_APP` 指向后端绝对地址。
- H5：`VITE_HOST_H5` 留空走相对路径，`vite.config.js` 把 `/v2` 代理到后端（后端未开 CORS 也不影响）。
- 免签名：后端 `local/develop` 环境 `DevelopBypass=true`，`.env.development` 的 `VITE_DEVELOP_BYPASS=develop`
  会带 `develop: develop` 头跳过签名；**代码按 `isProd` 收紧，生产包不会带这个头**。
- 生产：后端该开关恒为 false，必须配 `VITE_API_KEY`。

### 3. 契约对齐点

| 项 | 实现位置 | 取值 |
|---|---|---|
| 统一响应 `{code,msg,data}`，HTTP 恒 200 | `services/http/request.js` | `code=0` 成功；非对象/无 code 报格式异常 |
| 签名头 `timestamp/sign/source/random/edition` | `services/http/sign.js` | `sign = UPPER(MD5("Source=..&TimeStamp=..&Key=..&Weight=<random>"))` |
| 登录态头 `token` + `userid`，TTL 7200s | `services/http/sign.js` / `services/storage.js` | 40005 → `session.relogin` → 原请求重放一次 |
| `source=1010`（微信小程序 C 端） | `config/app.js` | 网页 C 端为 0110 |
| `edition=v1.0.0`（版本协商白名单） | `config/app.js` | 后端 `EditionList` 未登记的值会被 fail-closed 拒绝 |
| 路径前缀 `/v2` | `config/app.js` `routeVersion` | 业务路径不带 `/v2`，由 request 层统一拼 |
| 读 GET / 写 POST form / 上传 multipart | `services/http/index.js` | **2026-11-26 定版：表单，不是 JSON**；`curl` 不提供 `postJSON`；数组统一逗号串；禁止绕过请求层 |
| 分页 `page` / `page_size`，列表 `data.list` | `composables/useList.js` | `total` 缺失时按「不足一页」判到底 |
| 错误码 40005 重登 / 40101 未登录 / 40102 无权限 / 40205 频控 / 50011 未绑手机 | `config/dict.js` | 全局动作在 `services/guards.js` 登记 |
| webview 文档预览仅 query `access_token` | `packages/demo/webview` | 只允许后端同源链接（`utils/url.js` 白名单） |

> 签名不是身份边界：`VITE_API_KEY` 会进客户端产物、可被提取；真正的鉴权是 token + 服务端身份认定。

---

## 模板能力与未内置项

| 能力 | 状态 |
|---|---|
| 请求链 / 登录态 / 40005 / 守卫 | ✅ 已内置 |
| 页面骨架 / 列表四态 / 下拉刷新 | ✅ 已内置 |
| 设计 token / 版式块 / 10 个通用组件 | ✅ 已内置 |
| demo 登录 stub | ⚠️ **仅非 production**；生产 `login()` 直接 fail-closed，必须替换 |
| 微信 `wx.login → code2session` / 手机号绑定 | ❌ 需接入（改 `services/session.js` 的 `doLogin()`） |
| 分享 `onShareAppMessage` / `onShareTimeline` | ❌ 需按页面接入（模板只留约定） |
| 上传 | ⚠️ `curl.upload` 已有；后端模板无 C 端上传路由，`ENDPOINT_UPLOAD` 是占位 |
| 支付入口 | ❌ 不进骨架（与商户号/资质强绑定），只留接入位置文档 |
| 定位 / 扫码 / 文档预览 / 横屏 | ⚠️ `services/platform.js` 能力库；按需使用，manifest 权限按需加回 |

---

## 目录结构

```
src/
  api/                接口层（一个业务域一个文件；只从 config/endpoints 取路径）
    demo.js           demo 示例域（列表 / 创建 / 删除）
  components/         跨页通用组件（easycom 自动注册，只放 app-*）
  composables/        复用逻辑（useList / useModal / usePullRefresh）
  config/             配置与常量（app / env / endpoints / dict / theme）
  pages/              主包页面（tabBar 页必须在主包）
    home/             demo 列表（全链路参考页）
    login/            demo 登录 stub（production fail-closed）
    mine/             我的 / 退出登录 / 客服电话
  packages/           分包
    demo/             新建表单 + web-view 文档预览
  services/           请求 / 登录 / 路由 / 弹窗 / 多端能力
    http/             签名 → 传输 → HTTP 状态 → 业务码 → 错误归一
  store/              跨页响应式状态（零依赖 reactive，不上 Vuex/Pinia）
  styles/             scaffold 版式块
  common/css/         theme.scss（唯一取值源）/ base.scss / ColorUI 原子类
  utils/              纯函数（date / number / qs / text / oss / url）
  uni_modules/        uview-plus
scripts/              check-env / check-refs / check-api / check-http
```

依赖只能向下：页面 → composables/api → services/store → config/utils。

---

## demo 页说明（全链路参考实现）

| 页面 | 路径 | 演示内容 |
|---|---|---|
| 首页 | `pages/home/index` | `useList` 分页 + `usePullRefresh` 下拉 + 删除二次确认 + 分包跳转 + 文档预览入口 |
| 登录 | `pages/login/index` | 输入 `user_id` → `POST /web/demo/login` → 存 token；**production 禁止** |
| 我的 | `pages/mine/index` | `userState` 响应式视图 + 退出登录 + 客服电话 |
| 新建 | `packages/demo/create/index` | 表单校验 → `POST /web/demo/create`（form）→ 展示 `doc_preview_url` |
| 预览 | `packages/demo/webview/index` | 用 `<web-view>` 打开后端 webview 链接（仅 query access_token + 同源白名单） |

替换真实登录：改 `services/session.js` 的 `doLogin(id)`（微信 code2session / 手机号验证码），
存储、40005 重登、路由拦截这套骨架不需要动。**生产环境 demo 登录会直接拒绝，直到你完成替换。**

---

## 设计系统

- 唯一取值源：`src/common/css/theme.scss`；JS 镜像 `src/config/theme.js`（uview 组件的 color prop 只能传字符串）。
- 换主色不止两个文件：`theme.scss` + `theme.js` + `pages.json` 窗口色（约 14 处）+ `src/static/tabbar/` PNG。
- 版式块：`src/styles/scaffold.scss`（`.card` / `.btn` / `.list-item` / `.kv` / `.chip` / `.hud-page` 等），
  页面优先复用，不要重复造轮子。

---

## 上线前必须处理

- [ ] **替换 demo 登录**：`session.doLogin()` 改为微信 code2session / 手机号验证码；确认生产后端不开放 `/web/demo/login`。
- [ ] **webview 白名单**：保持 `utils/url.js` 的同源校验；如文档域名不同，扩展白名单并写清。
- [ ] **替换全部 `REPLACE_*`**：appid / API 域名 / OSS 域名 / 客服电话 / 上传路径。
- [ ] **配 `VITE_API_KEY`** 到 `.env.production.local`，确认 `npm run check:env` 通过。
- [ ] **微信后台业务域名**：web-view 预览域名。
- [ ] **真机联调**：`VITE_HOST_MP` 改 LAN IP/HTTPS 合法域名；确认 `dist/dev` 导入。
- [ ] **替换 tabbar 图标 / loading 图**。
- [ ] **H5 tab 页底部**：实测不被 tabBar 盖住（模板已写 `--tab-overlay`）。
- [ ] **发布前最后跑 `build:*`**：避免把 `dist/build` 里的 dev 包发上生产。

## 已知限制

- 上传：后端模板只有 B 端上传类型，C 端上传需后端补路由。
- 预览链接：后端 demo 文档 token 只有 5 分钟，`lastCreated` 是短期入口，不是持久文档中心。
- 签名：客户端密钥可被提取，签名不是安全边界。
- uni-app / uview-plus 版本锁定，升级需整体回归。
- 无自动化单测/CI；仓库提供 `npm run check`（文档引用 + API 结构 + 请求层）与 `check:env`（生产环境）。
