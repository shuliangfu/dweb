/**
 * 通用常量定义
 * 包含运行时环境判断等基础常量
 */

/**
 * 是否为服务端运行时 (Deno)
 * 使用 typeof Deno 进行安全判断，兼容浏览器环境
 */
export const IS_SERVER = typeof Deno !== "undefined";

/**
 * 是否为客户端运行时 (Browser)
 */
export const IS_CLIENT = !IS_SERVER;

/**
 * 是否为开发环境
 * 在服务端通过环境变量判断
 * 在客户端默认为 false (通常需要构建工具注入)
 */
export const IS_DEV = IS_SERVER
  ? Deno.env.get("DENO_ENV") === "development"
  : false;
