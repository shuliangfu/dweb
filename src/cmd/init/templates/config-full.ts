/**
 * 完整 AppConfig 模板：所有配置项均列出，未启用的以注释形式保留，便于用户查阅
 * 参考 docs/en-US/APP_CONFIG.md 与 AppConfig 类型
 *
 * 约定：build.server / client / assets / build.build / logger 等块一律多行展开，
 * 每个字段（含注释掉的示例）都带说明注释，避免一行堆字段。
 */

import { DEFAULT_PORT_BASE } from "../constants.ts";
import {
  $tr,
  getAppKind,
  getBuildServerExternal,
  getDefaultLanguage,
} from "../helpers.ts";
import type { AppKind, InitOptions } from "../types.ts";

/** 服务端 external 多行列表（Bun 引擎时注入） */
function buildServerExternalBlock(opts: InitOptions): string {
  const ext = getBuildServerExternal(opts);
  if (!ext?.length) return "";
  const lines = ext.map((e) => `        "${e}"`).join(",\n");
  return `
      // ${$tr("init.comments.buildServerExternalBun")}
      /** ${$tr("init.comments.buildServerExternalDesc")} */
      external: [
${lines}
      ],`;
}

/**
 * build.server 内注释掉的可选字段（多行＋逐字段注释）
 * @param withStandalone 是否含 standalone（web/common 有，api 精简版也可有）
 */
function commentedBuildServerOptionalFields(): string {
  return `      /** ${$tr("init.comments.buildServerEntryDesc")} */
      // entry: "src/main.ts",
      /** ${$tr("init.comments.buildServerOutputDesc")} */
      // output: "dist",
      /** ${$tr("init.comments.buildServerTargetDesc")} */
      // target: "deno",
      /** ${$tr("init.comments.buildServerCompileDesc")} */
      // compile: {
      //   /** ${$tr("init.comments.buildServerCompileMinifyDesc")} */
      //   minify: true,
      //   /** ${$tr("init.comments.buildServerCompileLegalCommentsDesc")} */
      //   legalComments: "none",
      //   /** ${$tr("init.comments.buildServerCompileSourcemapDesc")} */
      //   sourcemap: true,
      //   /** ${$tr("init.comments.buildServerCompilePlatformDesc")} */
      //   platform: ["linux", "darwin", "windows"],
      //   /** ${$tr("init.comments.buildServerCompileStandaloneDesc")} */
      //   standalone: false,
      // },
      /** ${$tr("init.comments.buildServerExternalDesc")} */
      // external: ["tailwindcss", "lightningcss"],
      /** ${$tr("init.comments.buildServerExternalNpmDesc")} */
      // externalNpm: true,
      /** ${$tr("init.comments.buildServerExcludePathsDesc")} */
      // excludePaths: ["node_modules", ".bun/install"],
      /** ${$tr("init.comments.buildServerDebugDesc")} */
      // debug: false,`;
}

/** 注释掉的 build.client 整块（多行＋逐字段注释） */
function commentedBuildClientBlock(engine: string): string {
  return `    /** ${$tr("init.comments.buildClientDesc")} */
    // client: {
    //   /** ${$tr("init.comments.buildClientEntryDesc")} */
    //   entry: "...",
    //   /** ${$tr("init.comments.buildClientOutputDesc")} */
    //   output: "dist/client",
    //   /** ${$tr("init.comments.buildClientEngineDesc")} */
    //   engine: "${engine}",
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
    //     /** ${$tr("init.comments.buildClientBundleExternalDesc")} */
    //     // external: [],
    //     /** ${$tr("init.comments.buildClientBundleAliasDesc")} */
    //     // alias: {
    //     //   "@dreamer/ui-view": "../src/mod.ts",
    //     // },
    //     /** ${$tr("init.comments.buildClientBundleChunkNamesDesc")} */
    //     // chunkNames: "[name]-[hash]",
    //   },
    //   /** ${$tr("init.comments.buildClientHtmlDesc")} */
    //   html: {
    //     /** ${$tr("init.comments.buildClientHtmlTemplateDesc")} */
    //     template: "src/index.html",
    //     /** ${$tr("init.comments.buildClientHtmlTitleDesc")} */
    //     title: "My App",
    //   },
    //   /** ${$tr("init.comments.buildClientSourcemapDesc")} */
    //   sourcemap: true,
    //   /** ${$tr("init.comments.buildClientDebugDesc")} */
    //   debug: false,
    // },`;
}

