/**
 * 数据库初始化工具
 * 用于在项目启动时自动设置数据库配置加载器
 * 
 * 使用方法：
 * 1. 在项目入口文件（如 main.ts 或 init.ts）中导入并调用：
 *    import { initDatabaseFromConfig } from '@dreamer/dweb/features/database/init-database';
 *    await initDatabaseFromConfig();
 * 
 * 2. 或者直接导入配置文件并初始化：
 *    import { initDatabaseFromConfig } from '@dreamer/dweb/features/database/init-database';
 *    import config from './dweb.config.ts';
 *    await initDatabaseFromConfig(config);
 */

import { setDatabaseConfigLoader, initDatabase } from './access.ts';
import { findConfigFile } from '../../utils/file.ts';
import type { DatabaseConfig } from './types.ts';
import type { DWebConfig } from '../../types/index.ts';

/**
 * 从配置文件初始化数据库
 * 自动设置配置加载器并初始化数据库连接
 * 
 * @param config 可选的配置对象，如果不提供则自动从 dweb.config.ts 加载
 * @param connectionName 连接名称（默认为 'default'）
 * @returns Promise<void>
 * 
 * @example
 * ```typescript
 * // 方式 1: 自动加载配置
 * import { initDatabaseFromConfig } from '@dreamer/dweb/features/database/init-database';
 * await initDatabaseFromConfig();
 * 
 * // 方式 2: 手动传入配置
 * import { initDatabaseFromConfig } from '@dreamer/dweb/features/database/init-database';
 * import config from './dweb.config.ts';
 * await initDatabaseFromConfig(config);
 * ```
 */
export async function initDatabaseFromConfig(
  config?: { database?: DatabaseConfig },
  connectionName: string = 'default',
): Promise<void> {
  // 如果没有提供配置，则自动加载
  let databaseConfig: DatabaseConfig | null = null;
  
  if (config?.database) {
    databaseConfig = config.database;
  } else {
    // 直接从 dweb.config.ts 读取配置（不使用 loadConfig，避免多应用模式下的问题）
    try {
      const configPath = await findConfigFile();
      if (!configPath) {
        // 如果没有找到配置文件，直接返回（不报错，允许项目不使用数据库）
        return;
      }

      // 读取配置文件
      const originalCwd = Deno.cwd();
      const configDir = configPath.includes("/")
        ? configPath.substring(0, configPath.lastIndexOf("/"))
        : originalCwd;

      // 如果配置文件在子目录中，切换到该目录
      if (configDir !== originalCwd && configDir !== ".") {
        Deno.chdir(configDir);
      }

      // 读取配置文件（使用相对于配置目录的路径）
      const configFileName = configPath.includes("/")
        ? configPath.substring(configPath.lastIndexOf("/") + 1)
        : configPath;
      const configUrl = new URL(configFileName, `file://${Deno.cwd()}/`).href;
      const configModule = await import(configUrl);

      // 恢复工作目录
      if (configDir !== originalCwd && configDir !== ".") {
        Deno.chdir(originalCwd);
      }

      // 获取默认导出
      const loadedConfig: DWebConfig = configModule.default || configModule;
      
      // 提取 database 配置（只能从根配置中获取）
      databaseConfig = loadedConfig.database || null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to load database config from dweb.config.ts: ${message}. Please ensure dweb.config.ts exists and contains database configuration.`,
      );
    }
  }

  // 如果没有数据库配置，直接返回（不报错，允许项目不使用数据库）
  if (!databaseConfig) {
    return;
  }

  // 设置配置加载器（用于模型的自动初始化）
  setDatabaseConfigLoader(() => {
    return Promise.resolve(databaseConfig);
  });

  // 初始化数据库连接
  await initDatabase(databaseConfig, connectionName);
}

/**
 * 仅设置数据库配置加载器（不初始化连接）
 * 适用于只需要设置加载器，稍后由模型自动初始化的场景
 * 
 * @param config 可选的配置对象，如果不提供则自动从 dweb.config.ts 加载
 * @returns Promise<void>
 * 
 * @example
 * ```typescript
 * import { setupDatabaseConfigLoader } from '@dreamer/dweb/features/database/init-database';
 * await setupDatabaseConfigLoader();
 * 
 * // 之后使用模型时，会自动初始化数据库
 * await User.init();
 * ```
 */
export async function setupDatabaseConfigLoader(
  config?: { database?: DatabaseConfig },
): Promise<void> {
  // 如果没有提供配置，则自动加载
  let databaseConfig: DatabaseConfig | null = null;
  
  if (config?.database) {
    databaseConfig = config.database;
  } else {
    // 直接从 dweb.config.ts 读取配置（不使用 loadConfig，避免多应用模式下的问题）
    try {
      const configPath = await findConfigFile();
      if (!configPath) {
        // 如果没有找到配置文件，直接返回（不报错，允许项目不使用数据库）
        return;
      }

      // 读取配置文件
      const originalCwd = Deno.cwd();
      const configDir = configPath.includes("/")
        ? configPath.substring(0, configPath.lastIndexOf("/"))
        : originalCwd;

      // 如果配置文件在子目录中，切换到该目录
      if (configDir !== originalCwd && configDir !== ".") {
        Deno.chdir(configDir);
      }

      // 读取配置文件（使用相对于配置目录的路径）
      const configFileName = configPath.includes("/")
        ? configPath.substring(configPath.lastIndexOf("/") + 1)
        : configPath;
      const configUrl = new URL(configFileName, `file://${Deno.cwd()}/`).href;
      const configModule = await import(configUrl);

      // 恢复工作目录
      if (configDir !== originalCwd && configDir !== ".") {
        Deno.chdir(originalCwd);
      }

      // 获取默认导出
      const loadedConfig: DWebConfig = configModule.default || configModule;
      
      // 提取 database 配置（只能从根配置中获取）
      databaseConfig = loadedConfig.database || null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to load database config from dweb.config.ts: ${message}. Please ensure dweb.config.ts exists and contains database configuration.`,
      );
    }
  }

  // 设置配置加载器（用于模型的自动初始化）
  setDatabaseConfigLoader(() => {
    return Promise.resolve(databaseConfig);
  });
}

