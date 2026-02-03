/**
 * @dreamer/esbuild 集成
 *
 * 职责：
 * - 初始化构建工具
 * - 配置构建选项
 * - 处理客户端和服务端构建
 *
 * 功能：
 * - 创建 Builder 实例
 * - 构建配置管理
 * - 构建任务执行
 *
 * 注意：
 * - @dreamer/esbuild 使用 `engine` 字段（不是 `framework`），类型为 `Engine`（不是 `Framework`）
 * - 构建模式使用 `dev` 或 `prod`（不是 `development` 或 `production`）
 */

import {
  Builder,
  type BuilderConfig,
  type ClientConfig,
} from "@dreamer/esbuild";
import type { ServiceContainer } from "@dreamer/service";
import { getEnv } from "../core/runtime-adapter.ts";
import type { AppConfig } from "../types/app.ts";
import { getLogger } from "../utils/logger.ts";

/**
 * 初始化构建工具
 *
 * @param container 服务容器
 * @param config 应用配置
 */
export function initializeBuild(
  container: ServiceContainer,
  config: AppConfig,
): Builder {
  // 从配置中获取构建选项
  const buildConfig = (config.build || {}) as Record<string, unknown>;
  const renderConfig = (config.render || {}) as {
    engine?: "react" | "preact";
    mode?: "ssr" | "csr" | "ssg";
  };

  // 获取日志实例
  const logger = getLogger(container);

  // 构建 BuilderConfig
  // 处理客户端配置：优先使用 buildConfig.client，如果没有则从 renderConfig 生成
  let clientConfig: ClientConfig | undefined;
  const existingClientConfig = buildConfig.client as ClientConfig | undefined;

  if (existingClientConfig) {
    // 如果已有客户端配置，直接使用
    clientConfig = existingClientConfig;
  } else if (renderConfig.engine) {
    // 如果没有客户端配置但有渲染引擎，生成默认配置
    clientConfig = {
      engine: renderConfig.engine,
      output: "./dist/client",
      // 其他字段使用默认值或 undefined
    };
  }

  const builderConfig: BuilderConfig = {
    // 服务端配置（如果有）
    server: buildConfig.server as BuilderConfig["server"],
    // 客户端配置
    client: clientConfig,
    // 资源处理配置
    assets: buildConfig.assets as BuilderConfig["assets"],
    // 构建选项
    build: {
      mode: (buildConfig.mode as "dev" | "prod") ||
        (getEnv("DENO_ENV") || getEnv("BUN_ENV") ||
          "prod") as "dev" | "prod",

      clean: buildConfig.clean as boolean | undefined,
      cache: buildConfig.cache as boolean | string | undefined,
      incremental: buildConfig.incremental as boolean | undefined,
      watch: buildConfig.watch as BuilderConfig["build"] extends
        { watch?: infer T } ? T
        : never,
      onProgress: buildConfig.onProgress as BuilderConfig["build"] extends {
        onProgress?: infer T;
      } ? T
        : never,
      silent: buildConfig.silent as boolean | undefined,
      slowBuildThreshold: buildConfig.slowBuildThreshold as number | undefined,
      validateConfig: buildConfig.validateConfig as boolean | undefined,
      logLevel: buildConfig.logLevel as BuilderConfig["build"] extends {
        logLevel?: infer T;
      } ? T
        : never,
      reportHTML: buildConfig.reportHTML as boolean | string | undefined,
    } as BuilderConfig["build"],
    validateConfig: buildConfig.validateConfig as boolean | undefined,
  };

  // 创建 Builder 实例
  const builder = new Builder(builderConfig);

  // 将构建器注册到服务容器
  container.registerSingleton("build", () => builder);

  logger.info("构建工具初始化完成");

  return builder;
}

/**
 * 获取构建器实例
 *
 * @param container 服务容器
 * @returns 构建器实例
 */
export function getBuild(container: ServiceContainer): Builder {
  return container.get<Builder>("build");
}
