/**
 * init 生成的 config 与 common 配置、工具占位模块
 * 单应用使用完整配置模板（所有项列出，未用项注释）；多应用 common 使用完整模板，各应用仅覆盖
 */

import { DEFAULT_PORT_BASE } from "../constants.ts";
import { $tr, getAppKind, getDefaultLanguage } from "../helpers.ts";
import type { AppKind, InitOptions } from "../types.ts";
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
  _port?: number,
  kindOverride?: AppKind,
): string {
  const prefix = opts.useSrc ? "src/" : "";
  const routesDir = appName
    ? `./${prefix}${appName}/routes`
    : opts.useSrc
    ? "./src/routes"
    : "./routes";
  /**
   * 多应用：全局展示名用「项目名-应用目录名」（如 book + backend → book-backend），
   * 便于日志/监控区分；单应用仍为项目名称。
   */
  const configName = appName != null
    ? `${opts.projectName}-${appName}`
    : opts.projectName;
  const kind = kindOverride ?? getAppKind(opts, appName);
  const renderMode = opts.renderMode ?? "hybrid";

  if (appName) {
    if (kind === "console") {
      return `/**
 * ${$tr("init.comments.appConfig", { appName })}
 * ${$tr("init.comments.commonFieldsMerged")}
 */
import type { AppConfig } from "@dreamer/dweb";

export default {
  /** ${$tr("init.comments.nameDesc")} */
  name: "${configName}",
  /** ${$tr("init.comments.kindDesc")} */
  kind: "console",
  /** ${$tr("init.comments.versionDesc")} */
  version: "1.0.0",
  /** ${$tr("init.comments.routerDesc")} */
  router: {
    /** ${$tr("init.comments.routesDirDesc")} */
    routesDir: "${routesDir}",
  },
  /** ${$tr("init.comments.loggerDesc")} */
  logger: {
    level: "info",
    format: "text",
    output: {
      console: "auto",
      file: {
        path: "runtime/logs/${appName}.log",
        rotate: true,
        strategy: "size",
        maxSize: 10 * 1024 * 1024,
        maxFiles: 5,
      },
    },
  },
} satisfies AppConfig;
`;
    }

    if (kind === "api") {
      return `/**
 * ${$tr("init.comments.appConfig", { appName })}
 * ${$tr("init.comments.commonFieldsMerged")}
 * Production: securityHeaders / cors allowlist / rateLimit — see PRODUCTION_CHECKLIST
 */
import type { AppConfig } from "@dreamer/dweb";

export default {
  /** ${$tr("init.comments.nameDesc")} */
  name: "${configName}",
  /** ${$tr("init.comments.kindDesc")} */
  kind: "api",
  /** ${$tr("init.comments.versionDesc")} */
  version: "1.0.0",
  /** ${$tr("init.comments.routerDesc")} */
  router: {
    /** ${$tr("init.comments.routesDirDesc")} */
    routesDir: "${routesDir}",
  },
  /** ${$tr("init.comments.loggerDesc")} */
  logger: {
    level: "info",
    format: "text",
    output: {
      console: "auto",
      file: {
        path: "runtime/logs/${appName}.log",
        rotate: true,
        strategy: "size",
        maxSize: 10 * 1024 * 1024,
        maxFiles: 5,
      },
    },
  },
  /** ${$tr("init.comments.buildDesc")} */
  build: {
    server: {
      /** ${$tr("init.comments.useNativeCompileDesc")} */
      useNativeCompile: false,
    },
  },
  // securityHeaders: true,
  // cors: { origin: ["https://app.example.com"], credentials: true },
  // rateLimit: { windowMs: 60_000, max: 120 },
} satisfies AppConfig;
`;
    }

    return `/**
 * ${$tr("init.comments.appConfig", { appName })}
 * ${$tr("init.comments.commonFieldsMerged")}
 */
import type { AppConfig } from "@dreamer/dweb";

export default {
  /** ${$tr("init.comments.nameDesc")} */
  name: "${configName}",
  /** ${$tr("init.comments.kindDesc")} */
  kind: "web",
  /** ${$tr("init.comments.versionDesc")} */
  version: "1.0.0",
  /** ${$tr("init.comments.routerDesc")} */
  router: {
    /** ${$tr("init.comments.routesDirDesc")} */
    routesDir: "${routesDir}",
  },
  /** ${$tr("init.comments.renderDesc")} */
  // ${$tr("init.comments.renderFullDoc")}
  render: {
    /** ${$tr("init.comments.renderEngineDesc")} */
    engine: "${opts.engine}",
    /** ${$tr("init.comments.renderModeDesc")} */
    mode: "${renderMode}",
    // debug: false,
    // /** ${$tr("init.comments.ssrHydrate")} */
    // ssr: {
    //   /** ${$tr("init.comments.ssrHydrateOption")} */
    //   hydrate: true,
    // },
    // ssg: {
    //   outputDir: "dist/static",
    //   routes: ["/", "/about"],
    //   /** ${$tr("init.comments.dynamicRoutesSupport")} */
    //   dynamicRoutes: {
    //     "/user/[id]": ["1", "2", "3"],
    //   }, // ${$tr("init.comments.dynamicRoutesExample")}
    //   /** ${$tr("init.comments.ssgHydrateOption")} */
    //   hydrate: true,
    // },
  },
  /** ${$tr("init.comments.loggerDesc")} */
  logger: {
    /** ${$tr("init.comments.loggerLevelDesc")} */
    level: "info",
    /** ${$tr("init.comments.loggerFormatDesc")} */
    format: "text",
    /** ${$tr("init.comments.loggerOutputDesc")} */
    output: {
      console: "auto",
      file: {
        path: "runtime/logs/${appName}.log",
        rotate: true,
        strategy: "size",
        maxSize: 10 * 1024 * 1024,
        maxFiles: 5,
      },
    },
  },
  /** ${$tr("init.comments.buildDesc")} */
  build: {
    server: {
      /** ${$tr("init.comments.useNativeCompileDesc")} */
      useNativeCompile: false,
    },
  },
} satisfies AppConfig;
`;
  }

  return getFullSingleAppConfigMainTs(opts, kind);
}

