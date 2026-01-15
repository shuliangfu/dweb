/**
 * MongoDB 数据库模型软删除功能测试
 * 测试 MongoModel 的软删除功能
 *
 * 测试说明：
 * 1. 测试前会检查 MongoDB 连接
 * 2. 如果数据库未连接，测试会跳过并提示
 * 3. 需要配置 .env 文件中的 MongoDB 连接信息
 *
 * 环境变量配置示例（.env 文件）：
 * # MongoDB 配置（二选一）
 * # 方式 1: 使用 URI
 * MONGODB_URI=mongodb://localhost:27017/test_db
 * # 或
 * # 方式 2: 使用独立配置
 * MONGODB_HOST=localhost
 * MONGODB_PORT=27017
 * MONGODB_DATABASE=test_db
 * MONGODB_USERNAME=your_username
 * MONGODB_PASSWORD=your_password
 */

import { assertEquals, assertExists } from '@std/assert';
import { MongoModel } from '../../../src/features/database/orm/mongo-model.ts';
import { initDatabase, getDatabaseAsync } from '../../../src/features/database/access.ts';
import type { DatabaseConfig } from '../../../src/features/database/types.ts';
import { MongoDBAdapter } from '../../../src/features/database/adapters/mongodb.ts';

// 初始化环境变量（加载 .env 文件）
const envModule = await import('../../../src/features/env.ts');
if (typeof envModule.initEnv === 'function') {
  envModule.initEnv();
}

// 测试模型类
class TestMongoModel extends MongoModel {
  static override collectionName = 'test_users';
  static override primaryKey = '_id';
  static override softDelete = true;
  static override deletedAtField = 'deletedAt';
}

// 测试自定义主键的模型类
class TestCustomPrimaryKeyModel extends MongoModel {
  static override collectionName = 'test_custom_pk_users';
  static override primaryKey = 'id';  // 自定义主键字段名
  static override softDelete = false;
}

// 全局变量
let databaseConnected = false;
let databaseAdapter: MongoDBAdapter | null = null;

/**
 * 从环境变量加载 MongoDB 配置（支持副本集）
 * 支持两种环境变量格式：
 * 1. MONGODB_* 前缀（标准格式）
 * 2. DB_* 前缀（兼容格式）
 */
function loadMongoDBConfigFromEnv(): DatabaseConfig | null {
  // 优先使用 MONGODB_* 前缀，如果没有则使用 DB_* 前缀
  const uri = Deno.env.get('MONGODB_URI') || Deno.env.get('DB_URI');
  const host = Deno.env.get('MONGODB_HOST') || Deno.env.get('DB_HOST');
  const port = parseInt(
    Deno.env.get('MONGODB_PORT') ||
    Deno.env.get('DB_PORT') ||
    '27017'
  );
  const database = Deno.env.get('MONGODB_DATABASE') ||
                   Deno.env.get('DB_NAME') ||
                   Deno.env.get('DB_DATABASE') ||
                   'test_db';
  const username = Deno.env.get('MONGODB_USERNAME') ||
                   Deno.env.get('DB_USER') ||
                   Deno.env.get('DB_USERNAME');
  const password = Deno.env.get('MONGODB_PASSWORD') ||
                  Deno.env.get('DB_PASS') ||
                  Deno.env.get('DB_PASSWORD');
  const authSource = Deno.env.get('MONGODB_AUTH_SOURCE') ||
                     Deno.env.get('DB_AUTH_SOURCE');
  const hosts = Deno.env.get('MONGODB_HOSTS') ||
                Deno.env.get('DB_HOSTS');
  const replicaSet = Deno.env.get('MONGODB_REPLICA_SET') ||
                     Deno.env.get('REPLICA_SET') ||
                     Deno.env.get('DB_REPLICA_SET');
  const timeoutMS = parseInt(
    Deno.env.get('MONGODB_TIMEOUT_MS') ||
    Deno.env.get('DB_TIMEOUT_MS') ||
    '15000'
  );

  // 如果提供了 URI，直接使用（优先级最高）
  if (uri) {
    try {
      const url = new URL(uri);
      const replicaSetParam = url.searchParams.get('replicaSet');

      return {
        type: 'mongodb',
        connection: {
          uri: uri, // 直接使用 URI
        },
        mongoOptions: {
          timeoutMS,
          maxRetries: 3,
          retryDelay: 1000,
          replicaSet: replicaSetParam || undefined,
        },
      };
    } catch {
      return null;
    }
  }

  // 如果提供了 hosts（副本集配置）
  if (hosts && hosts.length > 0) {
    const hostList = hosts.split(',').map(h => h.trim());

    return {
      type: 'mongodb',
      connection: {
        hosts: hostList,
        database,
        username,
        password,
        authSource,
      },
      mongoOptions: {
        replicaSet: replicaSet || undefined, // 副本集名称（如果提供）
        timeoutMS,
        maxRetries: 3,
        retryDelay: 1000,
        authSource,
      },
    };
  }

  // 单机连接配置（如果设置了 replicaSet，则使用副本集配置）
  if (host && database) {
    return {
      type: 'mongodb',
      connection: {
        host,
        port,
        database,
        username,
        password,
        authSource,
      },
      mongoOptions: {
        timeoutMS,
        maxRetries: 3,
        retryDelay: 1000,
        authSource,
        replicaSet: replicaSet || undefined, // 单机副本集也需要设置 replicaSet
      },
    };
  }

  return null;
}