/** 注释掉的 build.assets 整块 */
function commentedBuildAssetsBlock(): string {
  return `    /** ${$tr("init.comments.buildAssetsDesc")} */
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
    //   /** ${$tr("init.comments.buildAssetsExcludeDesc")} */
    //   // exclude: ["tailwind.css"],
    // },`;
}

/** 注释掉的 build.build（esbuild BuildOptions，路径为 app.build.build.*） */
function commentedBuildBuildBlock(): string {
  return `    /** ${$tr("init.comments.buildBuildDesc")} */
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
    // },`;
}

/** 注释掉的 build.devCache */
function commentedBuildDevCacheBlock(): string {
  return `    /** ${$tr("init.comments.buildDevCacheDesc")} */
    // devCache: {
    //   /** ${$tr("init.comments.buildDevCacheMaxCssRouteCacheSizeDesc")} */
    //   maxCssRouteCacheSize: 500,
    //   /** ${$tr("init.comments.buildDevCacheMaxVersionMapSizeDesc")} */
    //   maxVersionMapSize: 2000,
    //   /** ${$tr("init.comments.buildDevCacheEvictionBatchIntervalDesc")} */
    //   evictionBatchInterval: 50,
    // },`;
}

/** logger.output.file 多行字段（启用态） */
function loggerFileBlock(path: string, indent = "        "): string {
  return `${indent}/** ${$tr("init.comments.loggerFilePathDesc")} */
${indent}path: "${path}",
${indent}/** ${$tr("init.comments.loggerFileRotateDesc")} */
${indent}rotate: true,
${indent}/** ${$tr("init.comments.loggerFileStrategyDesc")} */
${indent}strategy: "size",
${indent}/** ${$tr("init.comments.loggerFileMaxSizeDesc")} */
${indent}maxSize: 10 * 1024 * 1024,
${indent}/** ${$tr("init.comments.loggerFileMaxFilesDesc")} */
${indent}maxFiles: 5,`;
}

/**
 * 单应用完整 config/main.ts：所有配置节均存在，不用的整块注释
 */
