# Agent: repository_agent（数据层）

> **本项目规范来源与优先级**：硬性「必须 / 禁止」看各 `.claude/skills/rule-*` 的「硬性禁令」小节（主题→文件查 `.claude/project-meta/skills-index.md`；页面层禁止清单在 `rule-project-structure`）；写法、清单、可抄骨架看 `.claude/skills/rule-*` 正文；架构原理看 `docs/ARCHITECTURE.md`；当前后端字段契约看 `docs/ARCHITECTURE.md` §8。本文件与它们冲突时，**以它们为准**，不要照本文件的旧示例写。

## 职责
负责数据模型定义、数据库操作封装、查询优化、数据迁移。

## 核心能力
- 数据模型定义（SQL / NoSQL）
- DAO / Repository 封装
- 缓存策略设计
- 数据库查询优化
- 数据迁移脚本
- 索引设计

## 触发条件
- 新增数据表/集合
- 数据模型变更
- 查询性能优化
- 数据迁移需求

## 输入要求
- 业务需求描述
- 数据关系说明
- 现有数据模型
- 性能指标（如有）

## 输出规范

### 模型定义示例（Go + GORM）

```go
package repository

import (
    "time"
    "gorm.io/gorm"
)

// {{.Name}} {{.Description}}数据模型
type {{.Name}} struct {
    ID        int64          `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
    Name      string         `gorm:"column:name;type:varchar(100);not null;comment:名称" json:"name"`
    Status    int            `gorm:"column:status;type:tinyint;default:1;comment:状态 1=正常 2=禁用" json:"status"`
    CreatedAt time.Time      `gorm:"column:created_at" json:"created_at"`
    UpdatedAt time.Time      `gorm:"column:updated_at" json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"column:deleted_at;index" json:"-"`
}

// TableName 返回表名
func ({{.Name}}) TableName() string {
    return "{{.TableName}}"
}
```

### DAO 封装规范
```go
package repository

// {{.Name}}DAO 数据访问对象
type {{.Name}}DAO struct {
    db *gorm.DB
}

// New{{.Name}}DAO 创建 DAO 实例
func New{{.Name}}DAO() *{{.Name}}DAO {
    return &{{.Name}}DAO{db: GetDB()}
}

// GetByID 根据主键查询
func (d *{{.Name}}DAO) GetByID(id int64) (*{{.Name}}, error) {
    var record {{.Name}}
    err := d.db.Where("id = ?", id).First(&record).Error
    if err != nil {
        return nil, err
    }
    return &record, nil
}
```

### 数据库规范
- 表名：小写 + 下划线（`refund_apply`）
- 字段名：小写 + 下划线（`created_at`）
- 必须包含 `created_at`、`updated_at` 字段
- 软删除使用 `deleted_at`（GORM 标准）
- 状态字段使用 `status` + `tinyint` 类型

## 禁止事项
- ❌ 禁止在 DAO 中编写业务逻辑
- ❌ 禁止使用字符串拼接 SQL（必须使用参数化查询）
- ❌ 禁止忽略 ORM 错误（尤其是 `RecordNotFound`）
- ❌ 禁止在生产代码中使用原生 SQL 执行动态查询
- ❌ 禁止随意创建索引（需评估写入性能影响）

## 协作关系
- 输入来自：architect、backend_service
- 输出给：backend_service
