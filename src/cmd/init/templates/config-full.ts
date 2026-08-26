/**
 * 完整 AppConfig 模板：所有配置项均列出，未启用的以注释形式保留，便于用户查阅
 * 参考 docs/en-US/APP_CONFIG.md 与 AppConfig 类型
 */

import { DEFAULT_PORT_BASE } from "../constants.ts";
import {
  $tr,
  getAppKind,
  getBuildServerExternal,
  getDefaultLanguage,
} from "../helpers.ts";
import type { AppKind, InitOptions } from "../types.ts";

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

  if (kind === "console") {
    return `/**
 * ${$tr("init.comments.appConfigShort")}
 * ${$tr("init.comments.frameworkAutoLoads")}
 * ${$tr("init.comments.consoleConfigHint")}
 */
import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  name: "${configName}",
  kind: "console",
  version: "1.0.0",
  language: "${language}",
  router: {
    routesDir: "${routesDir}",
  },
  logger: {
    level: "info",
    format: "text",
    output: {
      console: "auto",
      file: {
        path: "runtime/logs/app.log",
        rotate: true,
        strategy: "size",
        maxSize: 10 * 1024 * 1024,
        maxFiles: 5,
      },
    },
  },
};

export default config;
`;
  }

  if (kind === "api") {
    return `/**
 * ${$tr("init.comments.appConfigShort")}
 * ${$tr("init.comments.frameworkAutoLoads")}
 * ${$tr("init.comments.apiConfigHint")}
 * Production: enable securityHeaders / cors allowlist / rateLimit — see docs PRODUCTION_CHECKLIST
 */
import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  name: "${configName}",
  kind: "api",
  version: "1.0.0",
  language: "${language}",
  hotReload: true,
  // ${
      $tr("init.comments.configHostPortInDevProd", {
        serverPort: String(serverPort),
      })
    }
  server: {
    dev: {
      hmr: {
        enabled: true,
        path: "/__hmr",
      },
      watch: {
        paths: ${JSON.stringify(watchPaths)},
        ignore: ["node_modules", ".git", "dist"],
      },
    },
  },
  router: {
    routesDir: "${routesDir}",
  },
  logger: {
    level: "info",
    format: "text",
    output: {
      console: "auto",
      file: {
        path: "runtime/logs/app.log",
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
  // Opt-in security (recommended in production):
  // securityHeaders: true,
  // cors: { origin: ["https://app.example.com"], credentials: true }, // not cors: true (* )
  // rateLimit: { windowMs: 60_000, max: 120 },
  // compression is on by default outside RUNTIME_ENV=dev
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
  // ========== Basic ==========
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

  // ========== Plugin manager (optional) ==========
  /** ${$tr("init.comments.pluginManagerOptionsDesc")} */
  // pluginManagerOptions: {
  //   autoActivate: false,
  //   continueOnError: true,
  //   enableHotReload: false,
  //   hotReloadInterval: 1000,
  // },

  // ========== Server ==========
  /** ${$tr("init.comments.serverDesc")} */
  // ${
    $tr("init.comments.configHostPortInDevProd", {
      serverPort: String(serverPort),
    })
  }
  server: {
    dev: {
      /** ${$tr("init.comments.serverDevHmrDesc")} */
      hmr: {
        enabled: true,
        path: "/__hmr",
      },
      /** ${$tr("init.comments.serverDevWatchDesc")} */
      watch: {
        paths: ${JSON.stringify(watchPaths)},
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

  // ========== Router ==========
  /** ${$tr("init.comments.routerDesc")} */
  router: {
    /** ${$tr("init.comments.routesDirDesc")} */
    routesDir: "${routesDir}",
    /** ${$tr("init.comments.apiModeDesc")} */
    // apiMode: "restful",
    /** ${$tr("init.comments.redirectsDesc")} */
    // redirects: [
    //   {
    //     source: "/old",
    //     destination: "/new",
    //     permanent: true,
    //   },
    // ],
    /** ${$tr("init.comments.skipAppValidationDesc")} */
    // skipAppValidation: false,
  },

  // ========== Render ==========
  /** ${$tr("init.comments.renderDesc")} */
  // ${$tr("init.comments.renderFullDocFull")}
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

  // ========== Build ==========
  /** ${$tr("init.comments.buildDesc")} */
  build: {
    /** ${$tr("init.comments.buildServerDesc")} */
    server: {
      /** ${$tr("init.comments.useNativeCompileDesc")} */
      useNativeCompile: false,${
    (() => {
      const ext = getBuildServerExternal(opts);
      if (!ext?.length) return "";
      const lines = ext.map((e) => `        "${e}"`).join(",\n");
      return `
      // ${$tr("init.comments.buildServerExternalBun")}
      external: [
${lines}
      ],`;
    })()
  }
      /** ${$tr("init.comments.buildServerEntryDesc")} */
      // entry: "src/main.ts",
      /** ${$tr("init.comments.buildServerOutputDesc")} */
      // output: "dist",
      /** ${$tr("init.comments.buildServerTargetDesc")} */
      // target: "deno",
      /** ${$tr("init.comments.buildServerCompileDesc")} */
      // compile: {
      //   minify: true,
      //   sourcemap: true,
      //   platform: ["linux", "darwin", "windows"],
      // },
      /** ${$tr("init.comments.buildServerExternalDesc")} */
      // external: ["tailwindcss", "lightningcss"],
      /** ${$tr("init.comments.buildServerExternalNpmDesc")} */
      // externalNpm: true,
      /** ${$tr("init.comments.buildServerExcludePathsDesc")} */
      // excludePaths: ["node_modules", ".bun/install"],
      /** ${$tr("init.comments.buildServerDebugDesc")} */
      // debug: false,
    },
    /** ${$tr("init.comments.buildClientDesc")} */
    // client: {
    //   entry: "...",
    //   output: "dist/client",
    //   engine: "${opts.engine}",
    //   bundle: {},
    //   html: {},
    //   sourcemap: true,
    //   debug: false,
    // },
    /** ${$tr("init.comments.buildAssetsDesc")} */
    // assets: {
    //   css: {
    //     extract: true,
    //     minify: true,
    //     autoprefix: true,
    //   },
    //   images: {},
    //   publicDir: "public",
    //   assetsDir: "assets",
    // },
    /** ${$tr("init.comments.buildBuildDesc")} */
    // build: {
    //   mode: "prod",
    //   clean: true,
    //   cache: true,
    //   incremental: true,
    //   silent: false,
    //   logLevel: "info",
    // },
  },

  // ========== Logger ==========
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
        path: "runtime/logs/app.log",
        rotate: true,
        strategy: "size",
        maxSize: 10 * 1024 * 1024,
        maxFiles: 5,
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

  // ========== Production security / transport (opt-in; see docs PRODUCTION_CHECKLIST) ==========
  /** Security response headers (default off). true or { contentSecurityPolicy, frameOptions, ... } */
  // securityHeaders: true,
  // securityHeaders: { enabled: true, contentSecurityPolicy: "default-src 'self'" },
  /**
   * CORS via @dreamer/middlewares (default off).
   * Prefer an origin allowlist in production — \`cors: true\` means origin "*".
   * When socket (socketio) has no cors, this origin is bridged to Socket.IO.
   */
  // cors: { origin: ["https://app.example.com"], credentials: true },
  // cors: true, // open "*"; ok for quick demos, not for credentialed prod APIs
  /** Response compression gzip/br (on by default outside RUNTIME_ENV=dev; false to disable) */
  // compression: false,
  // compression: { threshold: 1024, enableBrotli: true },
  /** Simple in-memory rate limit (default off). Do not trust X-Forwarded-For unless the proxy strips client spoofing. */
  // rateLimit: true,
  // rateLimit: { windowMs: 60_000, max: 120 },

  // ========== Database (optional; uncomment and configure to use) ==========
  /** ${$tr("init.comments.databaseDesc")} */
  // database: {
  //   /** ${$tr("init.comments.databaseDefaultDesc")} */
  //   default: {
  //     adapter: "sqlite",
  //     connection: {
  //       filename: "./data.db",
  //     },
  //   },
  //   /** ${$tr("init.comments.databaseConnectionsDesc")} */
  //   // or postgresql: connection: { host, port, database, username, password }
  //   // connections: { read: { ... }, mongodb: { ... } },
  //   /** ${$tr("init.comments.databaseManagerOptionsDesc")} */
  //   // managerOptions: {},
  // },

  // ========== Socket / WebSocket (optional) ==========
  /** ${$tr("init.comments.socketDesc")} */
  // socket: {
  //   /** ${$tr("init.comments.socketAdapterDesc")} */
  //   adapter: "socketio",
  //   /** ${$tr("init.comments.socketConfigDesc")} */
  //   config: {
  //     path: "/socket.io/",
  //     allowCORS: true,
  //     // Prefer an allowlist for cross-origin sockets (or set AppConfig.cors.origin to bridge)
  //     cors: { origin: ["https://app.example.com"] },
  //     pingTimeout: 20000,
  //     pingInterval: 25000,
  //     transports: ["websocket", "polling"],
  //     allowPolling: true,
  //     debug: false,
  //   },
  // },
  // socket: {
  //   adapter: "websocket",
  //   config: {
  //     path: "/ws",
  //     pingTimeout: 60000,
  //     pingInterval: 30000,
  //     debug: false,
  //   },
  // },

  // ========== Session (optional; @dreamer/session; requires store, e.g. createFileStore) ==========
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
  //     path: "/",
  //     httpOnly: true,
  //     secure: false,
  //     sameSite: "lax",
  //   },
  //   /** ${$tr("init.comments.sessionAutoSaveDesc")} */
  //   autoSave: true,
  // },

  // ========== Plugins (optional) ==========
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

  // ========== Middlewares (optional) ==========
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
  //   autoActivate: false,
  //   continueOnError: true,
  //   enableHotReload: false,
  //   hotReloadInterval: 1000,
  // },

  /** ${$tr("init.comments.serverDesc")} */
  server: {
    host: "127.0.0.1",
    /** ${$tr("init.comments.commonConfigPortOverride")} */
    // dev: {
    //   hmr: { enabled: true, path: "/__hmr" },
    //   watch: { paths: ["./src"], ignore: ["node_modules", ".git", "dist"] },
    // },
    // mode: "dev", onListen, onError, debug, shutdownTimeout
  },

  /** ${$tr("init.comments.routerDesc")} */
  router: {
    /** ${$tr("init.comments.commonConfigRoutesDirOverride")} */
    // apiMode: "restful",
    // redirects: [],
    // skipAppValidation: false,
  },

  /** ${$tr("init.comments.renderDesc")} */
  render: {
    /** ${$tr("init.comments.renderEngineDesc")} */
    engine: "${opts.engine}",
    /** ${$tr("init.comments.renderModeDesc")} */
    mode: "${opts.renderMode ?? "hybrid"}",
    // debug: false,
    // ssr: { hydrate: true },
    // ssg: { outputDir: "dist/static", routes: ["/", "/about"], dynamicRoutes: { "/user/[id]": ["1", "2", "3"] }, hydrate: true },
  },

  /** ${$tr("init.comments.buildDesc")} */
  build: {
    server: { useNativeCompile: false${
    (() => {
      const ext = getBuildServerExternal(opts);
      if (!ext?.length) return "";
      const lines = ext.map((e) => `      "${e}"`).join(",\n");
      return `,
    // ${$tr("init.comments.buildServerExternalBun")}
    external: [
${lines}
    ]`;
    })()
  } },
    // client: {}, assets: {}, build: {}
  },

  /** ${$tr("init.comments.loggerDesc")} */
  logger: {
    level: "info",
    format: "text",
    output: {
      console: "auto",
      file: {
        path: "runtime/logs/app.log",
        rotate: true,
        strategy: "size",
        maxSize: 10 * 1024 * 1024,
        maxFiles: 5,
      },
    },
    // color, showTime, showLevel, tags, filter, maxMessageLength
  },

  // Production: securityHeaders/cors/rateLimit still opt-in; compression defaults on outside dev
  // Prefer cors allowlist (cors: true ⇒ origin "*"). See PRODUCTION_CHECKLIST.
  // securityHeaders: true,
  // cors: { origin: ["https://app.example.com"], credentials: true },
  // compression: false, // or { threshold: 1024, enableBrotli: true }
  // rateLimit: true,

  /** ${$tr("init.comments.databaseDesc")} */
  // database: { default: { adapter: "sqlite", connection: { filename: "./data.db" } }, connections: {}, managerOptions: {} },
  /** ${$tr("init.comments.socketDesc")} */
  // socket: { adapter: "socketio" | "websocket", config: {} },
  /** ${$tr("init.comments.sessionDesc")} */
  // session: { store, name, maxAge, cookie, autoSave, genId },
  /** ${$tr("init.comments.pluginsDesc")} */
  // plugins: [],
  /** ${$tr("init.comments.middlewaresDesc")} */
  // middlewares: [],
};
`;
}