export function getFullSingleAppConfigMainTs(
  opts: InitOptions,
  kindOverride?: AppKind,
): string {
  const routesDir = opts.useSrc ? "./src/routes" : "./routes";
  const watchPaths = opts.useSrc ? ["./src"] : ["./"];
  const configName = opts.projectName;
  const serverPort = DEFAULT_PORT_BASE;
  const renderMode = opts.renderMode ?? "hybrid";
  const language = getDefaultLanguage();
  const kind = kindOverride ?? getAppKind(opts);
  const apiMode = opts.apiMode ?? "action";

  if (kind === "console") {
    return `/**
 * ${$tr("init.comments.appConfigShort")}
 * ${$tr("init.comments.frameworkAutoLoads")}
 * ${$tr("init.comments.consoleConfigHint")}
 */
import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  /** ${$tr("init.comments.nameDesc")} */
  name: "${configName}",
  /** ${$tr("init.comments.kindDesc")} */
  kind: "console",
  /** ${$tr("init.comments.versionDesc")} */
  version: "1.0.0",
  /** ${$tr("init.comments.frameworkLanguage")} ${
      $tr("init.comments.frameworkLanguageSuffix")
    } */
  language: "${language}",
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
${loggerFileBlock("runtime/logs/app.log")}
      },
    },
  },
  /** ${$tr("init.comments.consoleSlimDesc")} */
  // console: { slim: true },
};

export default config;
`;
  }

  if (kind === "api") {
    return `/**
 * ${$tr("init.comments.appConfigShort")}
 * ${$tr("init.comments.frameworkAutoLoads")}
 * ${$tr("init.comments.apiConfigHint")}
 * ${$tr("init.comments.apiProductionSecurityHint")}
 */
import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  /** ${$tr("init.comments.nameDesc")} */
  name: "${configName}",
  /** ${$tr("init.comments.kindDesc")} */
  kind: "api",
  /** ${$tr("init.comments.versionDesc")} */
  version: "1.0.0",
  /** ${$tr("init.comments.frameworkLanguage")} ${
      $tr("init.comments.frameworkLanguageSuffix")
    } */
  language: "${language}",
  /** ${$tr("init.comments.hotReloadDesc")} */
  hotReload: true,
  // ${
      $tr("init.comments.configHostPortInDevProd", {
        serverPort: String(serverPort),
      })
    }
  /** ${$tr("init.comments.serverDesc")} */
  server: {
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
        paths: ${JSON.stringify(watchPaths)},
        /** ${$tr("init.comments.serverDevWatchIgnoreDesc")} */
        ignore: ["node_modules", ".git", "dist"],
      },
    },
  },
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
${loggerFileBlock("runtime/logs/app.log")}
      },
    },
  },
  /** ${$tr("init.comments.buildDesc")} */
  build: {
    /** ${$tr("init.comments.buildServerDesc")} */
    server: {
      /** ${$tr("init.comments.useNativeCompileDesc")} */
      useNativeCompile: false,${buildServerExternalBlock(opts)}
${commentedBuildServerOptionalFields()}
    },
${commentedBuildBuildBlock()}
  },
  // ${$tr("init.comments.optInSecurityHint")}
  /** ${$tr("init.comments.corsDesc")} */
  // cors: {
  //   /** ${$tr("init.comments.corsOriginDesc")} */
  //   origin: ["https://app.example.com"],
  //   /** ${$tr("init.comments.corsCredentialsDesc")} */
  //   credentials: true,
  // },
  /** ${$tr("init.comments.csrfDesc")} */
  // csrf: true,
  /** ${$tr("init.comments.uploadDesc")} */
  // upload: {
  //   /** ${$tr("init.comments.uploadLocalDirDesc")} */
  //   localDir: "./uploads",
  //   /** ${$tr("init.comments.uploadRequireAuthDesc")} */
  //   requireAuth: false, // ${$tr("init.comments.uploadDemoOnlyHint")}
  // },
  /** ${$tr("init.comments.rateLimitDesc")} */
  // rateLimit: {
  //   /** ${$tr("init.comments.rateLimitWindowMsDesc")} */
  //   windowMs: 60_000,
  //   /** ${$tr("init.comments.rateLimitMaxDesc")} */
  //   max: 120,
  // },
  // ${$tr("init.comments.compressionDefaultHint")}
};

export default config;
`;
  }

  return `/**
 * ${$tr("init.comments.appConfigShort")}
 * ${$tr("init.comments.frameworkAutoLoads")}
 * ${$tr("init.comments.configFullDocRef")}
 */
import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  // ========== ${$tr("init.comments.sectionBasic")} ==========
  /** ${$tr("init.comments.nameDesc")} */
  name: "${configName}",
  /** ${$tr("init.comments.kindDesc")} */
  kind: "web",
  /** ${$tr("init.comments.versionDesc")} */
  version: "1.0.0",
  /** ${$tr("init.comments.frameworkLanguage")} ${
    $tr("init.comments.frameworkLanguageSuffix")
  } */
  language: "${language}",
  /** ${$tr("init.comments.envPrefixDesc")} */
  // envPrefix: "APP_",
  /** ${$tr("init.comments.hotReloadDesc")} */
  hotReload: true,

  // ========== ${$tr("init.comments.sectionPluginManager")} ==========
  /** ${$tr("init.comments.pluginManagerOptionsDesc")} */
  // pluginManagerOptions: {
  //   /** ${$tr("init.comments.pluginAutoActivateDesc")} */
  //   autoActivate: false,
  //   /** ${$tr("init.comments.pluginContinueOnErrorDesc")} */
  //   continueOnError: true,
  //   /** ${$tr("init.comments.pluginEnableHotReloadDesc")} */
  //   enableHotReload: false,
  //   /** ${$tr("init.comments.pluginHotReloadIntervalDesc")} */
  //   hotReloadInterval: 1000,
  // },

  // ========== ${$tr("init.comments.sectionServer")} ==========
  /** ${$tr("init.comments.serverDesc")} */
  // ${
    $tr("init.comments.configHostPortInDevProd", {
      serverPort: String(serverPort),
    })
  }
  server: {
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
        paths: ${JSON.stringify(watchPaths)},
        /** ${$tr("init.comments.serverDevWatchIgnoreDesc")} */
        ignore: ["node_modules", ".git", "dist"],
      },
    },
    /** ${$tr("init.comments.serverModeDesc")} */
    // mode: "dev",
    /** ${$tr("init.comments.serverOnListenDesc")} */
    // onListen: ({ host, port }) => { console.log(\`http://\${host}:\${port}\`); },
    /** ${$tr("init.comments.serverOnErrorDesc")} */
    // onError: (error) => { console.error(error); return new Response("Error", { status: 500 }); },
    /** ${$tr("init.comments.serverDebugDesc")} */
    // debug: false,
    /** ${$tr("init.comments.serverShutdownTimeoutDesc")} */
    // shutdownTimeout: 10000,
  },

  // ========== ${$tr("init.comments.sectionRouter")} ==========
  /** ${$tr("init.comments.routerDesc")} */
  router: {
    /** ${$tr("init.comments.routesDirDesc")} */
    routesDir: "${routesDir}",
    /** ${$tr("init.comments.apiModeDesc")} */
    apiMode: "${apiMode}",
    /** ${$tr("init.comments.redirectsDesc")} */
    // redirects: [
    //   {
    //     /** ${$tr("init.comments.redirectSourceDesc")} */
    //     source: "/old",
    //     /** ${$tr("init.comments.redirectDestinationDesc")} */
    //     destination: "/new",
    //     /** ${$tr("init.comments.redirectPermanentDesc")} */
    //     permanent: true,
    //   },
    // ],
    /** ${$tr("init.comments.skipAppValidationDesc")} */
    // skipAppValidation: false,
  },

  // ========== ${$tr("init.comments.sectionRender")} ==========
  /** ${$tr("init.comments.renderDesc")} */
  // ${$tr("init.comments.renderFullDocFull")}
  render: {
    /** ${$tr("init.comments.renderEngineDesc")} */
    engine: "${opts.engine}",
    /** ${$tr("init.comments.renderModeDesc")} */
    mode: "${renderMode}",
    /** ${$tr("init.comments.renderDebugDesc")} */
    // debug: false,
    /** ${$tr("init.comments.loadCacheDesc")} */
    // loadCache: false,
    // /** ${$tr("init.comments.ssrHydrate")} */
    // ssr: {
    //   /** ${$tr("init.comments.ssrHydrateOption")} */
    //   hydrate: true,
    //   /** ${$tr("init.comments.ssrStreamDesc")} */
    //   // stream: false,
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
    //   /** ${$tr("init.comments.ssgPreloadHtmlDesc")} */
    //   // preloadHtml: true,
    // },
    /** ${$tr("init.comments.hydrationMismatchDesc")} */
    // hydration: { mismatchMode: "continue" },
  },

  // ========== ${$tr("init.comments.sectionBuild")} ==========
  /** ${$tr("init.comments.buildDesc")} */
  build: {
    /** ${$tr("init.comments.buildServerDesc")} */
    server: {
      /** ${$tr("init.comments.useNativeCompileDesc")} */
      useNativeCompile: false,${buildServerExternalBlock(opts)}
${commentedBuildServerOptionalFields()}
    },
${commentedBuildClientBlock(opts.engine)}
${commentedBuildAssetsBlock()}
${commentedBuildBuildBlock()}
${commentedBuildDevCacheBlock()}
  },

  // ========== ${$tr("init.comments.sectionLogger")} ==========
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
${loggerFileBlock("runtime/logs/app.log")}
      },
    },
    /** ${$tr("init.comments.loggerColorDesc")} */
    // color: true,
    /** ${$tr("init.comments.loggerShowTimeDesc")} */
    // showTime: true,
    /** ${$tr("init.comments.loggerShowLevelDesc")} */
    // showLevel: true,
    /** ${$tr("init.comments.loggerTagsDesc")} */
    // tags: ["app"],
    /** ${$tr("init.comments.loggerFilterDesc")} */
    // filter: {
    //   includeTags: ["app", "http"],
    //   excludeTags: ["debug"],
    // },
    /** ${$tr("init.comments.loggerMaxMessageLengthDesc")} */
    // maxMessageLength: 32 * 1024,
  },

  // ========== ${$tr("init.comments.productionSecuritySection")} ==========
  /** ${$tr("init.comments.securityHeadersDesc")} */
  // securityHeaders: false, // ${
    $tr("init.comments.securityHeadersEscapeHint")
  }
  // securityHeaders: { contentSecurityPolicy: "default-src 'self'" }, // ${
    $tr("init.comments.securityHeadersCspExample")
  }
  /** ${$tr("init.comments.corsDesc")} */
  // cors: {
  //   /** ${$tr("init.comments.corsOriginDesc")} */
  //   origin: ["https://app.example.com"],
  //   /** ${$tr("init.comments.corsCredentialsDesc")} */
  //   credentials: true,
  // },
  // cors: true, // ${$tr("init.comments.corsOpenWarn")}
  /** ${$tr("init.comments.compressionDesc")} */
  // compression: false,
  // compression: {
  //   /** ${$tr("init.comments.compressionThresholdDesc")} */
  //   threshold: 1024,
  //   /** ${$tr("init.comments.compressionBrotliDesc")} */
  //   enableBrotli: true,
  // },
  /** ${$tr("init.comments.rateLimitDesc")} */
  // rateLimit: false, // ${$tr("init.comments.rateLimitEscapeHint")}
  // rateLimit: {
  //   /** ${$tr("init.comments.rateLimitWindowMsDesc")} */
  //   windowMs: 60_000,
  //   /** ${$tr("init.comments.rateLimitMaxDesc")} */
  //   max: 120,
  // },
  /** ${$tr("init.comments.csrfDesc")} */
  // csrf: true,
  /** ${$tr("init.comments.uploadDesc")} */
  // upload: {
  //   /** ${$tr("init.comments.uploadRequireAuthDesc")} */
  //   requireAuth: true,
  //   /** ${$tr("init.comments.uploadAuthenticateDesc")} */
  //   authenticate: async (req) => ({ userId: "..." }),
  // },
  /** ${$tr("init.comments.metricsDesc")} */
  // metrics: true,
  /** ${$tr("init.comments.onRequestEndDesc")} */
  // onRequestEnd: ({ path, method, status, durationMs }) => {},
  /** ${$tr("init.comments.onSSREndDesc")} */
  // onSSREnd: ({ path, mode, engine, durationMs, ok }) => {},

  /** ${$tr("init.comments.databaseDesc")} */
  // database: {
  //   /** ${$tr("init.comments.databaseDefaultDesc")} */
  //   default: {
  //     /** ${$tr("init.comments.databaseAdapterDesc")} */
  //     adapter: "sqlite",
  //     /** ${$tr("init.comments.databaseConnectionDesc")} */
  //     connection: {
  //       /** ${$tr("init.comments.databaseFilenameDesc")} */
  //       filename: "./data.db",
  //     },
  //   },
  //   /** ${$tr("init.comments.databaseConnectionsDesc")} */
  //   // ${$tr("init.comments.databasePostgresHint")}
  //   // connections: { read: { ... }, mongodb: { ... } },
  //   /** ${$tr("init.comments.databaseManagerOptionsDesc")} */
  //   // managerOptions: {},
  // },

  // ========== ${$tr("init.comments.sectionSocket")} ==========
  /** ${$tr("init.comments.socketDesc")} */
  // socket: {
  //   /** ${$tr("init.comments.socketAdapterDesc")} */
  //   adapter: "socketio",
  //   /** ${$tr("init.comments.socketConfigDesc")} */
  //   config: {
  //     /** ${$tr("init.comments.socketPathDesc")} */
  //     path: "/socket.io/",
  //     /** ${$tr("init.comments.socketAllowCorsDesc")} */
  //     allowCORS: true,
  //     // ${$tr("init.comments.socketCorsAllowlistHint")}
  //     /** ${$tr("init.comments.socketCorsDesc")} */
  //     cors: {
  //       /** ${$tr("init.comments.corsOriginDesc")} */
  //       origin: ["https://app.example.com"],
  //     },
  //     /** ${$tr("init.comments.socketPingTimeoutDesc")} */
  //     pingTimeout: 20000,
  //     /** ${$tr("init.comments.socketPingIntervalDesc")} */
  //     pingInterval: 25000,
  //     /** ${$tr("init.comments.socketTransportsDesc")} */
  //     transports: ["websocket", "polling"],
  //     /** ${$tr("init.comments.socketAllowPollingDesc")} */
  //     allowPolling: true,
  //     /** ${$tr("init.comments.socketDebugDesc")} */
  //     debug: false,
  //   },
  // },
  // socket: {
  //   /** ${$tr("init.comments.socketAdapterDesc")} */
  //   adapter: "websocket",
  //   /** ${$tr("init.comments.socketConfigDesc")} */
  //   config: {
  //     /** ${$tr("init.comments.socketPathDesc")} */
  //     path: "/ws",
  //     /** ${$tr("init.comments.socketPingTimeoutDesc")} */
  //     pingTimeout: 60000,
  //     /** ${$tr("init.comments.socketPingIntervalDesc")} */
  //     pingInterval: 30000,
  //     /** ${$tr("init.comments.socketDebugDesc")} */
  //     debug: false,
  //   },
  // },

  // ========== ${$tr("init.comments.sectionSession")} ==========
  /** ${$tr("init.comments.sessionDesc")} */
  // session: {
  //   /** ${$tr("init.comments.sessionStoreDesc")} */
  //   store: createFileStore(await getDreamerDwebCacheDir(), "sessions"),
  //   /** ${$tr("init.comments.sessionNameDesc")} */
  //   name: "sid",
  //   /** ${$tr("init.comments.sessionMaxAgeDesc")} */
  //   maxAge: 86400,
  //   /** ${$tr("init.comments.sessionCookieDesc")} */
  //   cookie: {
  //     /** ${$tr("init.comments.sessionCookiePathDesc")} */
  //     path: "/",
  //     /** ${$tr("init.comments.sessionCookieHttpOnlyDesc")} */
  //     httpOnly: true,
  //     /** ${$tr("init.comments.sessionCookieSecureDesc")} */
  //     secure: false,
  //     /** ${$tr("init.comments.sessionCookieSameSiteDesc")} */
  //     sameSite: "lax",
  //   },
  //   /** ${$tr("init.comments.sessionAutoSaveDesc")} */
  //   autoSave: true,
  // },

  // ========== ${$tr("init.comments.sectionPlugins")} ==========
  /** ${$tr("init.comments.pluginsDesc")} */
  // plugins: [
  //   "./plugins/auth-plugin.ts",
  //   {
  //     name: "custom-plugin",
  //     version: "1.0.0",
  //     dependencies: [],
  //     config: {},
  //     async onInit(container) {},
  //     async onRequest(ctx, container) {},
  //   },
  // ],

  // ========== ${$tr("init.comments.sectionMiddlewares")} ==========
  /** ${$tr("init.comments.middlewaresDesc")} */
  // middlewares: [
  //   {
  //     middleware: async (_req, _res, next) => { await next(); },
  //     /** ${$tr("init.comments.middlewareNameDesc")} */
  //     name: "request-logger",
  //   },
  //   "./middlewares/cors.ts",
  //   {
  //     middleware: "./middlewares/auth.ts",
  //     /** ${$tr("init.comments.middlewareConditionDesc")} */
  //     condition: (req) => req.url.startsWith("/admin"),
  //     name: "admin-auth",
  //   },
  // ],
};

export default config;
`;
}

