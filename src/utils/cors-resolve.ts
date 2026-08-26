/**
 * CORS / Socket.IO Origin 解析（装配层，不静默强制开启 CORS）
 *
 * @module
 */

import type { CorsOptions } from "@dreamer/middlewares";
import type { AppConfig } from "../types/app.ts";

/** Socket.IO 侧 cors 片段（与 @dreamer/socket-io ServerOptions.cors 对齐） */
export interface SocketIoCorsOptions {
  origin?: string | string[] | ((origin: string) => boolean);
  methods?: string[];
  credentials?: boolean;
}

/**
 * 将 AppConfig.cors 解析为 middlewares CorsOptions。
 * `true` → 空对象（库默认 origin `*`）；对象原样透传。
 */
export function resolveHttpCorsOptions(
  cors: AppConfig["cors"],
): CorsOptions | undefined {
  if (!cors) return undefined;
  return cors === true ? {} : cors;
}

/**
 * 非 dev 且 `cors: true` 时是否应打警告（开放 `*`）。
 */
export function shouldWarnOpenCors(
  cors: AppConfig["cors"],
  isRuntimeDev: boolean,
): boolean {
  return cors === true && !isRuntimeDev;
}

/**
 * 解析挂载 Socket.IO 时的 cors 配置。
 *
 * 优先级：socket 自身 `cors` → AppConfig.cors 对象的 origin → 开放 `origin: "*"`
 * （由 socket-io 解释为不反射、无 credentials；勿在此反射任意 Origin）。
 *
 * @param appCors AppConfig.cors
 * @param socketCors socket 配置上已有的 cors（若有）
 * @param allowCORS socket.allowCORS；false 时不注入
 */
export function resolveSocketIoCorsOptions(
  appCors: AppConfig["cors"],
  socketCors: SocketIoCorsOptions | undefined,
  allowCORS: boolean | undefined,
): SocketIoCorsOptions | undefined {
  if (allowCORS === false) {
    return socketCors;
  }
  if (socketCors != null) {
    return socketCors;
  }
  if (
    typeof appCors === "object" && appCors !== null && appCors.origin != null
  ) {
    return {
      origin: appCors.origin,
      methods: appCors.methods,
      credentials: appCors.credentials,
    };
  }
  // 显式开放模式，避免旧版「无 cors ⇒ 反射 Origin + credentials」语义依赖
  return { origin: "*" };
}
