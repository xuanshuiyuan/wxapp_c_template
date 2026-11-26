# 模块：demo（全链路参考实现）

- **首建版本**：模板 v1.0.0
- **complexity**：`low`（登录 stub + 单表 CRUD + web-view 预览，无状态机、无支付）
- **职责**：给新项目一条能跑通的完整链路——登录 → 分页列表 → 创建 → 删除 → 文档预览；
  同时作为 `.claude/project-meta/modules/` 的格式范本。
- **契约真相源**：后端模板 `go_project_template` 的 `internal/conf/enum_demo.go` 与
  `internal/service/web_service/demo.go`；前端 URL 登记表 `src/config/endpoints.js`。

## 前端文件地图

| 层 | 文件 | 说明 |
|---|---|---|
| 接口层 | `src/api/demo.js` | login / list / create / remove 四方法 + `pickDemoList`（useList 自定义 pick） |
| 配置层 | `src/config/endpoints.js` | `ENDPOINT_DEMO_LOGIN/LIST/CREATE/DELETE/PREVIEW` |
| 配置层 | `src/config/dict.js` | `CODE_DEMO_NOT_EXIST=51001` / `CODE_DEMO_NAME_DUP=51002` |
| 复用逻辑层 | `src/composables/useList.js` | 分页 / 下拉 / 触底 / 四态 |
| 页面层 | `src/pages/login/index.vue` | 输入 user_id → `session.login` → 回首页 |
| 页面层 | `src/pages/home/index.vue` | 列表 + 删除二次确认 + 预览入口（B 档页壳） |
| 页面层 | `src/pages/mine/index.vue` | userState 展示 + 退出登录 |
| 页面层（分包） | `src/packages/demo/create/index.vue` | 表单 → create → 展示 doc_preview_url |
| 页面层（分包） | `src/packages/demo/webview/index.vue` | `<web-view>` 打开后端预览链接 |
| 状态 | `src/store/demo.js` | 最近创建结果（列表接口不返回 doc_preview_url） |
| 基础设施 | `src/services/session.js` | 登录态 / 40005 重登 |
| 基础设施 | `src/utils/url.js` | 后端相对地址 → 绝对地址（web-view 必须绝对地址） |

## 依赖关系

- 向下依赖：`services/http`、`services/session`、`services/route`、`config/{endpoints,dict,app}`、`utils/{date,url}`。
- 被依赖：无（demo 是最末端业务模块）。
- 新业务照此结构复制：`api/<域>.js` + `pages|packages` + `config/endpoints` 常量 + 模块知识库三件套。
