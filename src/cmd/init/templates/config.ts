/**
 * init 生成的 config 与 common 配置、工具占位模块
 * 单应用使用完整配置模板（所有项列出，未用项注释）；多应用 common 使用完整模板，各应用仅覆盖
 */

import { $t, getDefaultLanguage } from "../helpers.ts";
import { DEFAULT_PORT_BASE } from "../constants.ts";
import type { InitOptions } from "../types.ts";
import {
  getFullCommonConfigMainTs,
  getFullSingleAppConfigMainTs,
} from "./config-full.ts";

/**
 * 应用配置 main.ts（框架自动加载并合并，多应用时 common/config 先加载，本应用配置可覆盖）
 * 单应用：输出完整配置模板（参考 APP_CONFIG.md，未用项注释）；多应用：仅输出本应用覆盖字段
 */
export function getConfigMainTs(
  opts: InitOptions,
  appName?: string,
  port?: number,
): string {
  const prefix = opts.useSrc ? "src/" : "";
  const routesDir = appName
    ? `./${prefix}${appName}/routes`
    : opts.useSrc
    ? "./src/routes"
    : "./routes";
  const configName = appName ?? opts.projectName;
  const serverPort = port ?? DEFAULT_PORT_BASE;
  const renderMode = opts.renderMode ?? "hybrid";

  if (appName) {
    return `/**
 * ${$t("init.comments.appConfig", { appName })}
 * ${$t("init.comments.commonFieldsMerged")}
 */
import type { AppConfig } from "@dreamer/dweb";

export default {
  name: "${configName}",
  version: "1.0.0",
  server: {
    port: ${serverPort},
    host: "127.0.0.1",
  },
  router: {
    routesDir: "${routesDir}",
  },
  render: {
    engine: "${opts.engine}",
    mode: "${renderMode}",
  },
  logger: {
    level: "info",
    format: "text",
    output: {
      auto: true,
      console: true,
      file: {
        path: "runtime/logs/${appName}.log",
        rotate: true,
        strategy: "size",
        maxSize: 10 * 1024 * 1024,
        maxFiles: 5,
      },
    },
  },
  build: {
    server: {
      useNativeCompile: false,
    },
  },
} satisfies AppConfig;
`;
  }

  return getFullSingleAppConfigMainTs(opts);
}

/** 开发环境配置 main.dev.ts */
export function getConfigMainDevTs(): string {
  return `/**
 * ${$t("init.comments.devConfig")}
 * ${$t("init.comments.devConfigOverride")}
 */
export default {
  server: {
    dev: {
      hmr: { enabled: true, path: "/__hmr" },
      watch: {
        paths: ["./src"],
        ignore: ["node_modules", ".git", "dist"],
      },
    },
  },
  logger: {
    level: "debug",
    format: "text",
  },
  hotReload: true,
};
`;
}

/** 生产环境配置 main.prod.ts 占位 */
export function getConfigMainProdTs(): string {
  return `/**
 * ${$t("init.comments.prodConfig")}
 * ${$t("init.comments.devConfigOverride")}
 */
export default {};
`;
}

/** common 目录下 config/main.ts；单应用无 common 时简短占位，多应用时使用完整配置模板 */
export function getCommonConfigMainTs(opts: InitOptions): string {
  const appNames = opts.appNames ?? [];
  if (appNames.length === 0) {
    const language = getDefaultLanguage();
    return `/**
 * ${$t("init.comments.commonConfigEntry")}
 * ${$t("init.comments.commonConfigEntryDesc")}
 */

export const commonConfig = {
  appName: "${opts.projectName}",
  version: "1.0.0",
};

export default {
  name: commonConfig.appName,
  version: commonConfig.version,
  /** ${
      $t("init.comments.frameworkLanguageShort")
    }（init 时按环境检测，可改为 zh-CN / en-US 等） */
  language: "${language}",
};
`;
  }
  return getFullCommonConfigMainTs(opts);
}

/** common 目录下 config/main.dev.ts 占位 */
export function getCommonConfigMainDevTs(): string {
  return `/**
 * ${$t("init.comments.devConfig")}
 * ${$t("init.comments.devConfigOverride")}
 */
export default {};
`;
}

/** common 目录下 utils/mod.ts 占位 */
export function getCommonUtilsModTs(): string {
  return `/**
 * ${$t("init.comments.commonUtils")}
 * ${$t("init.comments.commonUtilsImport")}
 */

export function noop(): void {}
`;
}

/** common 目录下 model、service、hook 等占位模块 */
export function getCommonSubdirModTs(moduleName: string): string {
  return `/**
 * common/${moduleName}
 * ${$t("init.comments.commonModuleDesc", { moduleName })}
 */

export {};
`;
}
