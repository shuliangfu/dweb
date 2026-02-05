/**
 * @dreamer/esbuild 集成
 *
 * 初始化构建工具（Builder），配置客户端/服务端构建，执行构建任务。
 * 使用 engine 字段、dev/prod 模式。导出 initializeBuild、getBuild。
 *
 * @module
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
 * 根据 build 与 render 配置创建 Builder 实例，注册到服务容器。
 *
 * @param container 服务容器
 * @param config 应用配置
 * @returns Builder 实例
 *
 * @example
 * ```ts
 * const builder = initializeBuild(container, config);
 * await builder.build();
 * ```
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

  logger.info($t("log.buildToolReady"));

  return builder;
}

/**
 * 获取构建器实例
 *
 * @param container 服务容器
 * @returns 构建器实例
 *
 * @example
 * ```ts
 * const builder = getBuild(container);
 * await builder.build();
 * ```
 */
export function getBuild(container: ServiceContainer): Builder {
  return container.get<Builder>("build");
}