/** 开发环境配置 main.dev.ts：host 与 port 单独在此，开发时仅监听本机 */
export function getConfigMainDevTs(port: number = DEFAULT_PORT_BASE): string {
  return `/**
 * ${$tr("init.comments.devConfig")}
 * ${$tr("init.comments.devConfigOverride")}
 */
export default {
  server: {
    host: "127.0.0.1",
    port: ${port},
    dev: {
      hmr: {
        enabled: true,
        path: "/__hmr",
      },
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

/** 生产环境配置 main.prod.ts：host 与 port 单独在此，生产监听所有网卡 */
export function getConfigMainProdTs(port: number = DEFAULT_PORT_BASE): string {
  return `/**
 * ${$tr("init.comments.prodConfig")}
 * ${$tr("init.comments.devConfigOverride")}
 */
export default {
  server: {
    host: "0.0.0.0",
    port: ${port},
  },
};
`;
}

/** common 目录下 config/main.ts；单应用无 common 时简短占位，多应用时使用完整配置模板 */
export function getCommonConfigMainTs(opts: InitOptions): string {
  const appNames = opts.appNames ?? [];
  if (appNames.length === 0) {
    const language = getDefaultLanguage();
    return `/**
 * ${$tr("init.comments.commonConfigEntry")}
 * ${$tr("init.comments.commonConfigEntryDesc")}
 */

export const commonConfig = {
  appName: "${opts.projectName}",
  version: "1.0.0",
};

export default {
  name: commonConfig.appName,
  version: commonConfig.version,
  /** ${$tr("init.comments.frameworkLanguageShort")} ${
      $tr("init.comments.frameworkLanguageSuffix")
    } */
  language: "${language}",
};
`;
  }
  return getFullCommonConfigMainTs(opts);
}

/** common 目录下 config/main.dev.ts 占位 */
export function getCommonConfigMainDevTs(): string {
  return `/**
 * ${$tr("init.comments.devConfig")}
 * ${$tr("init.comments.devConfigOverride")}
 */
export default {};
`;
}

/** common 目录下 utils/mod.ts 占位 */
export function getCommonUtilsModTs(): string {
  return `/**
 * ${$tr("init.comments.commonUtils")}
 * ${$tr("init.comments.commonUtilsImport")}
 */

export function noop(): void {}
`;
}

/** common 目录下 model、service、hook 等占位模块 */
export function getCommonSubdirModTs(moduleName: string): string {
  return `/**
 * common/${moduleName}
 * ${$tr("init.comments.commonModuleDesc", { moduleName })}
 */

export {};
`;
}