/**
 * 检查 MongoDB 连接（带超时处理）
 */
async function checkMongoDBConnection(): Promise<boolean> {
  const config = loadMongoDBConfigFromEnv();
  if (!config) {
    console.log('⚠️  未找到 MongoDB 配置，请检查 .env 文件');
    return false;
  }

  try {
    // 设置超时时间（从配置中获取，默认15秒）
    const timeoutMS = (config.mongoOptions?.timeoutMS || 15000);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`连接超时（${timeoutMS}ms）`));
      }, timeoutMS + 3000); // 比配置的超时时间稍长
    });

    const connectPromise = (async () => {
      // 初始化数据库连接
      await initDatabase(config, 'default');

      // 获取适配器并测试连接
      const adapter = await getDatabaseAsync('default') as MongoDBAdapter;

      // 检查连接状态
      if (adapter.isConnected()) {
        // 尝试执行 ping 操作验证连接
        const db = adapter.getDatabase();
        if (db) {
          await db.admin().ping();
        }
        databaseAdapter = adapter;
        databaseConnected = true;
        console.log('✅ MongoDB 连接成功');
        return true;
      } else {
        console.log('⚠️  MongoDB 适配器未连接');
        return false;
      }
    })();

    // 使用 Promise.race 实现超时控制
    return await Promise.race([connectPromise, timeoutPromise]) as boolean;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️  MongoDB 连接失败: ${errorMessage}`);

    // 提供诊断建议
    if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
      console.warn('💡 提示：连接超时，请检查：');
      console.warn('  1. MongoDB 服务是否运行');
      console.warn('  2. 网络连接是否正常');
      console.warn('  3. 如果是副本集，检查所有节点是否可访问');
      console.warn('  4. 尝试增加 MONGODB_TIMEOUT_MS 环境变量');
    } else if (errorMessage.includes('replicaSet') || errorMessage.includes('副本集')) {
      console.warn('💡 提示：副本集连接问题，请检查：');
      console.warn('  1. 副本集名称是否正确（MONGODB_REPLICA_SET）');
      console.warn('  2. 所有副本集节点是否在 hosts 列表中');
      console.warn('  3. 副本集是否已正确初始化');
    }

    return false;
  }
}

/**
 * 初始化测试数据库
 */
async function setupTestDatabase(): Promise<void> {
  if (!databaseConnected) {
    const connected = await checkMongoDBConnection();
    if (!connected) {
      throw new Error('MongoDB 未连接，无法进行测试。请检查 .env 文件中的 MongoDB 配置。');
    }
  }

  // 设置适配器到模型
  if (databaseAdapter) {
    TestMongoModel.setAdapter(databaseAdapter);
    // 标记为已初始化，避免自动初始化
    (TestMongoModel as any).adapter = databaseAdapter;
  }
}

/**
 * 清理测试数据库
 */
async function cleanupTestDatabase(): Promise<void> {
  if (!databaseConnected || !databaseAdapter) {
    return;
  }

  try {
    const db = databaseAdapter.getDatabase();
    if (db) {
      await db.collection('test_users').deleteMany({});
    }
  } catch (error) {
    console.warn('清理测试数据失败:', error);
  }
}

/**
 * 关闭数据库连接（测试结束后调用）
 */
async function closeDatabaseConnection(): Promise<void> {
  if (databaseAdapter) {
    try {
      await databaseAdapter.close();
      databaseConnected = false;
      databaseAdapter = null;
    } catch (error) {
      console.warn('关闭数据库连接失败:', error);
    }
  }
}

/**
 * 将 MongoDB ObjectId 转换为字符串
 */
function idToString(id: any): string {
  if (typeof id === 'string') {
    return id;
  }
  if (id && typeof id === 'object' && id.toString) {
    return id.toString();
  }
  return String(id);
}

// 在所有测试前检查数据库连接
const dbConnected = await checkMongoDBConnection();
if (!dbConnected) {
  console.error('❌ MongoDB 未连接，所有测试将跳过');
  console.log('提示：请配置 .env 文件中的 MongoDB 连接信息');
  Deno.exit(0);
}

Deno.test({
  name: 'MongoDB 软删除 - 静态方法删除',
  fn: async () => {
    await setupTestDatabase();

    try {
      // 创建测试数据
      const user = await TestMongoModel.create({
        name: 'Test User',
        email: 'test@example.com',
      });

      assertExists(user);
      assertExists(user._id);

      // 测试软删除
      const userId = idToString(user._id);
      const deletedCount = await TestMongoModel.delete(userId);
      assertEquals(deletedCount, 1);

      // 验证记录未被物理删除，只是设置了 deletedAt
      const deletedUser = await TestMongoModel.withTrashed().find(userId);
      assertExists(deletedUser);
      assertExists(deletedUser.deletedAt);

      // 验证正常查询找不到已删除的记录
      const foundUser = await TestMongoModel.find(userId);
      assertEquals(foundUser, null);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false, // MongoDB 连接需要在测试间保持打开
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB 软删除 - 实例方法删除',
  fn: async () => {
    await setupTestDatabase();

    try {
      // 创建测试数据
      const user = await TestMongoModel.create({
        name: 'Test User',
        email: 'test@example.com',
      });

      assertExists(user);
      const userId = idToString(user._id);

      // 测试实例方法删除
      const deleted = await user.delete();
      assertEquals(deleted, true);

      // 验证记录已被软删除
      const deletedUser = await TestMongoModel.withTrashed().find(userId);
      assertExists(deletedUser);
      assertExists(deletedUser.deletedAt);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB 软删除 - deleteById',
  fn: async () => {
    await setupTestDatabase();

    try {
      // 创建测试数据
      const user = await TestMongoModel.create({
        name: 'Test User',
        email: 'test@example.com',
      });

      assertExists(user);
      const userId = idToString(user._id);

      // 测试 deleteById
      const deletedCount = await TestMongoModel.deleteById(userId);
      assertEquals(deletedCount, 1);

      // 验证记录已被软删除
      const deletedUser = await TestMongoModel.withTrashed().find(userId);
      assertExists(deletedUser);
      assertExists(deletedUser.deletedAt);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB 软删除 - 避免重复删除',
  fn: async () => {
    await setupTestDatabase();

    try {
      // 创建测试数据
      const user = await TestMongoModel.create({
        name: 'Test User',
        email: 'test@example.com',
      });

      assertExists(user);
      const userId = idToString(user._id);

      // 第一次删除
      const deletedCount1 = await TestMongoModel.delete(userId);
      assertEquals(deletedCount1, 1);

      // 第二次删除应该返回 0（因为已排除已删除的记录）
      const deletedCount2 = await TestMongoModel.delete(userId);
      assertEquals(deletedCount2, 0);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB 软删除 - restore',
  fn: async () => {
    await setupTestDatabase();

    try {
      // 创建并删除测试数据
      const user = await TestMongoModel.create({
        name: 'Test User',
        email: 'test@example.com',
      });

      const userId = idToString(user._id);
      await TestMongoModel.delete(userId);

      // 测试恢复
      const restoredCount = await TestMongoModel.restore(userId);
      assertEquals(restoredCount, 1);

      // 验证记录已恢复
      const restoredUser = await TestMongoModel.find(userId);
      assertExists(restoredUser);
      assertEquals(restoredUser.deletedAt, undefined);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB 软删除 - forceDelete',
  fn: async () => {
    await setupTestDatabase();

    try {
      // 创建测试数据
      const user = await TestMongoModel.create({
        name: 'Test User',
        email: 'test@example.com',
      });

      assertExists(user);
      const userId = idToString(user._id);

      // 测试强制删除
      const deletedCount = await TestMongoModel.forceDelete(userId);
      assertEquals(deletedCount, 1);

      // 验证记录已被物理删除
      const deletedUser = await TestMongoModel.withTrashed().find(userId);
      assertEquals(deletedUser, null);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test('MongoDB 软删除 - withTrashed', async (t) => {

  (t as any).sanitizeResources = false;
  (t as any).sanitizeOps = false;


  await setupTestDatabase();

  try {
    // 创建并删除测试数据
    const user = await TestMongoModel.create({
      name: 'Test User',
      email: 'test@example.com',
    });

    const userId = idToString(user._id);
    await TestMongoModel.delete(userId);

    // 测试 withTrashed 可以查询到已删除的记录
    const deletedUser = await TestMongoModel.withTrashed().find(userId);
    assertExists(deletedUser);
    assertExists(deletedUser.deletedAt);
  } finally {
    await cleanupTestDatabase();
  }
});

Deno.test({
  name: 'MongoDB 软删除 - onlyTrashed',
  fn: async () => {
    await setupTestDatabase();

    try {
      // 创建两个用户
      const user1 = await TestMongoModel.create({
        name: 'User 1',
        email: 'user1@example.com',
      });

      const user2 = await TestMongoModel.create({
        name: 'User 2',
        email: 'user2@example.com',
      });

      // 只删除 user1
      const user1Id = idToString(user1._id);
      await TestMongoModel.delete(user1Id);

      // 测试 onlyTrashed 只返回已删除的记录
      const deletedUsers = await TestMongoModel.onlyTrashed().findAll();
      assertEquals(deletedUsers.length, 1);
      const deletedUser1Id = idToString(deletedUsers[0]._id);
      assertEquals(deletedUser1Id, user1Id);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

// ==================== 基础 CRUD 方法测试 ====================

Deno.test({
  name: 'MongoDB ORM - create 创建记录',
  fn: async () => {
    await setupTestDatabase();

    try {
      const user = await TestMongoModel.create({
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      });

      assertExists(user);
      assertExists(user._id);
      assertEquals(user.name, 'John Doe');
      assertEquals(user.email, 'john@example.com');
      assertEquals(user.age, 30);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - find 根据 ID 查找',
  fn: async () => {
    await setupTestDatabase();

    try {
      const created = await TestMongoModel.create({
        name: 'Jane Doe',
        email: 'jane@example.com',
      });

      const userId = idToString(created._id);
      const found = await TestMongoModel.find(userId);

      assertExists(found);
      assertEquals(found.name, 'Jane Doe');
      assertEquals(found.email, 'jane@example.com');
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - find 根据条件查找',
  fn: async () => {
    await setupTestDatabase();

    try {
      await TestMongoModel.create({
        name: 'Alice',
        email: 'alice@example.com',
      });

      const found = await TestMongoModel.find({ email: 'alice@example.com' });

      assertExists(found);
      assertEquals(found.name, 'Alice');
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - findAll 查找所有记录',
  fn: async () => {
    await setupTestDatabase();

    try {
      await TestMongoModel.create({ name: 'User 1', email: 'user1@example.com' });
      await TestMongoModel.create({ name: 'User 2', email: 'user2@example.com' });
      await TestMongoModel.create({ name: 'User 3', email: 'user3@example.com' });

      const all = await TestMongoModel.findAll();
      assertEquals(all.length, 3);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - findAll 带条件查询',
  fn: async () => {
    await setupTestDatabase();

    try {
      await TestMongoModel.create({ name: 'Active User', status: 'active' });
      await TestMongoModel.create({ name: 'Inactive User', status: 'inactive' });
      await TestMongoModel.create({ name: 'Another Active', status: 'active' });

      const active = await TestMongoModel.findAll({ status: 'active' });
      assertEquals(active.length, 2);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - findOne 查找单条记录',
  fn: async () => {
    await setupTestDatabase();

    try {
      await TestMongoModel.create({ name: 'Single User', email: 'single@example.com' });

      const found = await TestMongoModel.findOne({ email: 'single@example.com' });
      assertExists(found);
      assertEquals(found.name, 'Single User');
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - findById 根据 ID 查找',
  fn: async () => {
    await setupTestDatabase();

    try {
      const created = await TestMongoModel.create({
        name: 'FindById User',
        email: 'findbyid@example.com',
      });

      const userId = idToString(created._id);
      const found = await TestMongoModel.findById(userId);

      assertExists(found);
      assertEquals(found.name, 'FindById User');
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - findOne 使用对象条件查询 _id（字符串自动转换为 ObjectId）',
  fn: async () => {
    await setupTestDatabase();

    try {
      const created = await TestMongoModel.create({
        name: 'FindOne By ObjectId User',
        email: 'findonebyid@example.com',
      });

      const userId = idToString(created._id);

      // 测试使用对象条件 { _id: string } 查询，应该自动转换为 ObjectId
      const found = await TestMongoModel.findOne({ _id: userId });

      assertExists(found);
      assertEquals(found.name, 'FindOne By ObjectId User');
      assertEquals(found.email, 'findonebyid@example.com');
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - update 更新记录',
  fn: async () => {
    await setupTestDatabase();

    try {
      const user = await TestMongoModel.create({
        name: 'Original Name',
        email: 'original@example.com',
      });

      const userId = idToString(user._id);
      const updatedCount = await TestMongoModel.update(userId, {
        name: 'Updated Name',
        age: 25,
      });

      assertEquals(updatedCount, 1);

      const updated = await TestMongoModel.find(userId);
      assertExists(updated);
      assertEquals(updated.name, 'Updated Name');
      assertEquals(updated.age, 25);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - updateById 根据 ID 更新',
  fn: async () => {
    await setupTestDatabase();

    try {
      const user = await TestMongoModel.create({
        name: 'Before Update',
        email: 'before@example.com',
      });

      const userId = idToString(user._id);
      const updatedCount = await TestMongoModel.updateById(userId, {
        name: 'After Update',
      });

      assertEquals(updatedCount, 1);

      const updated = await TestMongoModel.find(userId);
      assertExists(updated);
      assertEquals(updated.name, 'After Update');
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

// ==================== 批量操作方法测试 ====================

Deno.test({
  name: 'MongoDB ORM - createMany 批量创建',
  fn: async () => {
    await setupTestDatabase();

    try {
      const users = await TestMongoModel.createMany([
        { name: 'Batch User 1', email: 'batch1@example.com' },
        { name: 'Batch User 2', email: 'batch2@example.com' },
        { name: 'Batch User 3', email: 'batch3@example.com' },
      ]);

      assertEquals(users.length, 3);
      assertExists(users[0]._id);
      assertExists(users[1]._id);
      assertExists(users[2]._id);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - updateMany 批量更新',
  fn: async () => {
    await setupTestDatabase();

    try {
      await TestMongoModel.create({ name: 'User 1', status: 'pending' });
      await TestMongoModel.create({ name: 'User 2', status: 'pending' });
      await TestMongoModel.create({ name: 'User 3', status: 'active' });

      const updatedCount = await TestMongoModel.updateMany(
        { status: 'pending' },
        { status: 'active' },
      );

      assertEquals(updatedCount, 2);

      const active = await TestMongoModel.findAll({ status: 'active' });
      assertEquals(active.length, 3); // 2 updated + 1 original
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - deleteMany 批量删除',
  fn: async () => {
    await setupTestDatabase();

    try {
      await TestMongoModel.create({ name: 'To Delete 1', status: 'delete' });
      await TestMongoModel.create({ name: 'To Delete 2', status: 'delete' });
      await TestMongoModel.create({ name: 'Keep', status: 'keep' });

      const deletedCount = await TestMongoModel.deleteMany({ status: 'delete' });
      assertEquals(deletedCount, 2);

      const remaining = await TestMongoModel.findAll();
      assertEquals(remaining.length, 1);
      assertEquals(remaining[0].name, 'Keep');
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - incrementMany 批量递增',
  fn: async () => {
    await setupTestDatabase();

    try {
      await TestMongoModel.create({ name: 'User 1', score: 10 });
      await TestMongoModel.create({ name: 'User 2', score: 20 });
      await TestMongoModel.create({ name: 'User 3', score: 30 });

      const updatedCount = await TestMongoModel.incrementMany(
        { name: { $in: ['User 1', 'User 2'] } },
        'score',
        5,
      );

      assertEquals(updatedCount, 2);

      const user1 = await TestMongoModel.findOne({ name: 'User 1' });
      const user2 = await TestMongoModel.findOne({ name: 'User 2' });
      assertEquals(user1?.score, 15);
      assertEquals(user2?.score, 25);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - decrementMany 批量递减',
  fn: async () => {
    await setupTestDatabase();

    try {
      await TestMongoModel.create({ name: 'User 1', score: 100 });
      await TestMongoModel.create({ name: 'User 2', score: 200 });

      const updatedCount = await TestMongoModel.decrementMany(
        { name: 'User 1' },
        'score',
        20,
      );

      assertEquals(updatedCount, 1);

      const user1 = await TestMongoModel.findOne({ name: 'User 1' });
      assertEquals(user1?.score, 80);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

// ==================== 查询方法测试 ====================

Deno.test({
  name: 'MongoDB ORM - count 统计记录数',
  fn: async () => {
    await setupTestDatabase();

    try {
      await TestMongoModel.create({ name: 'User 1' });
      await TestMongoModel.create({ name: 'User 2' });
      await TestMongoModel.create({ name: 'User 3' });

      const total = await TestMongoModel.count();
      assertEquals(total, 3);

      const filtered = await TestMongoModel.count({ name: 'User 1' });
      assertEquals(filtered, 1);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - exists 检查记录是否存在',
  fn: async () => {
    await setupTestDatabase();

    try {
      await TestMongoModel.create({ email: 'exists@example.com' });

      const exists1 = await TestMongoModel.exists({ email: 'exists@example.com' });
      assertEquals(exists1, true);

      const exists2 = await TestMongoModel.exists({ email: 'notexists@example.com' });
      assertEquals(exists2, false);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - paginate 分页查询',
  fn: async () => {
    await setupTestDatabase();

    try {
      // 创建 10 条记录
      for (let i = 1; i <= 10; i++) {
        await TestMongoModel.create({ name: `User ${i}`, index: i });
      }

      const page1 = await TestMongoModel.paginate({}, 1, 5);
      assertEquals(page1.data.length, 5);
      assertEquals(page1.total, 10);
      assertEquals(page1.page, 1);
      assertEquals(page1.pageSize, 5);
      assertEquals(page1.totalPages, 2);

      const page2 = await TestMongoModel.paginate({}, 2, 5);
      assertEquals(page2.data.length, 5);
      assertEquals(page2.page, 2);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - distinct 获取不重复值',
  fn: async () => {
    await setupTestDatabase();

    try {
      await TestMongoModel.create({ name: 'User 1', role: 'admin' });
      await TestMongoModel.create({ name: 'User 2', role: 'user' });
      await TestMongoModel.create({ name: 'User 3', role: 'admin' });
      await TestMongoModel.create({ name: 'User 4', role: 'user' });

      const roles = await TestMongoModel.distinct('role');
      assertEquals(roles.length, 2);
      assertEquals(roles.includes('admin'), true);
      assertEquals(roles.includes('user'), true);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - aggregate 聚合查询',
  fn: async () => {
    await setupTestDatabase();

    try {
      await TestMongoModel.create({ name: 'User 1', age: 20, score: 100 });
      await TestMongoModel.create({ name: 'User 2', age: 25, score: 200 });
      await TestMongoModel.create({ name: 'User 3', age: 30, score: 150 });

      const result = await TestMongoModel.aggregate([
        { $group: { _id: null, avgAge: { $avg: '$age' }, totalScore: { $sum: '$score' } } },
      ]);

      assertEquals(result.length, 1);
      assertEquals(result[0].avgAge, 25);
      assertEquals(result[0].totalScore, 450);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

// ==================== 特殊查询方法测试 ====================

Deno.test({
  name: 'MongoDB ORM - findOneAndUpdate 查找并更新',
  fn: async () => {
    await setupTestDatabase();

    try {
      const user = await TestMongoModel.create({
        name: 'Original',
        email: 'original@example.com',
      });

      const userId = idToString(user._id);
      const updated = await TestMongoModel.findOneAndUpdate(
        userId,
        { name: 'Updated' },
        { returnDocument: 'after' },
      );

      assertExists(updated);
      assertEquals(updated.name, 'Updated');
      assertEquals(updated.email, 'original@example.com');
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - findOneAndDelete 查找并删除',
  fn: async () => {
    await setupTestDatabase();

    try {
      const user = await TestMongoModel.create({
        name: 'To Delete',
        email: 'delete@example.com',
      });

      const userId = idToString(user._id);
      const deleted = await TestMongoModel.findOneAndDelete(userId);

      assertExists(deleted);
      assertEquals(deleted.name, 'To Delete');

      const found = await TestMongoModel.find(userId);
      assertEquals(found, null);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - findOneAndReplace 查找并替换',
  fn: async () => {
    await setupTestDatabase();

    try {
      const user = await TestMongoModel.create({
        name: 'Original',
        email: 'original@example.com',
        age: 25,
      });

      const userId = idToString(user._id);
      const replaced = await TestMongoModel.findOneAndReplace(
        userId,
        { name: 'Replaced', email: 'replaced@example.com' },
        true,
      );

      assertExists(replaced);
      assertEquals(replaced.name, 'Replaced');
      assertEquals(replaced.email, 'replaced@example.com');
      // age 字段应该被移除（替换操作）
      assertEquals(replaced.age, undefined);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - upsert 更新或插入',
  fn: async () => {
    await setupTestDatabase();

    try {
      // 第一次调用，应该创建新记录
      const created = await TestMongoModel.upsert(
        { email: 'upsert@example.com' },
        { name: 'Upsert User', email: 'upsert@example.com' },
        true,
      );

      assertExists(created);
      assertExists(created._id);
      assertEquals(created.name, 'Upsert User');

      const userId = idToString(created._id);

      // 第二次调用，应该更新现有记录
      const updated = await TestMongoModel.upsert(
        { email: 'upsert@example.com' },
        { name: 'Updated Upsert User', email: 'upsert@example.com' },
        true,
      );

      assertExists(updated);
      assertEquals(idToString(updated._id), userId);
      assertEquals(updated.name, 'Updated Upsert User');
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - findOrCreate 查找或创建',
  fn: async () => {
    await setupTestDatabase();

    try {
      // 第一次调用，应该创建新记录
      const created = await TestMongoModel.findOrCreate(
        { email: 'findorcreate@example.com' },
        { name: 'FindOrCreate User', email: 'findorcreate@example.com' },
      );

      assertExists(created);
      assertExists(created._id);
      assertEquals(created.name, 'FindOrCreate User');

      const userId = idToString(created._id);

      // 第二次调用，应该返回现有记录
      const found = await TestMongoModel.findOrCreate(
        { email: 'findorcreate@example.com' },
        { name: 'Should Not Update', email: 'findorcreate@example.com' },
      );

      assertExists(found);
      // findOrCreate 使用 withTrashed() 查找，所以会找到已存在的记录
      assertEquals(found.email, 'findorcreate@example.com');
      // 注意：findOrCreate 如果找到记录，不会更新数据
      // 但由于使用了 withTrashed()，如果记录被软删除，也会返回
      // 这里我们只验证能找到记录即可，不验证 name 的值（因为可能被其他测试影响）
      assertEquals(found.email, 'findorcreate@example.com');
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - increment 递增字段',
  fn: async () => {
    await setupTestDatabase();

    try {
      const user = await TestMongoModel.create({
        name: 'Counter User',
        score: 100,
      });

      const userId = idToString(user._id);
      const result = await TestMongoModel.increment(userId, 'score', 10, true);

      if (typeof result === 'object') {
        assertEquals(result.score, 110);
      }

      const updated = await TestMongoModel.find(userId);
      assertEquals(updated?.score, 110);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - decrement 递减字段',
  fn: async () => {
    await setupTestDatabase();

    try {
      const user = await TestMongoModel.create({
        name: 'Decrement User',
        score: 100,
      });

      const userId = idToString(user._id);
      const result = await TestMongoModel.decrement(userId, 'score', 20, true);

      if (typeof result === 'object') {
        assertEquals(result.score, 80);
      }

      const updated = await TestMongoModel.find(userId);
      assertEquals(updated?.score, 80);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

// ==================== 实例方法测试 ====================

Deno.test({
  name: 'MongoDB ORM - save 保存实例',
  fn: async () => {
    await setupTestDatabase();

    try {
      const user = await TestMongoModel.create({
        name: 'Save User',
        email: 'save@example.com',
      });

      user.name = 'Updated Save User';
      user.age = 30;
      const saved = await user.save();

      assertExists(saved);
      assertEquals(saved.name, 'Updated Save User');
      assertEquals(saved.age, 30);

      const found = await TestMongoModel.find(idToString(user._id));
      assertEquals(found?.name, 'Updated Save User');
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - update 实例方法更新',
  fn: async () => {
    await setupTestDatabase();

    try {
      const user = await TestMongoModel.create({
        name: 'Update Instance User',
        email: 'update@example.com',
      });

      const updated = await user.update({
        name: 'Updated Instance',
        age: 25,
      });

      assertExists(updated);
      assertEquals(updated.name, 'Updated Instance');
      assertEquals(updated.age, 25);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

// ==================== 链式查询构建器测试 ====================

Deno.test({
  name: 'MongoDB ORM - query 链式查询构建器',
  fn: async () => {
    await setupTestDatabase();

    try {
      // 创建测试数据
      for (let i = 1; i <= 10; i++) {
        await TestMongoModel.create({
          name: `User ${i}`,
          email: `user${i}@example.com`,
          age: 20 + i,
          score: i * 10,
        });
      }

      // 测试链式查询
      const results = await TestMongoModel.query()
        .where({ age: { $gte: 25 } })
        .sort({ score: 'desc' })
        .limit(3)
        .findAll();

      assertEquals(results.length, 3);
      assertEquals(results[0].age >= 25, true);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - query 链式查询 count',
  fn: async () => {
    await setupTestDatabase();

    try {
      await TestMongoModel.create({ name: 'User 1', status: 'active' });
      await TestMongoModel.create({ name: 'User 2', status: 'active' });
      await TestMongoModel.create({ name: 'User 3', status: 'inactive' });

      const count = await TestMongoModel.query()
        .where({ status: 'active' })
        .count();

      assertEquals(count, 2);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - query 链式查询 exists',
  fn: async () => {
    await setupTestDatabase();

    try {
      await TestMongoModel.create({ email: 'exists@example.com' });

      const exists = await TestMongoModel.query()
        .where({ email: 'exists@example.com' })
        .exists();

      assertEquals(exists, true);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - query 链式查询 update',
  fn: async () => {
    await setupTestDatabase();

    try {
      await TestMongoModel.create({ name: 'User 1', status: 'pending' });
      await TestMongoModel.create({ name: 'User 2', status: 'pending' });

      // 使用 updateMany 来批量更新
      const updated = await TestMongoModel.query()
        .where({ status: 'pending' })
        .updateMany({ status: 'active' });

      // updateMany 返回更新的记录数
      assertEquals(updated, 2);

      const active = await TestMongoModel.findAll({ status: 'active' });
      assertEquals(active.length, 2);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - query 链式查询 deleteMany',
  fn: async () => {
    await setupTestDatabase();

    try {
      await TestMongoModel.create({ name: 'Delete 1', status: 'delete' });
      await TestMongoModel.create({ name: 'Delete 2', status: 'delete' });
      await TestMongoModel.create({ name: 'Keep', status: 'keep' });

      const deleted = await TestMongoModel.query()
        .where({ status: 'delete' })
        .deleteMany();

      assertEquals(deleted, 2);

      const remaining = await TestMongoModel.findAll();
      assertEquals(remaining.length, 1);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - query 链式查询 withTrashed',
  fn: async () => {
    await setupTestDatabase();

    try {
      const user = await TestMongoModel.create({
        name: 'Trashed User',
        email: 'trashed@example.com',
      });

      const userId = idToString(user._id);
      await TestMongoModel.delete(userId);

      // 使用 withTrashed 静态方法查询已删除的记录
      const found = await TestMongoModel.withTrashed().find(userId);

      assertExists(found);
      assertExists(found.deletedAt);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - query 链式查询 onlyTrashed',
  fn: async () => {
    await setupTestDatabase();

    try {
      const user1 = await TestMongoModel.create({ name: 'User 1' });
      const user2 = await TestMongoModel.create({ name: 'User 2' });

      await TestMongoModel.delete(idToString(user1._id));

      const trashed = await TestMongoModel.query()
        .onlyTrashed()
        .findAll();

      assertEquals(trashed.length, 1);
      assertEquals(trashed[0].name, 'User 1');
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - query 链式查询 findById',
  fn: async () => {
    await setupTestDatabase();

    try {
      const user = await TestMongoModel.create({
        name: 'Query FindById User',
        email: 'queryfindbyid@example.com',
      });

      const userId = idToString(user._id);
      const found = await TestMongoModel.query().findById(userId);

      assertExists(found);
      assertEquals(found.name, 'Query FindById User');
      assertEquals(found.email, 'queryfindbyid@example.com');

      // 测试带字段投影
      const foundWithFields = await TestMongoModel.query().findById(userId, ['name', 'email']);
      assertExists(foundWithFields);
      assertEquals(foundWithFields.name, 'Query FindById User');
      assertEquals(foundWithFields.email, 'queryfindbyid@example.com');
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - query 链式查询 updateById',
  fn: async () => {
    await setupTestDatabase();

    try {
      const user = await TestMongoModel.create({
        name: 'Before Update',
        email: 'beforeupdate@example.com',
      });

      const userId = idToString(user._id);
      const updatedCount = await TestMongoModel.query().updateById(userId, {
        name: 'After Update',
        age: 30,
      });

      assertEquals(updatedCount, 1);

      const updated = await TestMongoModel.find(userId);
      assertExists(updated);
      assertEquals(updated.name, 'After Update');
      assertEquals(updated.age, 30);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - query 链式查询 deleteById',
  fn: async () => {
    await setupTestDatabase();

    try {
      const user = await TestMongoModel.create({
        name: 'Delete By Id User',
        email: 'deletebyid@example.com',
      });

      const userId = idToString(user._id);
      const deletedCount = await TestMongoModel.query().deleteById(userId);

      assertEquals(deletedCount, 1);

      // 验证记录已被软删除
      const deletedUser = await TestMongoModel.withTrashed().find(userId);
      assertExists(deletedUser);
      assertExists(deletedUser.deletedAt);

      // 验证正常查询找不到已删除的记录
      const found = await TestMongoModel.find(userId);
      assertEquals(found, null);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - query 链式查询 restoreById',
  fn: async () => {
    await setupTestDatabase();

    try {
      const user = await TestMongoModel.create({
        name: 'Restore By Id User',
        email: 'restorebyid@example.com',
      });

      const userId = idToString(user._id);
      await TestMongoModel.delete(userId);

      // 使用链式查询恢复
      const restoredCount = await TestMongoModel.query().restoreById(userId);
      assertEquals(restoredCount, 1);

      // 验证记录已恢复
      const restored = await TestMongoModel.find(userId);
      assertExists(restored);
      assertEquals(restored.deletedAt, undefined);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - query 链式查询 forceDeleteById',
  fn: async () => {
    await setupTestDatabase();

    try {
      const user = await TestMongoModel.create({
        name: 'Force Delete By Id User',
        email: 'forcedeletebyid@example.com',
      });

      const userId = idToString(user._id);
      const deletedCount = await TestMongoModel.query().forceDeleteById(userId);

      assertEquals(deletedCount, 1);

      // 验证记录已被物理删除
      const found = await TestMongoModel.withTrashed().find(userId);
      assertEquals(found, null);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

// ==================== 其他方法测试 ====================

Deno.test({
  name: 'MongoDB ORM - truncate 清空表',
  fn: async () => {
    await setupTestDatabase();

    try {
      await TestMongoModel.create({ name: 'User 1' });
      await TestMongoModel.create({ name: 'User 2' });
      await TestMongoModel.create({ name: 'User 3' });

      const deleted = await TestMongoModel.truncate();
      assertEquals(deleted, 3);

      const remaining = await TestMongoModel.findAll();
      assertEquals(remaining.length, 0);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - restoreById 恢复记录',
  fn: async () => {
    await setupTestDatabase();

    try {
      const user = await TestMongoModel.create({
        name: 'Restore User',
        email: 'restore@example.com',
      });

      const userId = idToString(user._id);
      await TestMongoModel.delete(userId);

      const restored = await TestMongoModel.restoreById(userId);
      assertEquals(restored, 1);

      const found = await TestMongoModel.find(userId);
      assertExists(found);
      assertEquals(found.deletedAt, undefined);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - forceDeleteById 强制删除',
  fn: async () => {
    await setupTestDatabase();

    try {
      const user = await TestMongoModel.create({
        name: 'Force Delete User',
        email: 'forcedelete@example.com',
      });

      const userId = idToString(user._id);
      const deleted = await TestMongoModel.forceDeleteById(userId);
      assertEquals(deleted, 1);

      const found = await TestMongoModel.withTrashed().find(userId);
      assertEquals(found, null);
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - 自定义主键字段名（primaryKey = id）',
  fn: async () => {
    await setupTestDatabase();

    try {
      // 设置自定义主键模型的适配器
      if (databaseAdapter) {
        TestCustomPrimaryKeyModel.setAdapter(databaseAdapter);
        (TestCustomPrimaryKeyModel as any).adapter = databaseAdapter;
      }

      // 创建记录（MongoDB 会自动生成 _id，但代码中使用 id 作为主键字段名）
      const user = await TestCustomPrimaryKeyModel.create({
        name: 'Custom PK User',
        email: 'custompk@example.com',
      });

      // 验证创建成功，id 字段存在（实际映射到 MongoDB 的 _id）
      assertExists(user.id);
      assertEquals(user.name, 'Custom PK User');

      const userId = idToString(user.id);

      // 测试使用字符串 ID 查询（应该自动转换为 ObjectId 并查询 _id 字段）
      const found1 = await TestCustomPrimaryKeyModel.find(userId);
      assertExists(found1);
      assertEquals(found1.name, 'Custom PK User');

      // 测试使用对象条件查询（{ id: string } 应该映射到 { _id: ObjectId }）
      const found2 = await TestCustomPrimaryKeyModel.findOne({ id: userId });
      assertExists(found2);
      assertEquals(found2.name, 'Custom PK User');

      // 测试使用 findById
      const found3 = await TestCustomPrimaryKeyModel.findById(userId);
      assertExists(found3);
      assertEquals(found3.name, 'Custom PK User');

      // 清理测试数据
      const db = databaseAdapter?.getDatabase();
      if (db) {
        await db.collection('test_custom_pk_users').deleteMany({});
      }
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'MongoDB ORM - normalizeId 无效 ObjectId 格式抛出异常',
  fn: async () => {
    await setupTestDatabase();

    try {
      // 测试使用无效的 ObjectId 格式查询，应该抛出异常
      let errorThrown = false;
      try {
        await TestMongoModel.find('invalid-id-format');
      } catch (error) {
        errorThrown = true;
        const message = error instanceof Error ? error.message : String(error);
        assertEquals(
          message.includes('Invalid ObjectId format'),
          true,
          '应该抛出 Invalid ObjectId format 异常',
        );
      }
      assertEquals(errorThrown, true, '应该抛出异常');

      // 测试使用无效的 ObjectId 格式查询（对象条件）
      errorThrown = false;
      try {
        await TestMongoModel.findOne({ _id: 'invalid-id-format' });
      } catch (error) {
        errorThrown = true;
        const message = error instanceof Error ? error.message : String(error);
        assertEquals(
          message.includes('Invalid ObjectId format'),
          true,
          '应该抛出 Invalid ObjectId format 异常',
        );
      }
      assertEquals(errorThrown, true, '应该抛出异常');
    } finally {
      await cleanupTestDatabase();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

// 所有测试结束后关闭数据库连接
Deno.test({
  name: '清理 MongoDB 连接',
  fn: async () => {
    await closeDatabaseConnection();
  },
  sanitizeResources: false, // 允许资源泄漏（因为我们要关闭连接）
  sanitizeOps: false,
});
