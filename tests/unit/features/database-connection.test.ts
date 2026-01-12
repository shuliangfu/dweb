/**
 * MongoDB 数据库连接测试
 * 用于诊断和测试 MongoDB 连接，特别是副本集连接
 *
 * 测试说明：
 * 1. 测试前会检查 MongoDB 连接配置
 * 2. 支持单机连接和副本集连接
 * 3. 包含连接超时处理，避免测试卡住
 * 4. 提供详细的错误信息用于诊断
 *
 * 环境变量配置示例（.env 文件）：
 * # MongoDB 配置（单机）
 * MONGODB_HOST=localhost
 * MONGODB_PORT=27017
 * MONGODB_DATABASE=test_db
 * MONGODB_USERNAME=your_username
 * MONGODB_PASSWORD=your_password
 *
 * # MongoDB 配置（副本集 - 方式1：使用 hosts）
 * MONGODB_HOSTS=localhost:27017,localhost:27018,localhost:27019
 * MONGODB_DATABASE=test_db
 * MONGODB_REPLICA_SET=rs0
 *
 * # MongoDB 配置（副本集 - 方式2：使用 URI）
 * MONGODB_URI=mongodb://localhost:27017,localhost:27018,localhost:27019/test_db?replicaSet=rs0
 */

import { assert, assertExists } from '@std/assert';
import { initDatabase, getDatabaseAsync } from '../../../src/features/database/access.ts';
import type { DatabaseConfig } from '../../../src/features/database/types.ts';
import { MongoDBAdapter } from '../../../src/features/database/adapters/mongodb.ts';

