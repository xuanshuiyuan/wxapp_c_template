# 项目模块索引

用于 `project-dev` skill 做「用户描述 → 定位模块」的关键词匹配。
**只收录业务模块，不收录基础设施**（请求 / 登录 / 路由 / 样式这些走 `skills/rule-*`）。

| 模块 | 关键词 | 前端路径 | 后端 |
|---|---|---|---|
| `demo`（complexity: low） | demo、示例、登录 stub、列表分页、创建、删除、文档预览、web-view、联调 | `src/api/demo.js` · `src/pages/{home,login,mine}` · `src/packages/demo/*` · `src/store/demo.js` | `go_project_template` 的 demo 模块（`enum_demo.go` / `web_service/demo.go`） |

> 新业务模块照 `modules/demo/` 的三件套建目录：`module.md`（文件地图 / 依赖 / 契约源）、
> `business-logic.md`（代码里看不出来的隐性口径，按 block id 分段）、`changelog.md`（一行一版）。