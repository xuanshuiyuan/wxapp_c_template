# v1.0.1 需求：按评审清单全面修复

- **来源**：`.claude/project-meta/versions/v1.0.0/review.md`（2 个 P0 + 13 个 P1 + P2 清单）
- **目标**：把模板从「内部起点」修到「可复制的安全默认模板」
- **用户定版（2026-11-26）**：HTTP 请求体**一律表单**（`application/x-www-form-urlencoded`），不用 JSON；
  数组一律逗号串；响应必须是对象且 `code` 可转数字；只允许 `get` / `post` / `upload` 三种形态。

## 验收

1. 双端 `npm run verify:mp-weixin` / `verify:h5` 通过。
2. `npm run check`（文档引用 / API 结构 / 请求层自检）通过。
3. `init.sh` 临时副本改名 + 端口 + 占位替换后，双端 verify 通过。
4. H5 E2E：登录 → 列表 → 创建 → 预览 → 删除 通过；production 登录页显示「未接入登录」。
5. 后端 demo 全链路 curl 通过（登录 / 列表 / 创建 / 删除 / webview）。