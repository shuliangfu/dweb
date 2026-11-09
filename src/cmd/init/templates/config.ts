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
    /** ${$tr("init.comments.loggerLevelDesc")} */
    level: "info",
    /** ${$tr("init.comments.loggerFormatDesc")} */
    format: "text",
    /** ${$tr("init.comments.loggerOutputDesc")} */
    output: {
      /** ${$tr("init.comments.loggerOutputConsoleDesc")} */
      console: "auto",
      /** ${$tr("init.comments.loggerOutputFileDesc")} */
      file: {
        /** ${$tr("init.comments.loggerFilePathDesc")} */
        path: "runtime/logs/${appName}.log",
        /** ${$tr("init.comments.loggerFileRotateDesc")} */
        rotate: true,
        /** ${$tr("init.comments.loggerFileStrategyDesc")} */
        strategy: "size",
        /** ${$tr("init.comments.loggerFileMaxSizeDesc")} */
        maxSize: 10 * 1024 * 1024,
        /** ${$tr("init.comments.loggerFileMaxFilesDesc")} */
        maxFiles: 5,
      },
    },
  },
} satisfies AppConfig;
`;
    }

    if (kind === "api") {
      const apiMode = opts.apiMode ?? "action";
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
    /** ${$tr("init.comments.apiModeDesc")} */
    apiMode: "${apiMode}",
  },
  /** ${$tr("init.comments.loggerDesc")} */
  logger: {
    /** ${$tr("init.comments.loggerLevelDesc")} */
    level: "info",
    /** ${$tr("init.comments.loggerFormatDesc")} */
    format: "text",
    /** ${$tr("init.comments.loggerOutputDesc")} */
    output: {
      /** ${$tr("init.comments.loggerOutputConsoleDesc")} */
      console: "auto",
      /** ${$tr("init.comments.loggerOutputFileDesc")} */
      file: {
        /** ${$tr("init.comments.loggerFilePathDesc")} */
        path: "runtime/logs/${appName}.log",
        /** ${$tr("init.comments.loggerFileRotateDesc")} */
        rotate: true,
        /** ${$tr("init.comments.loggerFileStrategyDesc")} */
        strategy: "size",
        /** ${$tr("init.comments.loggerFileMaxSizeDesc")} */
        maxSize: 10 * 1024 * 1024,
        /** ${$tr("init.comments.loggerFileMaxFilesDesc")} */
        maxFiles: 5,
      },
    },
  },
  /** ${$tr("init.comments.buildDesc")} */
  build: {
    /** ${$tr("init.comments.buildServerDesc")} */
    server: {
      /** ${$tr("init.comments.useNativeCompileDesc")} */
      useNativeCompile: false,
      /** ${$tr("init.comments.buildServerCompileDesc")} */
      // compile: {
      //   /** ${$tr("init.comments.buildServerCompileMinifyDesc")} */
      //   minify: true,
      //   /** ${$tr("init.comments.buildServerCompileLegalCommentsDesc")} */
      //   legalComments: "none",
      //   /** ${$tr("init.comments.buildServerCompileSourcemapDesc")} */
      //   sourcemap: true,
      // },
      /** ${$tr("init.comments.buildServerExternalDesc")} */
      // external: [],
      /** ${$tr("init.comments.buildServerExternalNpmDesc")} */
      // externalNpm: true,
      /** ${$tr("init.comments.buildServerDebugDesc")} */
      // debug: false,
    },
    /** ${$tr("init.comments.buildBuildDesc")} */
    // build: {
    //   /** ${$tr("init.comments.buildModeDesc")} */
    //   mode: "prod",
    //   /** ${$tr("init.comments.buildCleanDesc")} */
    //   clean: true,
    //   /** ${$tr("init.comments.buildCacheDesc")} */
    //   cache: true,
    //   /** ${$tr("init.comments.buildIncrementalDesc")} */
    //   incremental: true,
    //   /** ${$tr("init.comments.buildSilentDesc")} */
    //   silent: false,
    //   /** ${$tr("init.comments.buildLogLevelDesc")} */
    //   logLevel: "info",
    // },
  },
  // Production defaults (non-dev): securityHeaders + rateLimit + compression ON.
  // Escape: securityHeaders: false, rateLimit: false, compression: false
  // Opt-in: cors allowlist (never cors: true in prod), csrf: true, upload: { requireAuth: true }
  // cors: {
  //   origin: ["https://app.example.com"],
  //   credentials: true,
  // },
  // csrf: true,
  // upload: {
  //   localDir: "./uploads",
  //   requireAuth: false, // demo only; prod: authenticate
  // },
  // rateLimit: {
  //   windowMs: 60_000,
  //   max: 120,
  // },
} satisfies AppConfig;
`;
    }

    const apiMode = opts.apiMode ?? "action";
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
    /** ${$tr("init.comments.apiModeDesc")} */
    apiMode: "${apiMode}",
  },
  /** ${$tr("init.comments.renderDesc")} */
  // ${$tr("init.comments.renderFullDoc")}
  render: {
    /** ${$tr("init.comments.renderEngineDesc")} */
    engine: "${opts.engine}",
    /** ${$tr("init.comments.renderModeDesc")} */
    mode: "${renderMode}",
    /** ${$tr("init.comments.renderDebugDesc")} */
    // debug: false,
    // /** ${$tr("init.comments.ssrHydrate")} */
    // ssr: {
    //   /** ${$tr("init.comments.ssrHydrateOption")} */
    //   hydrate: true,
    // },
    // /** ${$tr("init.comments.ssgHydrate")} */
    // ssg: {
    //   /** ${$tr("init.comments.ssgOutputDirDesc")} */
    //   outputDir: "dist/static",
    //   /** ${$tr("init.comments.ssgRoutesDesc")} */
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
      /** ${$tr("init.comments.loggerOutputConsoleDesc")} */
      console: "auto",
      /** ${$tr("init.comments.loggerOutputFileDesc")} */
      file: {
        /** ${$tr("init.comments.loggerFilePathDesc")} */
        path: "runtime/logs/${appName}.log",
        /** ${$tr("init.comments.loggerFileRotateDesc")} */
        rotate: true,
        /** ${$tr("init.comments.loggerFileStrategyDesc")} */
        strategy: "size",
        /** ${$tr("init.comments.loggerFileMaxSizeDesc")} */
        maxSize: 10 * 1024 * 1024,
        /** ${$tr("init.comments.loggerFileMaxFilesDesc")} */
        maxFiles: 5,
      },
    },
  },
  /** ${$tr("init.comments.buildDesc")} */
  build: {
    /** ${$tr("init.comments.buildServerDesc")} */
    server: {
      /** ${$tr("init.comments.useNativeCompileDesc")} */
      useNativeCompile: false,
      /** ${$tr("init.comments.buildServerCompileDesc")} */
      // compile: {
      //   /** ${$tr("init.comments.buildServerCompileMinifyDesc")} */
      //   minify: true,
      //   /** ${$tr("init.comments.buildServerCompileLegalCommentsDesc")} */
      //   legalComments: "none",
      //   /** ${$tr("init.comments.buildServerCompileSourcemapDesc")} */
      //   sourcemap: true,
      // },
    },
    /** ${$tr("init.comments.buildClientDesc")} */
    // client: {
    //   /** ${$tr("init.comments.buildClientOutputDesc")} */
    //   output: "dist/client",
    //   /** ${$tr("init.comments.buildClientEngineDesc")} */
    //   engine: "${opts.engine}",
    //   /** ${$tr("init.comments.buildClientBundleDesc")} */
    //   bundle: {
    //     /** ${$tr("init.comments.buildClientBundleMinifyDesc")} */
    //     minify: true,
    //     /** ${$tr("init.comments.buildClientBundleLegalCommentsDesc")} */
    //     legalComments: "none",
    //     /** ${$tr("init.comments.buildClientBundleSourcemapDesc")} */
    //     sourcemap: false,
    //     /** ${$tr("init.comments.buildClientBundleSplittingDesc")} */
    //     splitting: true,
    //     /** ${$tr("init.comments.buildClientBundleFormatDesc")} */
    //     format: "esm",
    //   },
    // },
    /** ${$tr("init.comments.buildAssetsDesc")} */
    // assets: {
    //   /** ${$tr("init.comments.buildAssetsCssDesc")} */
    //   css: {
    //     /** ${$tr("init.comments.buildAssetsCssExtractDesc")} */
    //     extract: true,
    //     /** ${$tr("init.comments.buildAssetsCssMinifyDesc")} */
    //     minify: true,
    //     /** ${$tr("init.comments.buildAssetsCssAutoprefixDesc")} */
    //     autoprefix: true,
    //   },
    //   /** ${$tr("init.comments.buildAssetsImagesDesc")} */
    //   images: {
    //     /** ${$tr("init.comments.buildAssetsImagesCompressDesc")} */
    //     compress: true,
    //     /** ${$tr("init.comments.buildAssetsImagesFormatDesc")} */
    //     format: "webp",
    //   },
    //   /** ${$tr("init.comments.buildAssetsPublicDirDesc")} */
    //   publicDir: "public",
    //   /** ${$tr("init.comments.buildAssetsAssetsDirDesc")} */
    //   assetsDir: "assets",
    // },
    /** ${$tr("init.comments.buildBuildDesc")} */
    // build: {
    //   /** ${$tr("init.comments.buildModeDesc")} */
    //   mode: "prod",
    //   /** ${$tr("init.comments.buildCleanDesc")} */
    //   clean: true,
    //   /** ${$tr("init.comments.buildCacheDesc")} */
    //   cache: true,
    //   /** ${$tr("init.comments.buildIncrementalDesc")} */
    //   incremental: true,
    //   /** ${$tr("init.comments.buildSilentDesc")} */
    //   silent: false,
    //   /** ${$tr("init.comments.buildLogLevelDesc")} */
    //   logLevel: "info",
    // },
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
  /** ${$tr("init.comments.serverDesc")} */
  server: {
    /** ${$tr("init.comments.serverHostDesc")} */
    host: "127.0.0.1",
    /** ${$tr("init.comments.serverPortDesc")} */
    port: ${port},
    /** ${$tr("init.comments.serverDevHmrDesc")} */
    dev: {
      hmr: {
        /** ${$tr("init.comments.serverDevHmrEnabledDesc")} */
        enabled: true,
        /** ${$tr("init.comments.serverDevHmrPathDesc")} */
        path: "/__hmr",
      },
      /** ${$tr("init.comments.serverDevWatchDesc")} */
      watch: {
        /** ${$tr("init.comments.serverDevWatchPathsDesc")} */
        paths: ["./src"],
        /** ${$tr("init.comments.serverDevWatchIgnoreDesc")} */
        ignore: ["node_modules", ".git", "dist"],
      },
    },
  },
  /** ${$tr("init.comments.loggerDesc")} */
  logger: {
    /** ${$tr("init.comments.loggerLevelDesc")} */
    level: "debug",
    /** ${$tr("init.comments.loggerFormatDesc")} */
    format: "text",
  },
  /** ${$tr("init.comments.hotReloadDesc")} */
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
  /** ${$tr("init.comments.serverDesc")} */
  server: {
    /** ${$tr("init.comments.serverHostDesc")} */
    host: "0.0.0.0",
    /** ${$tr("init.comments.serverPortDesc")} */
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
