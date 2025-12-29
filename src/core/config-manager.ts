/**
 * 配置管理器模块
 * 统一管理应用配置的加载、验证和访问
 *
 * @module core/config-manager
 */

import type { AppConfig } from "../common/types/index.ts";
import { loadConfig as loadConfigFile, mergeConfig } from "./config.ts";

/**
 * 配置管理器
 * 统一管理应用配置的加载、验证和访问
 *
 * @example
 * ```ts
 * import { ConfigManager } from "@dreamer/dweb/core/config-manager";
 *
 * const configManager = new ConfigManager("dweb.config.ts");
 * await configManager.load();
 *
 * const config = configManager.getConfig();
 * const port = config.server.port;
 * ```
 */
export class ConfigManager {
  /** 配置文件路径 */
  private configPath?: string;
  /** 应用名称（多应用模式使用） */
  private appName?: string;
  /** 配置对象 */
  private config: AppConfig | null = null;
  /** 配置文件所在目录 */
  private configDir: string = "";

  /**
   * 构造函数
   *
   * @param configPath - 配置文件路径（可选，如果不提供则自动查找）
   * @param appName - 应用名称（可选，用于多应用模式）
   */
  constructor(configPath?: string, appName?: string) {
    this.configPath = configPath;
    this.appName = appName;
  }

  /**
   * 加载配置
   * 从配置文件加载配置，并进行验证
   *
   * @throws {Error} 如果配置文件不存在或格式错误
   *
   * @example
   * ```ts
   * const configManager = new ConfigManager();
   * await configManager.load();
   * ```
   */
  async load(): Promise<void> {
    // 如果已经加载过，跳过重复加载
    if (this.config !== null) {
      console.debug(
        `[ConfigManager] 配置已加载，跳过重复加载: configPath=${this.configPath}, appName=${this.appName}`,
      );
      return;
    }
    console.debug(
      `[ConfigManager] 开始加载配置: configPath=${this.configPath}, appName=${this.appName}`,
    );
    const { config, configDir } = await loadConfigFile(
      this.configPath,
      this.appName,
    );
    this.config = config;
    this.configDir = configDir;
    this.validate();
    console.debug(
      `[ConfigManager] 配置加载完成: plugins=${
        config.plugins?.length || 0
      }, middleware=${config.middleware?.length || 0}`,
    );
  }

  /**
   * 获取配置
   *
   * @returns 配置对象
   * @throws {Error} 如果配置未加载
   *
   * @example
   * ```ts
   * const config = configManager.getConfig();
   * const port = config.server.port;
   * ```
   */
  getConfig(): AppConfig {
    if (!this.config) {
      throw new Error("配置未加载，请先调用 load() 方法");
    }
    return this.config;
  }

  /**
   * 获取配置目录
   *
   * @returns 配置文件所在目录
   */
  getConfigDir(): string {
    return this.configDir;
  }

  /**
   * 验证配置
   * 检查配置是否有效
   *
   * @throws {Error} 如果配置无效
   */
  private validate(): void {
    if (!this.config) {
      throw new Error("配置未加载，无法验证");
    }
    // 基本验证：检查必需字段
    if (!this.config.server || !this.config.server.port) {
      throw new Error("配置必须包含 server.port");
    }
    if (!this.config.routes) {
      throw new Error("配置必须包含 routes");
    }
    if (!this.config.build || !this.config.build.outDir) {
      throw new Error("配置必须包含 build.outDir");
    }
  }

  /**
   * 合并配置
   * 将基础配置和应用配置合并
   *
   * @param baseConfig - 基础配置（顶层配置，部分配置）
   * @param appConfig - 应用配置（完整配置）
   * @returns 合并后的完整配置对象
   *
   * @example
   * ```ts
   * const merged = configManager.merge(baseConfig, appConfig);
   * ```
   */
  merge(baseConfig: Partial<AppConfig>, appConfig: AppConfig): AppConfig {
    return mergeConfig(baseConfig, appConfig);
  }

  /**
   * 检查配置是否已加载
   *
   * @returns 如果配置已加载返回 true，否则返回 false
   */
  isLoaded(): boolean {
    return this.config !== null;
  }

  /**
   * 设置配置
   * 直接设置配置对象（用于程序化配置）
   *
   * @param config - 配置对象
   *
   * @example
   * ```ts
   * configManager.setConfig({
   *   server: { port: 3000 },
   *   routes: { dir: "routes" },
   *   // ... 其他配置
   * });
   * ```
   */
  setConfig(config: AppConfig): void {
    this.config = config;
    this.validate();
  }
}
