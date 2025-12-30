# 任务队列与命令行工具需求文档

## 需求一：多任务队列系统

### 需求描述

需要实现一个多任务队列系统，支持不同类型的任务（如注册、下单、充值、提现等）分别排队执行，避免不同类型的任务相互阻塞。

### 功能要求

1. **多队列支持**
   - 每种任务类型拥有独立的队列
   - 不同队列之间互不干扰
   - 支持动态创建新队列类型

2. **队列管理**
   - 队列优先级配置
   - 队列并发数控制（每个队列可配置最大并发数）
   - 队列状态监控（待处理、处理中、已完成、失败）

3. **任务管理**
   - 任务入队（支持优先级）
   - 任务执行（异步执行）
   - 任务重试机制（可配置重试次数和间隔）
   - 任务失败处理（记录失败原因，支持手动重试）

4. **持久化支持**
   - 可选：将任务存储到数据库，支持服务重启后恢复
   - 可选：任务执行历史记录

### 技术实现建议

- **位置**: `src/features/task-queue/`
- **核心类**:
  - `TaskQueueManager`: 队列管理器
  - `TaskQueue`: 单个队列实例
  - `Task`: 任务接口和实现
- **存储**: 可选使用数据库存储任务状态（MongoDB/PostgreSQL）

### 使用示例

```typescript
import { TaskQueueManager } from '@dreamer/dweb/task-queue';

// 创建队列管理器
const queueManager = new TaskQueueManager();

// 注册不同类型的队列
queueManager.registerQueue('register', { concurrency: 5, retry: 3 });
queueManager.registerQueue('order', { concurrency: 10, retry: 2 });
queueManager.registerQueue('recharge', { concurrency: 3, retry: 5 });
queueManager.registerQueue('withdraw', { concurrency: 2, retry: 5 });

// 添加任务到队列
await queueManager.addTask('register', async () => {
  // 注册逻辑
  await registerUser(userData);
});

await queueManager.addTask('order', async () => {
  // 下单逻辑
  await createOrder(orderData);
}, { priority: 'high' });
```

---

## 需求二：后台任务系统

### 需求分析

**问题**: 某些方法计算耗时较长，不能阻塞主进程。

**async/await 分析**:
- ✅ **优点**: 
  - JavaScript/TypeScript 的 async/await 是单线程非阻塞的
  - 对于 I/O 密集型任务（数据库查询、网络请求），async 完全足够
  - 不会阻塞事件循环
- ⚠️ **局限性**:
  - 对于 CPU 密集型任务（大量计算、图像处理），仍会阻塞事件循环
  - 长时间运行的同步计算会阻塞其他请求

### 结论

**对于 I/O 密集型任务（推荐使用 async）**:
- 数据库操作
- API 调用
- 文件读写
- 网络请求

这些任务使用简单的 `async/await` 即可，无需额外实现。

**对于 CPU 密集型任务（需要后台任务）**:
- 大量数据处理
- 图像/视频处理
- 复杂计算
- 批量数据转换

这些任务需要使用 Worker 线程或子进程。

### 功能要求（如果需要实现）

1. **Worker 线程支持**
   - 使用 Deno Worker API
   - 支持传递复杂数据（通过序列化）
   - 支持进度回调

2. **任务管理**
   - 任务状态跟踪
   - 任务取消机制
   - 任务结果获取

### 技术实现建议

- **位置**: `src/features/background-task/`
- **核心类**:
  - `BackgroundTaskManager`: 后台任务管理器
  - `BackgroundTask`: 后台任务封装
- **实现方式**: 使用 Deno Worker API

### 使用示例（如果需要）

```typescript
import { BackgroundTaskManager } from '@dreamer/dweb/background-task';

const taskManager = new BackgroundTaskManager();

// 执行 CPU 密集型任务
const task = await taskManager.run(async () => {
  // 大量计算
  return heavyComputation(data);
});

// 等待结果
const result = await task.result;
```

### 建议

**优先使用 async/await**，只有在确认是 CPU 密集型任务且确实阻塞了主进程时，再考虑实现 Worker 线程版本。

---

## 需求三：命令行工具基类

### 需求描述

需要为命令行工具提供基类，简化命令行开发，并自动处理数据库连接。

### 功能要求

1. **基类功能**
   - 继承自 `Command` 类
   - 自动初始化数据库连接
   - 统一的错误处理
   - 统一的日志输出

2. **数据库自动连接**
   - 在命令执行前自动连接数据库
   - 支持从 `dweb.config.ts` 读取配置
   - 支持从 `main.ts` 读取配置（合并配置）
   - 连接失败时给出友好提示

3. **目录结构**
   - 命令行工具放在 `console/` 目录下
   - 每个命令一个文件，或使用子命令模式

### 技术实现

- **位置**: 
  - 基类: `src/utils/base-command.ts`
  - 命令行工具: `console/` 目录（项目根目录或应用目录）
- **核心类**:
  - `BaseCommand`: 命令行基类

### 目录结构建议

