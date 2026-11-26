---
name: rule-coding-basics
description: 在本项目写任何代码时用：定命名（文件/变量/组件/常量/API 路径）、写注释（中文、解释 why）、控函数长度与参数、决定 const/let、处理魔法数字与调试代码，或需要 Go/Java/Python/PHP 侧风格适配（后端模块预留）时使用。分层归位禁令在 rule-project-structure，不在本文件。
---

# rule-coding-basics

> 原 `.claude/rules/coding_style.md` 全量 + `rules/scaffold-musts.md` §9 迁入本文件，**本文件是唯一权威**。跨主题禁令（页面层/请求/样式/组件/多端）在各自 rule-skill 的「硬性禁令」小节，查表见 `.claude/project-meta/skills-index.md`。

## 硬性禁令（MUST / MUST NOT）

> 原 `rules/scaffold-musts.md` §9（提交前）迁入：

- 禁止把调试用 `console.log` / `debugger` 提交上去（`App.vue` `onLaunch` 的启动自检日志与 `console.error/warn` 是刻意保留的例外）。
- 注释必须解释 **why** 而不是 what；禁止无意义注释（如 `// i++`）。
- 禁止魔法数字与魔法字符串散落（先入 `config/dict.js` 或 `config/app.js` 再引用）。

## 通用规范

### 注释
- 所有代码注释使用中文；注释解释 **why** 而非 **what**。
- 关键逻辑必须有详细中文注释。

### 命名
| 类型 | 规范 | 示例 |
|------|------|------|
| 文件/目录 | 小写，短横线分隔 | `user-service.js` |
| 变量/函数 | 驼峰命名 | `getUserList` |
| 类/组件 | 大驼峰命名 | `UserListPage` |
| 常量 | 全大写 + 下划线 | `CODE_SUCCESS` |
| 数据库表/字段 | 小写 + 下划线 | `user_info.created_at` |
| API 路径 | 小写 + 下划线 | `/api/v1/user_info` |

### 函数
- 函数单一职责；长度控制在 50 行以内。
- 参数超过 5 个改用对象参数。
- 返回值必须统一、明确。

### 通用禁止
- ❌ 禁止拼音命名
- ❌ 禁止单行超过 120 字符
- ❌ 禁止无意义注释
- ❌ 禁止魔法数字（必须定义为常量）
- ❌ 禁止复制粘贴已有逻辑（DRY；重复出现先问该不该抽）

## 前端（uni-app + Vue3 + JS）

- SFC 结构：`<template>`（只渲染）→ `<script setup>`（本项目一律 `<script setup>`，不用 Options API、不用 `setup()` 返回值形态）→ `<style lang="scss" scoped>`（只写本页独有结构）。完整可抄骨架见 `rule-add-page`（skill 不级联加载，需要时显式调用）。
- ES6+：优先 `const`，需重新赋值才用 `let`，避免 `var`；字符串优先单引号；多行对象/数组保留尾逗号；async/await 处理异步，避免回调地狱。
- 页面层「禁止 / 必须」清单（`uni.request`、`uni.showModal`、裸色值、字面量枚举等）→ `rule-project-structure` 的页面层禁止清单。

## 后端语言适配（当前仓库无后端，跨模块/未来后端预留）

- **Go**：`gofmt`；包名小写简短；每个 error 必须检查；用 `fmt.Errorf("...: %w", err)` 包装错误。
- **Java**：4 空格缩进；类名大驼峰、方法名小驼峰；`Slf4j` 日志；异常必须处理或显式抛出。
- **Python**：PEP8；函数名小写 + 下划线；推荐类型注解；用 `logging` 而非 `print`。
- **PHP**：PSR-12；类名大驼峰、方法名小驼峰；使用类型声明；异常处理完整。

## 目录约定

- 常量归位：业务枚举/码值 → `config/dict.js`；全局配置常量 → `config/app.js`；环境 → `config/env.js`。
- 纯函数 → `utils/`；有副作用 → `services/`（判定三问见 `rule-project-structure`）。

## 来源

迁入自 `.claude/rules/coding_style.md`（§1 §2 §3 §4，§2.3 指针改为指向各 skill）+ `rules/scaffold-musts.md` §9，最后同步于 2026-09-10（rules 目录已删除）。
