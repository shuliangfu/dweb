/**
 * 数据库模型软删除功能测试
 * 测试 MongoModel 和 SQLModel 的软删除功能
 *
 * 测试说明：
 * 1. 测试前会检查数据库连接
 * 2. 如果数据库未连接，测试会跳过并提示
 * 3. 需要配置 .env 文件中的数据库连接信息
 *
 * 环境变量配置示例（.env 文件）：
 * # MongoDB
 * MONGODB_URI=mongodb://localhost:27017/test_db
 * # 或
 * MONGODB_HOST=localhost
 * MONGODB_PORT=27017
 * MONGODB_DATABASE=test_db
 * MONGODB_USERNAME=your_username
 * MONGODB_PASSWORD=your_password
 *
 * # PostgreSQL
 * POSTGRES_HOST=localhost
 * POSTGRES_PORT=5432
 * POSTGRES_DATABASE=test_db
 * POSTGRES_USERNAME=postgres
 * POSTGRES_PASSWORD=your_password
 *
 * # 指定数据库类型
 * DB_TYPE=mongodb
 */

import { assertEquals, assert, assertExists } from '@std/assert';
import { MongoModel } from '../../../src/features/database/orm/mongo-model.ts';
import { SQLModel } from '../../../src/features/database/orm/sql-model.ts';
import { initDatabase, getDatabaseAsync, isDatabaseInitialized } from '../../../src/features/database/access.ts';
import type { DatabaseConfig } from '../../../src/features/database/types.ts';
import { MongoDBAdapter } from '../../../src/features/database/adapters/mongodb.ts';
import { PostgreSQLAdapter } from '../../../src/features/database/adapters/postgresql.ts';

// 初始化环境变量（加载 .env 文件）
const envModule = await import('../../../src/features/env.ts');
if (typeof envModule.initEnv === 'function') {
  envModule.initEnv();
}

// 检查是否使用真实数据库
const USE_REAL_DB = Deno.env.get('USE_REAL_DB') !== 'false'; // 默认使用真实数据库
const DB_TYPE = Deno.env.get('DB_TYPE') || 'mongodb'; // mongodb 或 postgresql

// 测试模型类（根据配置的数据库类型动态选择）
let TestModel: typeof MongoModel | typeof SQLModel;
let isMongoDB: boolean;

if (DB_TYPE === 'mongodb') {
  class TestMongoModel extends MongoModel {
    static override collectionName = 'test_users';
    static override primaryKey = '_id';
    static override softDelete = true;
    static override deletedAtField = 'deletedAt';
  }
  TestModel = TestMongoModel;
  isMongoDB = true;
} else {
  class TestSQLModel extends SQLModel {
    static override tableName = 'users';
    static override primaryKey = 'id';
    static override softDelete = true;
    static override deletedAtField = 'deletedAt';
  }
  TestModel = TestSQLModel;
  isMongoDB = false;
}

// 全局变量
let databaseConnected = false;
let databaseAdapter: any = null;

/**
 * 从环境变量加载数据库配置
 */
function loadDatabaseConfigFromEnv(): DatabaseConfig | null {
  if (DB_TYPE === 'mongodb') {
    const uri = Deno.env.get('MONGODB_URI');
    const host = Deno.env.get('MONGODB_HOST') || 'localhost';
    const port = parseInt(Deno.env.get('MONGODB_PORT') || '27017');
    const database = Deno.env.get('MONGODB_DATABASE') || 'test_db';
    const username = Deno.env.get('MONGODB_USERNAME');
    const password = Deno.env.get('MONGODB_PASSWORD');

    if (uri) {
      // 解析 URI
      try {
        const url = new URL(uri);
        return {
          type: 'mongodb',
          connection: {
            host: url.hostname,
            port: url.port ? parseInt(url.port) : 27017,
            database: url.pathname.slice(1) || database,
            username: url.username || username,
            password: url.password || password,
          },
        };
      } catch {
        return null;
      }
    } else if (host && database) {
      return {
        type: 'mongodb',
        connection: {
          host,
          port,
          database,
          username,
          password,
        },
      };
    }
  } else if (DB_TYPE === 'postgresql') {
    const host = Deno.env.get('POSTGRES_HOST') || 'localhost';
    const port = parseInt(Deno.env.get('POSTGRES_PORT') || '5432');
    const database = Deno.env.get('POSTGRES_DATABASE') || 'test_db';
    const username = Deno.env.get('POSTGRES_USERNAME') || 'postgres';
    const password = Deno.env.get('POSTGRES_PASSWORD') || '';

    if (host && database) {
      return {
        type: 'postgresql',
        connection: {
          host,
          port,
          database,
          username,
          password,
        },
      };
    }
  }

  return null;
}

