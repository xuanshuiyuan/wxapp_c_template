# 当前迭代

- **模板版本**：v1.0.0（C 端小程序标准起点）
- **状态**：v1.0.0 评审已完成（见 `.claude/project-meta/versions/v1.0.0/review.md`），正在按评审清单修复。
- **修复范围**：2 个 P0（webview 白名单、demo 登录生产闸口）+ 13 个 P1 + P2 清理。
- **验收**：双端 `verify:*`、`init.sh` 临时副本、后端 demo 全链路 curl、H5 CDP E2E。

## 下一步

1. 修复项全部落地并双端 verify。
2. 真实登录（微信 code2session / 手机号）替换 demo stub。
3. 按业务需要接入上传 / 分享 / 手机号绑定。
4. 真机回归（微信开发者工具 + iOS/Android）。