```
project/
├── console/              # 命令行工具目录
│   ├── web3/            # Web3 相关命令
│   │   ├── listen-events.ts
│   │   └── sync-blocks.ts
│   ├── user/            # 用户相关命令
│   │   └── migrate.ts
│   └── cli.ts           # 主入口（可选）
└── src/
    └── utils/
        └── base-command.ts  # 基类
```

### 基类实现示例

```typescript
// src/utils/base-command.ts
import { Command } from '@dreamer/dweb/console';
import { getDatabaseAsync, initDatabaseFromConfig } from '@dreamer/dweb/database';
import { loadConfig, loadMainConfig } from '@dreamer/dweb/core/config';
import type { CommandHandler } from '@dreamer/dweb/console';

export abstract class BaseCommand extends Command {
  protected dbInitialized = false;
  protected appName?: string;

  constructor(name: string, description?: string, appName?: string) {
    super(name, description);
    this.appName = appName;
    
    // 在所有命令执行前自动初始化数据库
    this.before(async () => {
      await this.ensureDatabase();
    });
  }

  /**
   * 确保数据库已连接
   */
  protected async ensureDatabase(): Promise<void> {
    if (this.dbInitialized) {
      return;
    }

    try {
      // 加载配置（合并 dweb.config.ts 和 main.ts）
      const { config: dwebConfig } = await loadConfig(undefined, this.appName);
      const mainConfig = await loadMainConfig(this.appName);
      
      // 合并配置（main.ts 的配置优先级更高）
      const mergedConfig = {
        ...dwebConfig,
        ...mainConfig,
        database: mainConfig?.database || dwebConfig?.database,
      };

      // 初始化数据库
      if (mergedConfig.database) {
        await initDatabaseFromConfig(mergedConfig.database);
        this.dbInitialized = true;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`数据库初始化失败: ${message}`);
    }
  }

  /**
   * 获取数据库连接
   */
  protected async getDatabase() {
    await this.ensureDatabase();
    return await getDatabaseAsync();
  }
}
```

### 使用示例

```typescript
// console/web3/listen-events.ts
import { BaseCommand } from '@dreamer/dweb/utils/base-command';
import { success, info, error } from '@dreamer/dweb/console';

class ListenEventsCommand extends BaseCommand {
  constructor() {
    super('listen-events', '监听 Web3 事件');
    
    this.option({
      name: 'contract',
      alias: 'c',
      description: '合约地址',
      requiresValue: true,
      required: true,
    });
    
    this.option({
      name: 'from-block',
      alias: 'f',
      description: '起始区块',
      type: 'number',
      requiresValue: true,
      defaultValue: 0,
    });
  }

  async execute(args: string[] = Deno.args): Promise<void> {
    await super.execute(args);
    
    // 这里可以直接使用 this.getDatabase()，数据库已自动连接
    const db = await this.getDatabase();
    
    // 执行命令逻辑
    const contract = this.options.contract as string;
    const fromBlock = this.options['from-block'] as number;
    
    info(`开始监听合约 ${contract} 从区块 ${fromBlock} 的事件...`);
    
    // Web3 事件监听逻辑
    // ...
  }
}

// 如果作为独立命令运行
if (import.meta.main) {
  const cmd = new ListenEventsCommand();
  await cmd.execute();
}
```

### 在 CLI 中注册

```typescript
// console/cli.ts
import { Command } from '@dreamer/dweb/console';
import { ListenEventsCommand } from './web3/listen-events.ts';
import { SyncBlocksCommand } from './web3/sync-blocks.ts';

const cli = new Command('my-cli', '我的命令行工具');

// 注册 Web3 相关命令
const web3Cmd = cli.command('web3', 'Web3 相关命令');
web3Cmd.command('listen-events', '监听事件').action(async (args, options) => {
  const cmd = new ListenEventsCommand();
  await cmd.execute(args);
});

web3Cmd.command('sync-blocks', '同步区块').action(async (args, options) => {
  const cmd = new SyncBlocksCommand();
  await cmd.execute(args);
});

await cli.execute();
```

### 配置加载说明

基类会自动加载配置，优先级如下：
1. `main.ts` 中的配置（如果存在）
2. `dweb.config.ts` 中的配置
3. 合并时，`main.ts` 的配置会覆盖 `dweb.config.ts` 的同名配置

这样可以确保命令行工具能够访问到完整的配置（包括 `main.ts` 中注册的插件和中间件）。

---

## 总结

### 优先级建议

1. **需求三（命令行基类）**: 最高优先级，立即实现
   - 基础功能，其他需求可能依赖
   - 实现简单，收益明显

2. **需求一（多任务队列）**: 中等优先级
   - 功能复杂，需要仔细设计
   - 建议先实现内存版本，后续再考虑持久化

3. **需求二（后台任务）**: 最低优先级
   - 大多数场景 async/await 已足够
   - 仅在确认需要 CPU 密集型任务处理时实现

### 实现顺序

1. 先实现命令行基类（需求三）
2. 根据实际需求决定是否需要任务队列（需求一）
3. 评估是否需要后台任务系统（需求二），大多数情况下不需要