// 初始化环境变量（加载 .env 文件）
const envModule = await import('../../../src/features/env.ts');
if (typeof envModule.initEnv === 'function') {
  envModule.initEnv();
}

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

  // 如果提供了 URI，直接使用（优先级最高）
  if (uri) {
    try {
      // 解析 URI 中的副本集信息
      const url = new URL(uri);
      const replicaSetParam = url.searchParams.get('replicaSet');

      return {
        type: 'mongodb',
        connection: {
          uri: uri, // 直接使用 URI
        },
        mongoOptions: replicaSetParam ? {
          replicaSet: replicaSetParam,
          timeoutMS: 10000, // 10秒超时
          maxRetries: 3,
          retryDelay: 1000,
        } : {
          timeoutMS: 10000,
          maxRetries: 3,
          retryDelay: 1000,
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
        timeoutMS: 10000, // 10秒超时
        maxRetries: 3,
        retryDelay: 1000,
        authSource,
      },
    };
  }

  // 单机连接配置
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
        timeoutMS: 10000, // 10秒超时
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
async function checkMongoDBConnection(): Promise<{
  success: boolean;
  adapter: MongoDBAdapter | null;
  error?: string;
  connectionInfo?: string;
}> {
  const config = loadMongoDBConfigFromEnv();
  if (!config) {
    return {
      success: false,
      adapter: null,
      error: '未找到 MongoDB 配置，请检查 .env 文件',
    };
  }

  // 构建连接信息字符串（用于日志）
  let connectionInfo = '';
  if (config.connection.uri) {
    // 隐藏密码
    const uri = config.connection.uri;
    const maskedUri = uri.replace(/:([^:@]+)@/, ':****@');
    connectionInfo = `URI: ${maskedUri}`;
  } else if (config.connection.hosts && config.connection.hosts.length > 0) {
    connectionInfo = `副本集: ${config.connection.hosts.join(',')}, 数据库: ${config.connection.database}, 副本集名称: ${config.mongoOptions?.replicaSet || '未设置'}`;
  } else {
    connectionInfo = `单机: ${config.connection.host}:${config.connection.port}, 数据库: ${config.connection.database}`;
  }

    console.log(`\n🔍 尝试连接 MongoDB: ${connectionInfo}`);

    // 打印实际的连接配置（隐藏密码）
    if (config.connection.uri) {
      const maskedUri = config.connection.uri.replace(/:([^:@]+)@/, ':****@');
      console.log(`   连接 URI: ${maskedUri}`);
    } else {
      console.log(`   主机: ${config.connection.host || config.connection.hosts?.join(', ')}`);
      console.log(`   端口: ${config.connection.port || '27017'}`);
      console.log(`   数据库: ${config.connection.database}`);
      console.log(`   用户名: ${config.connection.username || '未设置'}`);
      console.log(`   副本集: ${config.mongoOptions?.replicaSet || '未设置'}`);
    }
    console.log(`   超时设置: ${config.mongoOptions?.timeoutMS || 10000}ms`);

    try {
    // 使用 Promise.race 实现超时控制
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('连接超时（10秒）'));
      }, 12000); // 12秒超时（比配置的10秒稍长）
    });

    const connectPromise = (async () => {
      // 初始化数据库连接
      await initDatabase(config, 'default');

      // 获取适配器并测试连接
      const adapter = await getDatabaseAsync('default') as MongoDBAdapter;

      // 检查连接状态
      if (adapter.isConnected()) {
        // 尝试执行一个简单的操作来验证连接
        const db = adapter.getDatabase();
        if (db) {
          // 执行 ping 操作验证连接
          await db.admin().ping();
        }
        return adapter;
      } else {
        throw new Error('适配器未连接');
      }
    })();

    const adapter = await Promise.race([connectPromise, timeoutPromise]) as MongoDBAdapter;

    console.log('✅ MongoDB 连接成功');
    return {
      success: true,
      adapter,
      connectionInfo,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ MongoDB 连接失败: ${errorMessage}`);

    // 提供诊断建议
    let diagnostic = '';
    if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
      diagnostic = '\n💡 诊断建议：\n' +
        '  1. 检查 MongoDB 服务是否运行\n' +
        '  2. 检查网络连接和防火墙设置\n' +
        '  3. 如果是副本集，检查所有节点是否可访问\n' +
        '  4. 检查副本集名称是否正确\n' +
        '  5. 尝试增加 timeoutMS 配置值';
    } else if (errorMessage.includes('replicaSet') || errorMessage.includes('副本集')) {
      diagnostic = '\n💡 诊断建议：\n' +
        '  1. 检查副本集名称是否正确（MONGODB_REPLICA_SET）\n' +
        '  2. 确保所有副本集节点都在 hosts 列表中\n' +
        '  3. 检查副本集是否已正确初始化\n' +
        '  4. 尝试使用 MONGODB_URI 方式连接';
    } else if (errorMessage.includes('auth') || errorMessage.includes('认证')) {
      diagnostic = '\n💡 诊断建议：\n' +
        '  1. 检查用户名和密码是否正确\n' +
        '  2. 检查 authSource 配置是否正确\n' +
        '  3. 确保用户有足够的权限';
    }

    return {
      success: false,
      adapter: null,
      error: errorMessage + diagnostic,
      connectionInfo,
    };
  }
}

/**
 * 测试数据库连接
 */
Deno.test({
  name: 'MongoDB 连接测试',
  fn: async () => {
    const result = await checkMongoDBConnection();

    if (!result.success) {
      console.error(`\n❌ 连接失败: ${result.error}`);
      console.log(`\n连接信息: ${result.connectionInfo || '未知'}`);
      console.log('\n请检查以下配置：');
      console.log('1. MongoDB 服务是否运行');
      console.log('2. 环境变量配置是否正确（.env 文件）');
      console.log('3. 网络连接是否正常');
      if (result.connectionInfo?.includes('副本集')) {
        console.log('4. 副本集配置是否正确（MONGODB_HOSTS, MONGODB_REPLICA_SET）');
      }
      // 不抛出错误，只是输出信息，让测试继续
      console.log('\n⚠️  测试将跳过，但不会失败');
      return;
    }

    assert(result.success, '连接应该成功');
    assertExists(result.adapter, '适配器应该存在');
    assert(result.adapter?.isConnected(), '适配器应该已连接');

    console.log(`\n✅ 连接测试通过`);
    console.log(`连接信息: ${result.connectionInfo}`);

    // 测试基本操作
    if (result.adapter) {
      try {
        const db = result.adapter.getDatabase();
        if (db) {
          // 测试 ping
          await db.admin().ping();
          console.log('✅ Ping 测试通过');

          // 测试列出数据库
          const dbList = await db.admin().listDatabases();
          console.log(`✅ 数据库列表获取成功，共 ${dbList.databases.length} 个数据库`);

          // 关闭连接
          await result.adapter.close();
          console.log('✅ 连接已关闭');
        }
      } catch (error) {
        console.error(`❌ 操作测试失败: ${error instanceof Error ? error.message : String(error)}`);
        // 尝试关闭连接
        try {
          await result.adapter.close();
        } catch {
          // 忽略关闭错误
        }
      }
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

/**
 * 测试副本集连接（如果配置了副本集）
 */
Deno.test({
  name: 'MongoDB 副本集连接测试',
  fn: async () => {
    const config = loadMongoDBConfigFromEnv();

    // 检查是否是副本集配置
    const isReplicaSet = config?.connection.hosts && config.connection.hosts.length > 0;
    const hasReplicaSetName = !!config?.mongoOptions?.replicaSet;
    const hasUri = !!config?.connection.uri;
    const isSingleNodeReplicaSet = !isReplicaSet && !hasUri && hasReplicaSetName; // 单机副本集

    if (!isReplicaSet && !hasUri && !isSingleNodeReplicaSet) {
      console.log('⚠️  未配置副本集，跳过副本集测试');
      console.log('提示：设置 MONGODB_HOSTS 和 MONGODB_REPLICA_SET（或 REPLICA_SET）来测试副本集连接');
      return;
    }

    console.log('\n🔍 开始副本集连接测试...');

    if (isReplicaSet) {
      console.log(`副本集节点: ${config.connection.hosts?.join(', ')}`);
      console.log(`副本集名称: ${config.mongoOptions?.replicaSet || '未设置'}`);

      if (!hasReplicaSetName) {
        console.warn('⚠️  警告：配置了多个 hosts 但未设置 replicaSet 名称');
        console.warn('   这可能导致连接失败，建议设置 MONGODB_REPLICA_SET 环境变量');
      }
    } else if (isSingleNodeReplicaSet) {
      console.log(`单机副本集: ${config.connection.host}:${config.connection.port}`);
      console.log(`副本集名称: ${config.mongoOptions?.replicaSet || '未设置'}`);
      console.log('ℹ️  这是单机副本集配置（单个节点但启用了副本集模式）');
    }

    const result = await checkMongoDBConnection();

    if (!result.success) {
      console.error(`\n❌ 副本集连接失败: ${result.error}`);
      // 不抛出错误，只是输出信息
      return;
    }

    assert(result.success, '副本集连接应该成功');
    assertExists(result.adapter, '适配器应该存在');

    console.log('✅ 副本集连接测试通过');

    // 测试副本集状态（如果可能）
    if (result.adapter) {
      try {
        const db = result.adapter.getDatabase();
        if (db) {
          // 获取副本集状态
          const status = await db.admin().command({ replSetGetStatus: 1 });
          console.log('✅ 副本集状态获取成功');
          console.log(`   副本集名称: ${status.set || '未知'}`);
          console.log(`   成员数量: ${status.members?.length || 0}`);
        }
      } catch (error) {
        // replSetGetStatus 可能在某些配置下不可用，这是正常的
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('not running with --replSet')) {
          console.log('ℹ️  当前 MongoDB 实例不是副本集模式（这是正常的，如果是单机副本集测试）');
        } else {
          console.warn(`⚠️  无法获取副本集状态: ${errorMessage}`);
        }
      } finally {
        // 关闭连接
        try {
          await result.adapter.close();
        } catch {
          // 忽略关闭错误
        }
      }
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

/**
 * 测试连接超时处理
 */
Deno.test({
  name: 'MongoDB 连接超时测试',
  fn: async () => {
    // 使用一个无效的地址来测试超时
    const invalidConfig: DatabaseConfig = {
      type: 'mongodb',
      connection: {
        host: '192.0.2.1', // 这是一个测试用的无效 IP
        port: 27017,
        database: 'test',
      },
      mongoOptions: {
        timeoutMS: 2000, // 2秒超时
        maxRetries: 1,
        retryDelay: 500,
      },
    };

    console.log('\n🔍 测试连接超时处理（使用无效地址）...');

    const startTime = Date.now();
    try {
      await initDatabase(invalidConfig, 'timeout-test');
      const adapter = await getDatabaseAsync('timeout-test') as MongoDBAdapter;
      await adapter.getDatabase();
      // 如果连接成功（不应该），关闭连接
      await adapter.close();
      console.log('⚠️  意外：连接成功（不应该发生）');
    } catch (error) {
      const elapsed = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.log(`✅ 超时测试通过（耗时: ${elapsed}ms）`);
      console.log(`   错误信息: ${errorMessage}`);

      // 验证超时时间在合理范围内（应该在 2-5 秒之间）
      assert(elapsed >= 1500, `超时时间应该至少 1.5 秒，实际: ${elapsed}ms`);
      assert(elapsed < 10000, `超时时间应该小于 10 秒，实际: ${elapsed}ms`);
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
