# QUICK_START.md — Claude Code Agent Team 使用手册

## 概述

本项目配备了一套完整的 Claude Code AI Agent Team 系统，可自动完成从架构设计到代码审查的全流程开发工作。

---

## 如何使用 Claude Code

### 基本交互
直接在对话中输入需求，Claude Code 会自动识别意图并调用合适的 Agent。

### 调用特定 Agent
使用 `@agent-name` 语法直接调用特定 Agent：

```
@architect 请评审当前 uni-app 项目的模块拆分方案
@reviewer 请审查最近一次页面提交的代码
@debugger 排查 demo/list 接口返回异常的问题
@test_agent 为 useList.js 生成单元测试
@frontend_engineer 新增一个订单列表页面
```

---

## Feature 开发流程

### 完整流程（推荐）
1. 描述需求
2. Claude Code 自动调用 `feature.yaml` 工作流
3. 执行顺序：architect → api_designer → backend_service → repository_agent → test_agent → security_agent → reviewer
4. 每个阶段完成后自动进入下一阶段
5. reviewer 为最后一步；是否评审由用户在收尾时决定，执行则通过后方可合并（跳过需记录）

### 手动分步
```bash
# 步骤1：架构设计
@architect 设计一个订单管理模块

# 步骤2：API 设计
@api_designer 基于上述架构设计前后端接口

# 步骤3：业务实现（后端）
@backend_service 实现订单服务业务逻辑

# 步骤4：数据层
@repository_agent 设计订单相关数据表

# 步骤5：前端实现
@frontend_engineer 实现订单列表页面

# 步骤6：测试
@test_agent 生成订单模块测试

# 步骤7：安全审查
@security_agent 审查订单模块安全性

# 步骤8：最终审查
@reviewer 全面审查订单模块代码
```

---

## Bugfix 流程

```bash
# 方式1：自动工作流
@debugger 排查 /pages/template/list 下拉刷新不触发的问题

# 方式2：手动步骤
# 步骤1：定位问题
@debugger 排查登录态丢失导致的 40005 问题

# 步骤2：修复
@backend_service 修复上一步发现的登录态刷新逻辑

# 步骤3：测试
@test_agent 为修复生成回归测试

# 步骤4：审查
@reviewer 审查修复代码
```

---

## Refactor 流程

```bash
@architect 重构请求层，提取公共签名逻辑

# 工作流自动执行：
# architect → backend_service → test_agent → security_agent → reviewer
```

---

## 常用命令

| 命令 | 说明 |
|------|------|
| `@reviewer` | 审查当前变更 |
| `@debugger` | 排查问题 |
| `@test_agent` | 生成测试 |
| `@security_agent` | 安全审查 |
| `@architect` | 架构设计 |
| `@api_designer` | API 设计 |
| `@backend_service` | 业务实现 |
| `@frontend_engineer` | 前端实现 |
| `@repository_agent` | 数据层操作 |
| `@deploy_agent` | 部署发布 |

---

## 推荐工作流

### 日常开发
1. 拉取最新代码
2. 描述需求 → Claude Code 自动执行 feature workflow
3. 审查生成结果
4. HBuilderX/浏览器验证通过后提交 PR
5. 使用 `@reviewer` 做最终审查

### 紧急修复
1. 使用 `@debugger` 快速定位问题
2. 使用 `@frontend_engineer` / `@backend_service` 生成修复
3. 使用 `@test_agent` 补充测试
4. 提交 hotfix PR

### 代码审查
1. 完成开发后
2. 运行 `@reviewer` 进行全面审查
3. 修复发现的问题
4. 再次审查通过后合并

---

## 注意事项

- **变更记录 = commit message 第一行一句**（2026-11-02 起停用 CHANGELOG 审计，季度文件不再人工维护）
- 只记真重要变更：新表/迁移、新接口/契约、状态机、权限闸口、业务口径、跨模块架构；普通 bug / 文案 / 样式 / 字段微调不记
- 只有「代码里看不出来的隐性口径」才写进模块 `business-logic.md`
- 编码规范（硬性「必须 / 禁止」+ 写法细则）在各 `.claude/skills/rule-*`，主题→文件查表见 `.claude/project-meta/skills-index.md`
- 测试默认不执行，需明确要求
- Agent 可单独调用，也可通过 workflow 串联
- CLAUDE.md 是整个系统的唯一真相源
