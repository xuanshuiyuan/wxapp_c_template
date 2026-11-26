# wxapp_c_template

可复制的 uni-app（Vue3 + Vite + uview-plus）C 端小程序模板。
`git clone` → `bash init.sh` 改名填占位 → `npm install` → 直接开始写业务。

- 契约真相源：后端模板 [`go_project_template`](../go_project_template)（状态码 / 签名 / 登录态 / 分页 / webview 全部与之对齐）
- 全链路参考实现：**demo 模块**（登录 stub → 列表分页 → 创建 → 删除 → web-view 文档预览）
- 工程约定：`.claude/CLAUDE.md`；按需加载的规则：`.claude/skills/rule-*`

已内置：签名请求层、40005 静默重登重放、统一错误对象、Promise 弹窗 / 引用计数 loading / 自绘 toast、
列表分页与下拉刷新状态机、多端差异适配、设计 token 与版式块、tabBar + 分包骨架。

---

## 快速开始

```bash
# 1. 初始化：输入项目名（全局替换 wxapp_c_template），可选填 appid / 接口域名 / OSS 域名 / 客服电话
bash init.sh

# 2. 安装依赖
npm install

# 3. 开发
npm run dev:mp-weixin   # 微信开发者工具导入 dist/dev/mp-weixin（真机联调只用这个目录）
npm run dev:h5          # http://localhost:5173，/v2 已代理到 127.0.0.1:15000

# 4. 编译验证（每批改动必跑，双端）
npm run verify:mp-weixin
npm run verify:h5

# 5. 发布构建（production 环境；与 verify 共用 dist/build，发布前最后跑）
npm run build:mp-weixin
```

> ⚠️ `verify:*` 与 `build:*` 共用 `dist/build`，后跑者覆盖前跑者；真机联调不要用 `dist/build`。

### REPLACE_* 占位清单（上线前必须全部替换）

```bash
grep -rn 'REPLACE_' . --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=unpackage
```

| 文件 | 占位项 | 说明 |
|---|---|---|
| `src/manifest.json` | `REPLACE_WX_APPID` | 微信小程序 appid（init.sh 可填） |
| `.env.production` | `REPLACE_API_BASE_URL` | 生产接口域名（init.sh 可填） |
| `.env.production` | `REPLACE_OSS_BASE_URL` | OSS / CDN 域名，必须带尾斜杠（init.sh 自动补） |
| `src/config/app.js` | `REPLACE_SERVICE_TEL` | 客服电话（init.sh 可填） |
| `src/config/endpoints.js` | `REPLACE_UPLOAD_ENDPOINT` | 后端上传接口路径（模板后端未内置上传） |
| `.env.production.local`（不提交） | `VITE_API_KEY` | 后端线下发放的签名密钥 |

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

- 小程序 / App：`.env.development` 的 `VITE_HOST_MP` / `VITE_HOST_APP` 指向后端绝对地址（默认 `http://127.0.0.1:15000/`）。
- H5：`VITE_HOST_H5` 留空走相对路径，`vite.config.js` 把 `/v2` 代理到 `127.0.0.1:15000`（后端未开 CORS 也不影响）。
- 免签名：后端 `local/develop` 环境 `DevelopBypass=true`，`.env.development` 的 `VITE_DEVELOP_BYPASS=develop`
  会让请求层带上 `develop: develop` 头跳过签名。生产环境后端该开关恒为 false，必须配 `VITE_API_KEY`。

### 3. 契约对齐点

