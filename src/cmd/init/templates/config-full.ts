/**
 * 完整 AppConfig 模板：所有配置项均列出，未启用的以注释形式保留，便于用户查阅
 * 参考 docs/en-US/APP_CONFIG.md 与 AppConfig 类型
 */

import { DEFAULT_PORT_BASE } from "../constants.ts";
import { $tr, getBuildServerExternal, getDefaultLanguage } from "../helpers.ts";
import type { InitOptions } from "../types.ts";

/**
 * 单应用完整 config/main.ts：所有配置节均存在，不用的整块注释
 */
export function getFullSingleAppConfigMainTs(opts: InitOptions): string {
  const routesDir = opts.useSrc ? "./src/routes" : "./routes";
  const watchPaths = opts.useSrc ? ["./src"] : ["./"];
  const configName = opts.projectName;
  const serverPort = DEFAULT_PORT_BASE;
  const renderMode = opts.renderMode ?? "hybrid";
  const language = getDefaultLanguage();

  return `/**
 * ${$tr("init.comments.appConfigShort")}
 * ${$tr("init.comments.frameworkAutoLoads")}
 * ${$tr("init.comments.configFullDocRef")}
 */
import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  // ========== Basic ==========
  name: "${configName}",
  version: "1.0.0",
  /** ${$tr("init.comments.frameworkLanguage")} ${
    $tr("init.comments.frameworkLanguageSuffix")
  } */
  language: "${language}",

  // envPrefix: "APP_",
  hotReload: true,

  // ========== Plugin manager (optional) ==========
  // pluginManagerOptions: {
  //   autoActivate: false,
  //   continueOnError: true,
  //   enableHotReload: false,
  //   hotReloadInterval: 1000,
  // },

  // ========== Server ==========
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
    // mode: "dev",
    // onListen: ({ host, port }) => { console.log(\`http://\${host}:\${port}\`); },
    // onError: (error) => { console.error(error); return new Response("Error", { status: 500 }); },
    // debug: false,
    // shutdownTimeout: 10000,
  },

  // ========== Router ==========
  router: {
    routesDir: "${routesDir}",
    // apiMode: "restful",
    // redirects: [
    //   {
    //     source: "/old",
    //     destination: "/new",
    //     permanent: true,
    //   },
    // ],
    // skipAppValidation: false,
  },

  // ========== Render ==========
  // ${$tr("init.comments.renderFullDocFull")}
  render: {
    engine: "${opts.engine}",
    mode: "${renderMode}",
    // debug: false,
    // ssr: {
    //   hydrate: true,
    // },
    // ssg: {
    //   outputDir: "dist/static",
    //   routes: ["/", "/about"],
    //   /** ${$tr("init.comments.dynamicRoutesSupport")} */
    //   dynamicRoutes: {
    //     "/user/[id]": ["1", "2", "3"],
    //   }, // ${$tr("init.comments.dynamicRoutesExample")}
    //   hydrate: true,
    // },
  },

  // ========== Build ==========
  build: {
    server: {
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
      // entry: "src/main.ts",
      // output: "dist",
      // target: "deno",
      // compile: {
      //   minify: true,
      //   sourcemap: true,
      //   platform: ["linux", "darwin", "windows"],
      // },
      // external: ["tailwindcss", "lightningcss"],
      // externalNpm: true,
      // excludePaths: ["node_modules", ".bun/install"],
      // debug: false,
    },
    // client: {
    //   entry: "...",
    //   output: "dist/client",
    //   engine: "${opts.engine}",
    //   bundle: {},
    //   html: {},
    //   sourcemap: true,
    //   debug: false,
    // },
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
    // color: true,
    // showTime: true,
    // showLevel: true,
    // tags: ["app"],
    // filter: {
    //   includeTags: ["app", "http"],
    //   excludeTags: ["debug"],
    // },
    // maxMessageLength: 32 * 1024,
  },

  // ========== Database (optional; uncomment and configure to use) ==========
  // database: {
  //   default: {
  //     adapter: "sqlite",
  //     connection: {
  //       filename: "./data.db",
  //     },
  //   },
  //   // or postgresql: connection: { host, port, database, username, password }
  //   // connections: { read: { ... }, mongodb: { ... } },
  //   // managerOptions: {},
  // },

  // ========== Socket / WebSocket (optional) ==========
  // socket: {
  //   adapter: "socketio",
  //   config: {
  //     path: "/socket.io/",
  //     allowCORS: true,
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
  // session: {
  //   store: createFileStore(await getDreamerDwebCacheDir(), "sessions"),
  //   name: "sid",
  //   maxAge: 86400,
  //   cookie: {
  //     path: "/",
  //     httpOnly: true,
  //     secure: false,
  //     sameSite: "lax",
  //   },
  //   autoSave: true,
  // },

  // ========== Plugins (optional) ==========
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
  // middlewares: [
  //   {
  //     middleware: async (_req, _res, next) => { await next(); },
  //     name: "request-logger",
  //   },
  //   "./middlewares/cors.ts",
  //   {
  //     middleware: "./middlewares/auth.ts",
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

  // envPrefix: "APP_",
  hotReload: true,

  // pluginManagerOptions: {
  //   autoActivate: false,
  //   continueOnError: true,
  //   enableHotReload: false,
  //   hotReloadInterval: 1000,
  // },

  server: {
    host: "127.0.0.1",
    // ${$tr("init.comments.commonConfigPortOverride")}
    // dev: {
    //   hmr: {
    //     enabled: true,
    //     path: "/__hmr",
    //   },
    //   watch: {
    //     paths: ["./src"],
    //     ignore: ["node_modules", ".git", "dist"],
    //   },
    // },
    // mode: "dev", onListen, onError, debug, shutdownTimeout
  },

  router: {
    // ${$tr("init.comments.commonConfigRoutesDirOverride")}
    // apiMode: "restful",
    // redirects: [],
    // skipAppValidation: false,
  },

  render: {
    engine: "${opts.engine}",
    mode: "${opts.renderMode ?? "hybrid"}",
    // debug: false,
    // ssr: {
    //   hydrate: true,
    // },
    // ssg: {
    //   outputDir: "dist/static",
    //   routes: ["/", "/about"],
    //   /** ${$tr("init.comments.dynamicRoutesSupport")} */
    //   dynamicRoutes: {
    //     "/user/[id]": ["1", "2", "3"],
    //   }, // ${$tr("init.comments.dynamicRoutesExample")}
    //   hydrate: true,
    // },
  },

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

  // database: {
  //   default: {
  //     adapter: "sqlite",
  //     connection: {
  //       filename: "./data.db",
  //     },
  //   },
  //   connections: {},
  //   managerOptions: {},
  // },
  // socket: {
  //   adapter: "socketio" | "websocket",
  //   config: {},
  // },
  // session: {
  //   store,
  //   name,
  //   maxAge,
  //   cookie,
  //   autoSave,
  //   genId,
  // },
  // plugins: [],
  // middlewares: [],
};
`;
}
