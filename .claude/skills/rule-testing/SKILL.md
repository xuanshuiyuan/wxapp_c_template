---
name: rule-testing
description: 在本项目编写或评审测试用例、引入测试环境（vitest/jest/pytest/go test）、给 useList 等 composables 写单测、或需要确定测试命名/覆盖率/Mock 策略时使用。注意：本项目当前无可运行测试环境，且约定默认不执行测试（除非用户明确要求）。
---

# rule-testing

> 原 `.claude/rules/testing.md` 全量迁入本文件，**本文件是唯一权威**。

## 硬性禁令

- ❌ 禁止测试依赖真实外部服务（一律 Mock）
- ❌ 禁止测试之间有顺序依赖
- ❌ 禁止用 `time.Sleep`/裸等待
- ❌ 禁止用 `panic`/未捕获异常终止测试
- 默认**不运行**测试，除非用户明确要求（项目级约定）
- 引入测试环境时：测试依赖装在独立目录（如 `tests/` 自带 npm 环境），**不得**在仓库根加 `package.json`/构建配置（会打挂 HBuilderX 编译，见 `rule-multiplatform` 禁令）

## 前置现实（先读这条再往下看）

本项目**当前没有可运行的测试环境**：无 `package.json`、无 vitest/jest。因此下文是**将来引入测试时的约定**，不是当前门禁。

## 通用原则

- 用例覆盖：正常场景、异常场景、边界条件。
- 用例名使用中文描述场景；外部依赖必须 Mock；测试金字塔：单元多、集成适量、E2E 少量。

## composables 测试的两个必踩点

- `useList` 在 `setup` 顶层注册 `onLoad / onReachBottom / onPullDownRefresh`（来自 `@dcloudio/uni-app`），单测里**必须先 mock 这三个生命周期注册函数**，否则 import 即报错。
- `useList` 调 fetcher 是**双参**：`fetcher(query, { toast })`，断言要写全第二个参数。
- 分页字段名不是常量：`useList` 默认 `page` / `page_size`，当前后端实际用 `page` / `size`（现状见 `docs/ARCHITECTURE.md` §8）。断言里**跟着被测配置写**，不要把某个后端的字段固化成规则。

```javascript
// 示意（未在本项目跑通，引入测试环境后按实际框架调整）
vi.mock('@dcloudio/uni-app', () => ({ onLoad: vi.fn(), onReachBottom: vi.fn(), onPullDownRefresh: vi.fn() }));

const fetcher = vi.fn().mockResolvedValue({ code: 0, data: { list: [{ id: 1 }], total: 1 } });
const { items, reload } = useList(fetcher, { pageSize: 10, pageSizeKey: 'size' });
await reload();
expect(fetcher).toHaveBeenCalledWith({ page: 1, size: 10 }, { toast: false });
expect(items.value).toHaveLength(1);
```

## 覆盖率要求

- composables：核心逻辑 ≥ 80%；utils：100%；组件：关键交互覆盖。

## 命名规范

- 文件：`xxx.test.js` / `xxx_test.go`；函数：`TestXxx` / `describe('Xxx', ...)`。
- 用例名：`{场景类型}_{具体条件}`，如 `正常情况_有效输入`、`异常情况_空列表`、`边界情况_page为0`。

## 后端语言适配（跨模块/未来后端预留）

- Go：table-driven + testify/assert，外部依赖 Mock。
- Java：JUnit 5 + Mockito。
- Python：pytest + unittest.mock。
- PHP：PHPUnit + Mockery。

## 来源

迁入自 `.claude/rules/testing.md`（全量），最后同步于 2026-09-10（rules 目录已删除）。
