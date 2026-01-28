# MongoDB ORM 删除/清空风险与排查指南

本文档说明 `MongoModel`（`src/features/database/orm/mongo-model.ts`）中**可能清空集合或大规模删除数据**的入口、已做防护，以及如何通过 MongoDB 日志/审计排查“数据库何时被清空”。

---

## 一、会清空或大规模删除的入口

### 1. `truncate()`（显式清空整张集合）

- **位置**：`mongo-model.ts` 约 4086 行  
- **实现**：`db.collection(this.collectionName).deleteMany({})`，删除该模型对应集合内的**所有文档**。  
- **调用场景**：  
  - 测试：`tests/unit/features/database-mongodb.test.ts` 中的 “truncate 清空表” 用例  
  - 文档/示例：`example/routes/docs/features/database.tsx` 中的示例说明  

**结论**：这是**唯一**的“显式清空整张表”的 API。仅应在测试或明确运维场景下使用，生产代码中应避免误用。

---

### 2. `forceDelete(condition)`（静态方法）

- **位置**：`mongo-model.ts` 约 3585 行  
- **实现**：对 `condition` 做 `normalizeCondition` 后执行 `deleteMany(filter)`，**不**走软删除，直接物理删除。  
- **风险**：若传入 `{}`，等价于 `deleteMany({})`，会清空该集合。  
- **已做防护**：在方法开头对“空对象条件”做校验；若 `condition` 为普通对象且 `Object.keys(condition).length === 0`，则 **throw**，并提示：
  - `"[MongoModel] forceDelete({}) 会删除集合内全部文档，已禁止。若确需清空集合，请显式调用 truncate()。"`

因此，直接调用 `Model.forceDelete({})` 会抛错，不会执行删除。

---

### 3. `query().forceDelete()`（链式调用）

- **位置**：`mongo-model.ts` 约 3947 行  
- **实现**：将链式构造的 `_condition` 传给静态方法 `forceDelete(_condition, options)`。  
- **风险**：若从未调用 `.where(...)`，`_condition` 默认为 `{}`，等价于 `forceDelete({})`。  
- **当前行为**：由于静态 `forceDelete` 已禁止空对象，直接执行 `Model.query().forceDelete()` 会触发上述同一异常，**不会**清空集合。

---

### 4. `deleteMany(condition)`（静态方法）

- **位置**：`mongo-model.ts` 约 2339 行  
- **实现**：  
  - 若开启软删除：对符合条件的文档执行 `updateMany` 设置 `deletedAt`，不会物理删全表。  
  - 若**未**开启软删除：通过 adapter 执行 `deleteMany(filter)`；此时若传入 `condition === {}`，会执行 `deleteMany({})`，**会清空该集合**。  
- **当前状态**：未对“空对象条件”做禁止或二次确认。若业务层误写 `Model.deleteMany({})` 且未开软删除，仍可能清空集合。  
- **建议**：若希望与 `forceDelete` 一致，可在 `deleteMany` 内对“空对象条件”同样禁止或要求显式确认（尤其是未启用软删除时）。

---

### 5. `query().deleteMany()`（链式调用）

- **位置**：`mongo-model.ts` 约 3933 行  
- **实现**：将 `_condition` 传给静态 `deleteMany(_condition, options)`。  
- **风险**：未调用 `.where(...)` 时，`_condition` 为 `{}`，行为与上文“静态 `deleteMany({})`”相同；在未开软删除时会清空集合。

---

### 6. 其它模块中的“清空”行为（仅影响特定集合）

- **Session**：`src/features/session.ts` 中 `MongoDBSessionStore.clear()` 会对 **session 集合** 执行 `deleteMany({})`，仅清空 session，不改业务库。  
- **测试**：`tests/unit/features/database-mongodb.test.ts` 的 `cleanupTestDatabase()` 对 `test_users` 等测试集合执行 `deleteMany({})`，仅影响测试环境。

这些不会清空业务主库中的业务表，但若你看到的“被清空”的是 session 或测试库，可重点查 Session 的 `clear()` 或测试/脚本中的清理逻辑。

---

## 二、已实施的防护小结

| 入口 | 是否禁止“空条件” | 说明 |
|------|------------------|------|
| `truncate()` | 否（设计上为显式清空） | 仅建议在测试或明确运维场景使用 |
| `forceDelete({})` | **是** | 抛错，提示改用 `truncate()` |
| `query().forceDelete()` 且未 `.where(...)` | **是** | 因走静态 `forceDelete({})`，同样抛错 |
| `deleteMany({})` | 否 | 未开软删除时会清空集合，可按需加同样校验 |
| `query().deleteMany()` 且未 `.where(...)` | 否 | 同上，依赖静态 `deleteMany` |

---

## 三、如何查“数据库什么时候被清空的”

### 1. MongoDB 运行日志（内存，最近约 1024 条）

在 mongo shell 或驱动中执行：

```javascript
db.adminCommand({ getLog: "global" })
```

返回数组中每条为字符串，包含时间戳和操作类型。在结果中搜索 `delete`、`drop`、`dropDatabase` 等关键字，结合时间戳判断是否有大规模删除或 drop 操作发生的时间点。

---

### 2. mongod 进程日志文件

若 mongod 以 `--logpath` 指定了日志文件，直接查看该文件：

```bash
# 查找最近与 delete、drop 相关的行（示例）
grep -E "delete|drop" /var/log/mongodb/mongod.log
```

可根据时间戳对齐“感觉数据库被清空”的时间，确认是否有对应的 delete/drop 记录。

---

### 3. MongoDB 审计日志（仅 Enterprise）

若使用 MongoDB Enterprise 且启用了审计，可配置记录 CRUD 与 DDL（如 `dropCollection`、`dropDatabase`），在审计日志中按 `atype`、`ts` 等字段查找删除、drop 操作的发生时间与连接信息。

---

### 4. 应用侧自排查

在业务与运维侧建议：

1. **代码与脚本检索**：在仓库中全文搜索  
   `truncate()`、`forceDelete(`、`deleteMany(`、`query().forceDelete()`、`query().deleteMany()`、  
   以及 Session 的 `clear()`、测试/脚本里对业务库的 `deleteMany({})`，确认是否有定时任务、脚本或误用。  
2. **与 MongoDB 日志对照**：把“感觉被清空”的时间段与 `getLog: "global"`、mongod 日志中的 delete/drop 时间对比，看是否一致。  
3. **权限与账号**：确认是否有高权限账号泄露或脚本误连生产库执行了上述接口。

---

## 四、总结

- **会直接清空整张集合的**主要是：`truncate()`，以及误用 `forceDelete({})` 或 `query().forceDelete()` 且未写 `.where(...)`。  
- **现已通过禁止 `forceDelete({})`**，显著降低了“误删全表”的概率；`truncate()` 仍为显式清空入口，应仅在测试或明确需要时调用。  
- 若仍出现“库/表被清空”，优先用 MongoDB 的 `getLog: "global"` 与 mongod 日志按时间排查 delete/drop，再结合应用内对上述 API 与 Session/测试清理的检索，定位调用来源。