/**
 * 检查数据库连接
 */
async function checkDatabaseConnection(): Promise<boolean> {
  if (!USE_REAL_DB) {
    console.log('⚠️  跳过数据库连接检查（USE_REAL_DB=false）');
    return false;
  }

  const config = loadDatabaseConfigFromEnv();
  if (!config) {
    console.log('⚠️  未找到数据库配置，请检查 .env 文件');
    return false;
  }

  try {
    // 初始化数据库连接
    await initDatabase(config, 'default');

    // 获取适配器并测试连接
    const adapter = await getDatabaseAsync('default');

    // 检查连接状态
    if (adapter.isConnected()) {
      databaseAdapter = adapter;
      databaseConnected = true;
      console.log(`✅ 数据库连接成功: ${DB_TYPE}`);
      return true;
    } else {
      console.log('⚠️  数据库适配器未连接');
      return false;
    }
  } catch (error) {
    console.warn(`⚠️  数据库连接失败: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * 初始化测试数据库
 */
async function setupTestDatabase(): Promise<void> {
  if (!databaseConnected) {
    const connected = await checkDatabaseConnection();
    if (!connected) {
      throw new Error('数据库未连接，无法进行测试。请检查 .env 文件中的数据库配置。');
    }
  }

  // 设置适配器到模型
  TestModel.setAdapter(databaseAdapter);
  // 标记为已初始化，避免自动初始化
  (TestModel as any).adapter = databaseAdapter;
}

/**
 * 清理测试数据库
 */
async function cleanupTestDatabase(): Promise<void> {
  if (!databaseConnected || !databaseAdapter) {
    return;
  }

  try {
    if (isMongoDB) {
      const db = (databaseAdapter as MongoDBAdapter).getDatabase();
      if (db) {
        await db.collection('test_users').deleteMany({});
      }
    } else {
      await databaseAdapter.execute('DELETE FROM users WHERE name LIKE ?', ['Test%']);
    }
  } catch (error) {
    console.warn('清理测试数据失败:', error);
  }
}

// 在所有测试前检查数据库连接
const dbConnected = await checkDatabaseConnection();
if (!dbConnected && USE_REAL_DB) {
  console.error('❌ 数据库未连接，所有测试将跳过');
  console.log('提示：请配置 .env 文件中的数据库连接信息，或设置 USE_REAL_DB=false 跳过测试');
  Deno.exit(0);
}

Deno.test('数据库软删除 - 静态方法删除', async () => {
  await setupTestDatabase();

  try {
    // 创建测试数据
    const user = await TestModel.create({
      name: 'Test User',
      email: 'test@example.com',
    });

    assertExists(user);
    const primaryKey = isMongoDB ? '_id' : 'id';
    const userId = user[primaryKey];
    assertExists(userId);

    // 测试软删除（确保 ID 是字符串格式）
    const idStr = typeof userId === 'object' && userId?.toString ? userId.toString() : String(userId);
    const deletedCount = await TestModel.delete(idStr);
    assertEquals(deletedCount, 1);

    // 验证记录未被物理删除，只是设置了 deletedAt
    const deletedUser = await TestModel.withTrashed().find(idStr);
    assertExists(deletedUser);
    assertExists(deletedUser.deletedAt);

    // 验证正常查询找不到已删除的记录
    const foundUser = await TestModel.find(idStr);
    assertEquals(foundUser, null);
  } finally {
    await cleanupTestDatabase();
  }
});

Deno.test('数据库软删除 - 实例方法删除', async () => {
  await setupTestDatabase();

  try {
    // 创建测试数据
    const user = await TestModel.create({
      name: 'Test User',
      email: 'test@example.com',
    });

    assertExists(user);
    const primaryKey = isMongoDB ? '_id' : 'id';
    const userId = typeof user[primaryKey] === 'object' && user[primaryKey]?.toString ? user[primaryKey].toString() : String(user[primaryKey]);

    // 测试实例方法删除
    const deleted = await user.delete();
    assertEquals(deleted, true);

    // 验证记录已被软删除
    const deletedUser = await TestModel.withTrashed().find(userId);
    assertExists(deletedUser);
    assertExists(deletedUser.deletedAt);
  } finally {
    await cleanupTestDatabase();
  }
});

Deno.test('数据库软删除 - deleteById', async () => {
  await setupTestDatabase();

  try {
    // 创建测试数据
    const user = await TestModel.create({
      name: 'Test User',
      email: 'test@example.com',
    });

    assertExists(user);
    const primaryKey = isMongoDB ? '_id' : 'id';
    const userId = typeof user[primaryKey] === 'object' && user[primaryKey]?.toString ? user[primaryKey].toString() : String(user[primaryKey]);

    // 测试 deleteById
    const deletedCount = await TestModel.deleteById(userId);
    assertEquals(deletedCount, 1);

    // 验证记录已被软删除
    const deletedUser = await TestModel.withTrashed().find(userId);
    assertExists(deletedUser);
    assertExists(deletedUser.deletedAt);
  } finally {
    await cleanupTestDatabase();
  }
});

Deno.test('数据库软删除 - 避免重复删除', async () => {
  await setupTestDatabase();

  try {
    // 创建测试数据
    const user = await TestModel.create({
      name: 'Test User',
      email: 'test@example.com',
    });

    assertExists(user);
    const primaryKey = isMongoDB ? '_id' : 'id';
    const userId = typeof user[primaryKey] === 'object' && user[primaryKey]?.toString ? user[primaryKey].toString() : String(user[primaryKey]);

    // 第一次删除
    const deletedCount1 = await TestModel.delete(userId);
    assertEquals(deletedCount1, 1);

    // 第二次删除应该返回 0（因为已排除已删除的记录）
    const deletedCount2 = await TestModel.delete(userId);
    assertEquals(deletedCount2, 0);
  } finally {
    await cleanupTestDatabase();
  }
});

Deno.test('数据库软删除 - restore', async () => {
  await setupTestDatabase();

  try {
    // 创建并删除测试数据
    const user = await TestModel.create({
      name: 'Test User',
      email: 'test@example.com',
    });

    const primaryKey = isMongoDB ? '_id' : 'id';
    const userId = typeof user[primaryKey] === 'object' && user[primaryKey]?.toString ? user[primaryKey].toString() : String(user[primaryKey]);
    await TestModel.delete(userId);

    // 测试恢复
    const restoredCount = await TestModel.restore(userId);
    assertEquals(restoredCount, 1);

    // 验证记录已恢复
    const restoredUser = await TestModel.find(userId);
    assertExists(restoredUser);
    // MongoDB 的 deletedAt 是 undefined，SQL 的是 null
    if (isMongoDB) {
      assertEquals(restoredUser.deletedAt, undefined);
    } else {
      assertEquals(restoredUser.deletedAt, null);
    }
  } finally {
    await cleanupTestDatabase();
  }
});

Deno.test('数据库软删除 - forceDelete', async () => {
  await setupTestDatabase();

  try {
    // 创建测试数据
    const user = await TestModel.create({
      name: 'Test User',
      email: 'test@example.com',
    });

    assertExists(user);
    const primaryKey = isMongoDB ? '_id' : 'id';
    const userId = typeof user[primaryKey] === 'object' && user[primaryKey]?.toString ? user[primaryKey].toString() : String(user[primaryKey]);

    // 测试强制删除
    const deletedCount = await TestModel.forceDelete(userId);
    assertEquals(deletedCount, 1);

    // 验证记录已被物理删除
    const deletedUser = await TestModel.withTrashed().find(userId);
    assertEquals(deletedUser, null);
  } finally {
    await cleanupTestDatabase();
  }
});

Deno.test('数据库软删除 - withTrashed', async () => {
  await setupTestDatabase();

  try {
    // 创建并删除测试数据
    const user = await TestModel.create({
      name: 'Test User',
      email: 'test@example.com',
    });

    const primaryKey = isMongoDB ? '_id' : 'id';
    const userId = typeof user[primaryKey] === 'object' && user[primaryKey]?.toString ? user[primaryKey].toString() : String(user[primaryKey]);
    await TestModel.delete(userId);

    // 测试 withTrashed 可以查询到已删除的记录
    const deletedUser = await TestModel.withTrashed().find(userId);
    assertExists(deletedUser);
    assertExists(deletedUser.deletedAt);
  } finally {
    await cleanupTestDatabase();
  }
});

Deno.test('数据库软删除 - onlyTrashed (MongoDB)', async () => {
  if (DB_TYPE !== 'mongodb') {
    return; // 跳过非 MongoDB 测试
  }

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
    const user1Id = typeof user1._id === 'object' && user1._id?.toString ? user1._id.toString() : String(user1._id);
    await TestMongoModel.delete(user1Id);

    // 测试 onlyTrashed 只返回已删除的记录
    const deletedUsers = await TestMongoModel.onlyTrashed().findAll();
    assertEquals(deletedUsers.length, 1);
    const deletedUser1Id = typeof deletedUsers[0]._id === 'object' && deletedUsers[0]._id?.toString ? deletedUsers[0]._id.toString() : String(deletedUsers[0]._id);
    assertEquals(deletedUser1Id, user1Id);
  } finally {
    await cleanupTestDatabase();
  }
});

Deno.test('数据库软删除 - 静态方法删除 (SQL)', async () => {
  if (DB_TYPE !== 'postgresql') {
    return; // 跳过非 PostgreSQL 测试
  }

  await setupTestDatabase();

  try {
    // 创建测试数据
    const user = await TestSQLModel.create({
      name: 'Test User',
      email: 'test@example.com',
    });

    assertExists(user);
    assertExists(user.id);

    // 测试软删除
    const deletedCount = await TestSQLModel.delete(user.id);
    assertEquals(deletedCount, 1);

    // 验证记录未被物理删除，只是设置了 deletedAt
    const deletedUser = await TestSQLModel.withTrashed().find(user.id);
    assertExists(deletedUser);
    assertExists(deletedUser.deletedAt);

    // 验证正常查询找不到已删除的记录
    const foundUser = await TestSQLModel.find(user.id);
    assertEquals(foundUser, null);
  } finally {
    await cleanupTestDatabase();
  }
});

Deno.test('数据库软删除 - 实例方法删除 (SQL)', async () => {
  if (DB_TYPE !== 'postgresql') {
    return; // 跳过非 PostgreSQL 测试
  }

  await setupTestDatabase();

  try {
    // 创建测试数据
    const user = await TestSQLModel.create({
      name: 'Test User',
      email: 'test@example.com',
    });

    assertExists(user);

    // 测试实例方法删除
    const deleted = await user.delete();
    assertEquals(deleted, true);

    // 验证记录已被软删除
    const deletedUser = await TestSQLModel.withTrashed().find(user.id);
    assertExists(deletedUser);
    assertExists(deletedUser.deletedAt);
  } finally {
    await cleanupTestDatabase();
  }
});

Deno.test('数据库软删除 - deleteById (SQL)', async () => {
  if (DB_TYPE !== 'postgresql') {
    return; // 跳过非 PostgreSQL 测试
  }

  await setupTestDatabase();

  try {
    // 创建测试数据
    const user = await TestSQLModel.create({
      name: 'Test User',
      email: 'test@example.com',
    });

    assertExists(user);

    // 测试 deleteById
    const deletedCount = await TestSQLModel.deleteById(user.id);
    assertEquals(deletedCount, 1);

    // 验证记录已被软删除
    const deletedUser = await TestSQLModel.withTrashed().find(user.id);
    assertExists(deletedUser);
    assertExists(deletedUser.deletedAt);
  } finally {
    await cleanupTestDatabase();
  }
});

Deno.test('数据库软删除 - 避免重复删除 (SQL)', async () => {
  if (DB_TYPE !== 'postgresql') {
    return; // 跳过非 PostgreSQL 测试
  }

  await setupTestDatabase();

  try {
    // 创建测试数据
    const user = await TestSQLModel.create({
      name: 'Test User',
      email: 'test@example.com',
    });

    assertExists(user);

    // 第一次删除
    const deletedCount1 = await TestSQLModel.delete(user.id);
    assertEquals(deletedCount1, 1);

    // 第二次删除应该返回 0（因为已排除已删除的记录）
    const deletedCount2 = await TestSQLModel.delete(user.id);
    assertEquals(deletedCount2, 0);
  } finally {
    await cleanupTestDatabase();
  }
});

Deno.test('数据库软删除 - restore (SQL)', async () => {
  if (DB_TYPE !== 'postgresql') {
    return; // 跳过非 PostgreSQL 测试
  }

  await setupTestDatabase();

  try {
    // 创建并删除测试数据
    const user = await TestSQLModel.create({
      name: 'Test User',
      email: 'test@example.com',
    });

    await TestSQLModel.delete(user.id);

    // 测试恢复
    const restoredCount = await TestSQLModel.restore(user.id);
    assertEquals(restoredCount, 1);

    // 验证记录已恢复
    const restoredUser = await TestSQLModel.find(user.id);
    assertExists(restoredUser);
    assertEquals(restoredUser.deletedAt, null);
  } finally {
    await cleanupTestDatabase();
  }
});

Deno.test('数据库软删除 - forceDelete (SQL)', async () => {
  if (DB_TYPE !== 'postgresql') {
    return; // 跳过非 PostgreSQL 测试
  }

  await setupTestDatabase();

  try {
    // 创建测试数据
    const user = await TestSQLModel.create({
      name: 'Test User',
      email: 'test@example.com',
    });

    assertExists(user);

    // 测试强制删除
    const deletedCount = await TestSQLModel.forceDelete(user.id);
    assertEquals(deletedCount, 1);

    // 验证记录已被物理删除
    const deletedUser = await TestSQLModel.withTrashed().find(user.id);
    assertEquals(deletedUser, null);
  } finally {
    await cleanupTestDatabase();
  }
});