| 项 | 实现位置 | 取值 |
|---|---|---|
| 统一响应 `{code,msg,data}`，HTTP 恒 200 | `services/http/request.js` | `code=0` 成功 |
| 签名头 `timestamp/sign/source/random/edition` | `services/http/sign.js` | `sign = UPPER(MD5("Source=..&TimeStamp=..&Key=..&Weight=<random>"))` |
| 登录态头 `token` + `userid`，TTL 7200s | `services/http/sign.js` / `services/storage.js` | 40005 → `session.relogin` → 原请求重放一次 |
| `source=1010`（微信小程序 C 端） | `config/app.js` | 网页 C 端为 0110 |
| `edition=v1.0.0`（版本协商白名单） | `config/app.js` | 后端 `EditionList` 未登记的值会被 fail-closed 拒绝 |
| 路径前缀 `/v2` | `config/app.js` `routeVersion` | 业务路径不带 `/v2`，由 request 层统一拼 |
| 读 GET / 写 POST form / 上传 multipart | `services/http/index.js` | 新接口禁用 `postJSON` |
| 分页 `page` / `page_size`，列表 `data.list` | `composables/useList.js` | `total` 缺失时按「不足一页」判到底 |
| 错误码 40005 重登 / 40102 无权限 / 40205 频控 / 50011 未绑手机 | `config/dict.js` | 全局动作在 `services/guards.js` 登记 |
| webview 文档预览仅 query `access_token` | `packages/demo/webview` | 链接由后端 create 接口下发，前端只负责打开 |

> 签名时间戳是**秒级**且与服务器时差需 ≤300s；登录/绑手机这类接口传 `{ authRetry: false }` 防递归。

---

## 目录结构

```
src/
  api/                接口层（一个业务域一个文件；只从 config/endpoints 取路径）
    demo.js           demo 示例域（登录 / 列表 / 创建 / 删除）
  components/         跨页通用组件（easycom 自动注册，只放 app-*）
  composables/        复用逻辑（useList / useModal / usePullRefresh）
  config/             配置与常量（app / env / endpoints / dict / theme）
  pages/              主包页面（tabBar 页必须在主包）
    home/             demo 列表（全链路参考页）
    login/            demo 登录 stub
    mine/             我的
  packages/           分包
    demo/             新建表单 + web-view 文档预览
  services/           请求 / 登录 / 路由 / 弹窗 / 多端能力
    http/             签名 → 传输 → HTTP 状态 → 业务码 → 错误归一
  store/              跨页响应式状态（零依赖 reactive，不上 Vuex/Pinia）
  styles/             scaffold 版式块
  common/css/         theme.scss（唯一取值源）/ base.scss / ColorUI 原子类
  utils/              纯函数（date / number / qs / text / oss / url）
  uni_modules/        uview-plus
```

依赖只能向下：页面 → composables/api → services/store → config/utils。页面层禁止清单见
`.claude/skills/rule-project-structure`。

---

## demo 页说明（全链路参考实现）

| 页面 | 路径 | 演示内容 |
|---|---|---|
| 首页 | `pages/home/index` | `useList` 分页 + `usePullRefresh` 下拉 + 删除二次确认 + 分包跳转 + 文档预览入口 |
| 登录 | `pages/login/index` | 输入 `user_id` → `POST /web/demo/login` → 存 token；冷启动按本地 user_id 静默重登 |
| 我的 | `pages/mine/index` | `userState` 响应式视图 + 退出登录（清会话回登录页） |
| 新建 | `packages/demo/create/index` | 表单校验 → `POST /web/demo/create`（form）→ 展示 `doc_preview_url` |
| 预览 | `packages/demo/webview/index` | 用 `<web-view>` 打开后端 webview 分组链接（仅 query access_token） |

替换真实登录：改 `services/session.js` 的 `doLogin`（微信 code2session / 手机号验证码），
存储、40005 重登、路由拦截这套骨架不需要动。

---

## 设计系统

- 唯一取值源：`src/common/css/theme.scss`；JS 镜像 `src/config/theme.js`（uview 组件的 color prop 只能传字符串）。
- 换新项目主色：改这两个文件的 `$color-primary` 三档 + `theme.primary` 三档即可。
- 版式块：`src/styles/scaffold.scss`（`.card` / `.btn` / `.list-item` / `.kv` / `.chip` / `.hud-page` 等），
  页面优先复用，不要重复造轮子。

---

## .claude 工程系统

- `CLAUDE.md`：常驻硬约束（分层 / 请求契约 / 目录规范 / 工程禁忌）
- `skills/rule-*`：按需加载的开发规则（新增页面、接口、登录态、样式、多端、安全、性能…）
- `skills/project-dev`：需求 → 版本档案 → 实现的完整流程（简单改动可直接做）
- `project-meta/modules/demo/`：模块知识库格式范本；新业务照此建 `modules/<模块>/`
- `project-meta/versions/`：版本档案（requirement / CHANGELOG / API 副本）