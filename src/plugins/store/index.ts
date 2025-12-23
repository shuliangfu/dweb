/**
 * 状态管理插件
 * 提供跨组件的响应式状态管理功能
 */

import type { Plugin, Request, Response } from "../../types/index.ts";
import type { Store, StorePluginOptions } from "./types.ts";
import { minifyJavaScript } from "../../utils/minify.ts";
import { compileWithEsbuild } from "../../utils/module.ts";
import * as path from "@std/path";
import { getAllStoreInitialStates } from "./define-store.ts";

/**
 * 创建 Store 实例（服务端）
 */
function createServerStore<T = Record<string, unknown>>(
  initialState: T,
): Store<T> {
  let state: T = { ...initialState };
  const listeners = new Set<(state: T) => void>();

  return {
    getState: () => state,
    setState: (updater) => {
      const prevState = state;
      const nextState = typeof updater === "function"
        ? { ...prevState, ...updater(prevState) }
        : { ...prevState, ...updater };

      state = nextState;

      // 通知所有监听者
      listeners.forEach((listener) => {
        try {
          listener(state);
        } catch (error) {
          console.error("[Store Plugin] 监听器执行错误:", error);
        }
      });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      // 立即调用一次，传递当前状态
      try {
        listener(state);
      } catch (error) {
        console.error("[Store Plugin] 监听器执行错误:", error);
      }
      // 返回取消订阅函数
      return () => {
        listeners.delete(listener);
      };
    },
    unsubscribe: (listener) => {
      listeners.delete(listener);
    },
    reset: () => {
      state = { ...initialState };
      listeners.forEach((listener) => {
        try {
          listener(state);
        } catch (error) {
          console.error("[Store Plugin] 监听器执行错误:", error);
        }
      });
    },
  };
}

// 缓存编译后的客户端脚本
let cachedClientScript: string | null = null;

/**
 * 编译客户端 Store 脚本
 */
async function compileClientScript(): Promise<string> {
  if (cachedClientScript) {
    return cachedClientScript;
  }

  try {
    // 读取浏览器端脚本文件
    const browserScriptPath = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      "browser.ts",
    );
    const browserScriptContent = await Deno.readTextFile(browserScriptPath);

    // 使用 esbuild 编译 TypeScript 为 JavaScript
    const compiledCode = await compileWithEsbuild(
      browserScriptContent,
      browserScriptPath,
		);
		
    // 压缩代码
    const minifiedCode = await minifyJavaScript(compiledCode);
		cachedClientScript = minifiedCode;
		
    return minifiedCode;
  } catch (error) {
    console.error("[Store Plugin] 编译客户端脚本失败:", error);
    // 如果编译失败，返回空字符串
    return "";
  }
}

/**
 * 生成 Store 初始化脚本（包含配置）
 */
function generateInitScript(config: {
  persist: boolean;
  storageKey: string;
  initialState: Record<string, unknown>;
  serverState?: Record<string, unknown>;
}): string {
  return `initStore(${JSON.stringify({
    persist: config.persist,
    storageKey: config.storageKey,
    initialState: config.initialState,
    serverState: config.serverState,
  })});`;
}

/**
 * 创建状态管理插件
 */
export function store(options: StorePluginOptions = {}): Plugin {
  const config = options;
  const persist = config.persist !== false;
  const storageKey = config.storageKey || "dweb-store";
  const enableServer = config.enableServer !== false;
  
  // 如果用户提供了 initialState，使用用户的；否则自动从注册表收集
  const initialState = config.initialState || getAllStoreInitialStates();

  // 服务端 Store 实例（每个请求独立）
  const serverStores = new WeakMap<Request, Store>();

  return {
    name: "store",
    config: options as unknown as Record<string, unknown>,

    /**
     * 初始化钩子
     */
    onInit: async (app) => {
      // 在应用实例上添加 getStore 方法
      (app as any).getStore = () => {
        if (typeof globalThis !== "undefined" && globalThis.window) {
          // 客户端：返回全局 Store
          return (globalThis.window as any).__STORE__;
        }
        return null;
      };

      // 自动导入 stores/index.ts（如果存在）
      // 这样用户就不需要在 main.ts 中手动导入了
      try {
        const cwd = Deno.cwd();
        const storesPath = path.resolve(cwd, "stores", "index.ts");
        
        // 检查文件是否存在
        try {
          await Deno.stat(storesPath);
          // 文件存在，尝试导入（触发 defineStore 注册）
          // 使用 file:// URL 格式导入
          const fileUrl = `file://${storesPath}`;
          await import(fileUrl);
        } catch (_statError) {
          // 文件不存在，忽略（这是正常的，用户可能没有使用 stores）
          // 不输出错误，因为这是预期的行为
        }
      } catch (error) {
        // 导入失败，忽略（可能是路径问题或其他原因）
        // 不影响插件正常工作
        // 只在开发环境输出警告
        if (!(app as any).isProduction) {
          console.debug("[Store Plugin] 自动导入 stores/index.ts 失败（这是正常的，如果项目没有使用 stores）:", error);
        }
      }
    },

    /**
     * 请求处理钩子 - 为每个请求创建独立的 Store 实例（服务端）
     */
    onRequest: (req: Request) => {
      if (enableServer) {
        const serverStore = createServerStore(initialState);
        serverStores.set(req, serverStore);
        // 在请求对象上添加 getStore 方法
        (req as any).getStore = () => serverStore;
      }
    },

    /**
     * 响应处理钩子 - 注入客户端 Store 脚本
     * 将服务端 Store 的状态注入到客户端 Store 中
     */
    onResponse: async (req: Request, res: Response) => {
      // 只处理 HTML 响应
      if (!res.body || typeof res.body !== "string") {
        return;
      }

      const contentType = res.headers.get("Content-Type") || "";
      if (!contentType.includes("text/html")) {
        return;
      }

      try {
        const html = res.body as string;

        // 获取服务端 Store 的状态（如果存在）
        let serverState: Record<string, unknown> | undefined;
        if (enableServer) {
          const serverStore = serverStores.get(req);
          if (serverStore) {
            serverState = serverStore.getState() as Record<string, unknown>;
          }
        }

        // 注入 Store 脚本（在 </head> 之前）
        if (html.includes("</head>")) {
          // 编译客户端脚本
          const clientScript = await compileClientScript();
          if (!clientScript) {
            console.warn("[Store Plugin] 客户端脚本编译失败，跳过注入");
            return;
          }

          // 生成初始化脚本
          const initScript = generateInitScript({
            persist,
            storageKey,
            initialState,
            serverState,
          });

          // 组合完整的脚本
          const fullScript = `${clientScript}\n${initScript}`;
					const scriptTag = `<script data-type="dweb-store">${fullScript}</script>`;
					
          // 使用 lastIndexOf 确保在最后一个 </head> 之前注入
					const lastHeadIndex = html.lastIndexOf("</head>");

          if (lastHeadIndex !== -1) {
            const newHtml =
              html.substring(0, lastHeadIndex) +
              `${scriptTag}\n` +
              html.substring(lastHeadIndex);
            res.body = newHtml;
          }
        }
      } catch (error) {
        console.error("[Store Plugin] 注入 Store 脚本时出错:", error);
      }
    },
  };
}

// 导出类型
export type { Store, StorePluginOptions } from "./types.ts";

// 导出 defineStore API
export { defineStore, getStoreInitialState, getAllStoreInitialStates, clearStoreRegistry } from "./define-store.ts";
export type { StoreInstance, StoreOptions } from "./define-store.ts";
