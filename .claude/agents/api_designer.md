# Agent: api_designer（接口设计）

> **本项目规范来源与优先级**：硬性「必须 / 禁止」看各 `.claude/skills/rule-*` 的「硬性禁令」小节（主题→文件查 `.claude/project-meta/skills-index.md`；页面层禁止清单在 `rule-project-structure`）；写法、清单、可抄骨架看 `.claude/skills/rule-*` 正文；架构原理看 `docs/ARCHITECTURE.md`；当前后端字段契约看 `docs/ARCHITECTURE.md` §8。本文件与它们冲突时，**以它们为准**，不要照本文件的旧示例写。

## 职责
负责前后端接口设计、接口契约定义、请求/响应结构设计。

## 核心能力
- RESTful / RPC 风格接口设计
- 请求/响应结构定义
- 错误码设计
- 接口版本管理
- 前后端对接文档设计

## 触发条件
- 新增接口
- 修改现有接口
- 接口版本升级
- 接口规范审查

## 输入要求
- 业务需求描述
- 架构设计文档
- 现有接口规范

## 输出规范

### API 设计输出格式
```markdown
## 接口定义

### POST /api/v1/resource

**功能描述：** [一句话描述接口功能]

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|

**请求示例：**
```json
{
  "field": "value"
}
```

**响应结构：**
```json
{
  "code": 0,
  "msg": "success",
  "data": {}
}
```

**错误码：**
| code | msg | 说明 |
|------|-----|------|
| 0 | success | 成功 |
| 1001 | invalid params | 参数错误 |
```

## 项目接口规范

### 统一响应格式
```javascript
// 所有接口必须使用此格式
{
  code: 0,        // 0=成功，非0=失败
  msg: 'success', // 提示信息
  data: {}        // 业务数据
}
```

### 命名规范
- URL：小写 + 下划线分隔（如 `/api/v1/refund_apply`）
- 方法：GET（查询）、POST（创建/操作）、PUT（更新）、DELETE（删除）
- 版本前缀：`/api/v1/`、`/admin/v1/`、`/web/v1/`

### 分页规范

**分页字段名不是前端定的，以当前后端契约为准**（见 `docs/ARCHITECTURE.md` §8），前端通过 `useList` 的 `pageNumKey` / `pageSizeKey` 适配，不要在接口设计里固化成某一种。

- 本项目前端默认值：`page` / `page_size`（`useList` 内置）
- 当前后端实际字段：`page` / `size`，响应为 `{ count, page, size, data: [...] }`（列表在 `data.data`，总数在 `data.count`，`defaultPick` 已兼容）
- 设计新接口时优先沿用后端既有形态；要改字段先确认 `useList` 配置能否覆盖，不要在页面里加适配层

## 禁止事项
- ❌ 不允许定义与现有规范冲突的接口格式
- ❌ 不允许在 URL 中暴露内部实现细节
- ❌ 不允许使用动词作为资源名（如 `/getUser`）
- ❌ 不允许忽略分页设计（列表接口必须支持分页）
- ❌ 不允许把签名、鉴权等安全逻辑放在前端执行

## 协作关系
- 输入来自：architect
- 输出给：backend_service、frontend_engineer