/**
 * 多应用时 common/config/main.ts：完整配置项均列出，供各应用继承与覆盖
 * name、version 在各应用 config/main.ts 中配置，不在此处
 */
export function getFullCommonConfigMainTs(opts: InitOptions): string {
  const language = getDefaultLanguage();
  return `/**
 * ${$tr("init.comments.commonConfig")}
 * ${$tr("init.comments.commonConfigDesc")}
 * ${$tr("init.comments.commonConfigDocRef")}
 * ${$tr("init.comments.commonConfigNameVersionHint")}
 */

/** ${$tr("init.comments.defaultExport")}${
    $tr("init.comments.defaultExportSuffix")
  } */
export default {
  /** ${$tr("init.comments.frameworkLanguageShort")} ${
    $tr("init.comments.frameworkLanguageSuffix")
  } */
  language: "${language}",
  /** ${$tr("init.comments.envPrefixDesc")} */
  // envPrefix: "APP_",
  /** ${$tr("init.comments.hotReloadDesc")} */
  hotReload: true,
  /** ${$tr("init.comments.pluginManagerOptionsDesc")} */
  // pluginManagerOptions: {
  //   /** ${$tr("init.comments.pluginAutoActivateDesc")} */
  //   autoActivate: false,
  //   /** ${$tr("init.comments.pluginContinueOnErrorDesc")} */
  //   continueOnError: true,
  //   /** ${$tr("init.comments.pluginEnableHotReloadDesc")} */
  //   enableHotReload: false,
  //   /** ${$tr("init.comments.pluginHotReloadIntervalDesc")} */
  //   hotReloadInterval: 1000,
  // },

  /** ${$tr("init.comments.serverDesc")} */
  server: {
    /** ${$tr("init.comments.serverHostDesc")} */
    host: "127.0.0.1",
    /** ${$tr("init.comments.commonConfigPortOverride")} */
    // /** ${$tr("init.comments.serverPortDesc")} */
    // port: 8000,
    /** ${$tr("init.comments.serverDevHmrDesc")} */
    // dev: {
    //   hmr: {
    //     /** ${$tr("init.comments.serverDevHmrEnabledDesc")} */
    //     enabled: true,
    //     /** ${$tr("init.comments.serverDevHmrPathDesc")} */
    //     path: "/__hmr",
    //   },
    //   /** ${$tr("init.comments.serverDevWatchDesc")} */
    //   watch: {
    //     /** ${$tr("init.comments.serverDevWatchPathsDesc")} */
    //     paths: ["./src"],
    //     /** ${$tr("init.comments.serverDevWatchIgnoreDesc")} */
    //     ignore: ["node_modules", ".git", "dist"],
    //   },
    // },
    /** ${$tr("init.comments.serverModeDesc")} */
    // mode: "dev",
    /** ${$tr("init.comments.serverOnListenDesc")} */
    // onListen: ({ host, port }) => { console.log(\`http://\${host}:\${port}\`); },
    /** ${$tr("init.comments.serverOnErrorDesc")} */
    // onError: (error) => { console.error(error); return new Response("Error", { status: 500 }); },
    /** ${$tr("init.comments.serverDebugDesc")} */
    // debug: false,
    /** ${$tr("init.comments.serverShutdownTimeoutDesc")} */
    // shutdownTimeout: 10000,
  },

  /** ${$tr("init.comments.routerDesc")} */
  router: {
    /** ${$tr("init.comments.commonConfigRoutesDirOverride")} */
    // /** ${$tr("init.comments.apiModeDesc")} */
    // apiMode: "action", // set per-app (web/api); default action
    /** ${$tr("init.comments.redirectsDesc")} */
    // redirects: [],
    /** ${$tr("init.comments.skipAppValidationDesc")} */
    // skipAppValidation: false,
  },

  /** ${$tr("init.comments.renderDesc")} */
  render: {
    /** ${$tr("init.comments.renderEngineDesc")} */
    engine: "${opts.engine}",
    /** ${$tr("init.comments.renderModeDesc")} */
    mode: "${opts.renderMode ?? "hybrid"}",
    /** ${$tr("init.comments.renderDebugDesc")} */
    // debug: false,
    /** ${$tr("init.comments.loadCacheDesc")} */
    // loadCache: false,
    // /** ${$tr("init.comments.ssrHydrate")} */
    // ssr: {
    //   /** ${$tr("init.comments.ssrHydrateOption")} */
    //   hydrate: true,
    //   /** ${$tr("init.comments.ssrStreamDesc")} */
    //   // stream: false,
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
    //   },
    //   /** ${$tr("init.comments.ssgHydrateOption")} */
    //   hydrate: true,
    //   /** ${$tr("init.comments.ssgPreloadHtmlDesc")} */
    //   // preloadHtml: true,
    // },
    /** ${$tr("init.comments.hydrationMismatchDesc")} */
    // hydration: { mismatchMode: "continue" },
  },

  /** ${$tr("init.comments.buildDesc")} */
  build: {
    /** ${$tr("init.comments.buildServerDesc")} */
    server: {
      /** ${$tr("init.comments.useNativeCompileDesc")} */
      useNativeCompile: false,${buildServerExternalBlock(opts)}
${commentedBuildServerOptionalFields()}
    },
${commentedBuildClientBlock(opts.engine)}
${commentedBuildAssetsBlock()}
${commentedBuildBuildBlock()}
${commentedBuildDevCacheBlock()}
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
${loggerFileBlock("runtime/logs/app.log")}
      },
    },
    /** ${$tr("init.comments.loggerColorDesc")} */
    // color: true,
    /** ${$tr("init.comments.loggerShowTimeDesc")} */
    // showTime: true,
    /** ${$tr("init.comments.loggerShowLevelDesc")} */
    // showLevel: true,
    /** ${$tr("init.comments.loggerTagsDesc")} */
    // tags: ["app"],
    /** ${$tr("init.comments.loggerFilterDesc")} */
    // filter: {
    //   includeTags: ["app", "http"],
    //   excludeTags: ["debug"],
    // },
    /** ${$tr("init.comments.loggerMaxMessageLengthDesc")} */
    // maxMessageLength: 32 * 1024,
  },

  // ${$tr("init.comments.commonProductionSecurityHint")}
  /** ${$tr("init.comments.securityHeadersDesc")} */
  // securityHeaders: true,
  /** ${$tr("init.comments.corsDesc")} */
  // cors: {
  //   /** ${$tr("init.comments.corsOriginDesc")} */
  //   origin: ["https://app.example.com"],
  //   /** ${$tr("init.comments.corsCredentialsDesc")} */
  //   credentials: true,
  // },
  /** ${$tr("init.comments.compressionDesc")} */
  // compression: false,
  // compression: {
  //   /** ${$tr("init.comments.compressionThresholdDesc")} */
  //   threshold: 1024,
  //   /** ${$tr("init.comments.compressionBrotliDesc")} */
  //   enableBrotli: true,
  // },
  /** ${$tr("init.comments.rateLimitDesc")} */
  // rateLimit: true,
  /** ${$tr("init.comments.csrfDesc")} */
  // csrf: true,
  /** ${$tr("init.comments.uploadDesc")} */
  // upload: {
  //   /** ${$tr("init.comments.uploadRequireAuthDesc")} */
  //   requireAuth: true,
  // },
  /** ${$tr("init.comments.metricsDesc")} */
  // metrics: true,
  /** ${$tr("init.comments.onRequestEndDesc")} */
  // onRequestEnd: ({ path, method, status, durationMs }) => {},
  /** ${$tr("init.comments.onSSREndDesc")} */
  // onSSREnd: ({ path, mode, durationMs, ok }) => {},

  /** ${$tr("init.comments.databaseDesc")} */
  // database: {
  //   /** ${$tr("init.comments.databaseDefaultDesc")} */
  //   default: {
  //     /** ${$tr("init.comments.databaseAdapterDesc")} */
  //     adapter: "sqlite",
  //     /** ${$tr("init.comments.databaseConnectionDesc")} */
  //     connection: {
  //       /** ${$tr("init.comments.databaseFilenameDesc")} */
  //       filename: "./data.db",
  //     },
  //   },
  //   /** ${$tr("init.comments.databaseConnectionsDesc")} */
  //   // connections: {},
  //   /** ${$tr("init.comments.databaseManagerOptionsDesc")} */
  //   // managerOptions: {},
  // },
  /** ${$tr("init.comments.socketDesc")} */
  // socket: {
  //   /** ${$tr("init.comments.socketAdapterDesc")} */
  //   adapter: "socketio",
  //   /** ${$tr("init.comments.socketConfigDesc")} */
  //   config: {
  //     /** ${$tr("init.comments.socketPathDesc")} */
  //     path: "/socket.io/",
  //     /** ${$tr("init.comments.socketAllowCorsDesc")} */
  //     allowCORS: true,
  //     /** ${$tr("init.comments.socketPingTimeoutDesc")} */
  //     pingTimeout: 20000,
  //     /** ${$tr("init.comments.socketPingIntervalDesc")} */
  //     pingInterval: 25000,
  //     /** ${$tr("init.comments.socketTransportsDesc")} */
  //     transports: ["websocket", "polling"],
  //     /** ${$tr("init.comments.socketDebugDesc")} */
  //     debug: false,
  //   },
  // },
  /** ${$tr("init.comments.sessionDesc")} */
  // session: {
  //   /** ${$tr("init.comments.sessionStoreDesc")} */
  //   store: createFileStore(await getDreamerDwebCacheDir(), "sessions"),
  //   /** ${$tr("init.comments.sessionNameDesc")} */
  //   name: "sid",
  //   /** ${$tr("init.comments.sessionMaxAgeDesc")} */
  //   maxAge: 86400,
  //   /** ${$tr("init.comments.sessionCookieDesc")} */
  //   cookie: {
  //     /** ${$tr("init.comments.sessionCookiePathDesc")} */
  //     path: "/",
  //     /** ${$tr("init.comments.sessionCookieHttpOnlyDesc")} */
  //     httpOnly: true,
  //     /** ${$tr("init.comments.sessionCookieSecureDesc")} */
  //     secure: false,
  //     /** ${$tr("init.comments.sessionCookieSameSiteDesc")} */
  //     sameSite: "lax",
  //   },
  //   /** ${$tr("init.comments.sessionAutoSaveDesc")} */
  //   autoSave: true,
  // },
  /** ${$tr("init.comments.pluginsDesc")} */
  // plugins: [],
  /** ${$tr("init.comments.middlewaresDesc")} */
  // middlewares: [],
};
`;
}
