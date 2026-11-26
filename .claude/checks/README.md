# Checks

> 自定义检查规则目录

本目录用于存放项目自定义的静态检查、格式检查、安全扫描等规则。

## 检查类型

- **pre-commit**：提交前自动运行的检查
- **lint**：代码风格检查
- **security**：安全扫描规则
- **architecture**：架构合规检查

## 使用方式

1. 将检查脚本放在本目录下
2. 在 CI/CD 或 git hook 中调用
3. 检查失败时阻止提交/合并

## 示例规则

```bash
# 检查是否提交了 console.log
grep -r "console\.log" pages/ api/ services/ composables/

# 检查是否硬编码了密钥
grep -rE "(password|secret|apiKey|appid).*=" config/ services/ api/
```

## 注意事项

- 检查规则应保持轻量，避免过度阻塞
- 新规则加入时需要同步更新文档
- 规则变更写进 commit message 第一行即可（CHANGELOG 审计已于 2026-11-02 停用）
