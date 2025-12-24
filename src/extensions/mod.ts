/**
 * 扩展系统统一导出
 * 提供框架扩展功能的统一入口
 */

// 导出类型定义
export type {
  ArrayExtensions,
  DateExtensions,
  Extension,
  ExtensionRegistry,
  ExtensionTarget,
  ExtensionType,
  ObjectExtensions,
  StringExtensions,
} from "./types.ts";

// 导出注册器
export {
  disableExtension,
  enableExtension,
  extensionRegistry,
  ExtensionRegistryImpl,
  getExtension,
  hasExtension,
  registerExtension,
  removeExtension,
} from "./registry.ts";

// 导入并导出内置扩展初始化函数
import { initStringExtensions } from "./builtin/string.ts";
import { initArrayExtensions } from "./builtin/array.ts";
import { initDateExtensions } from "./builtin/date.ts";
import { initObjectExtensions } from "./builtin/object.ts";
import { initRequestExtensions } from "./builtin/request.ts";

export {
  initArrayExtensions,
  initDateExtensions,
  initObjectExtensions,
  initRequestExtensions,
  initStringExtensions,
};

// 导出辅助函数（直接导出，支持从主入口导入）
// 注意：对于有冲突的函数，已在源文件中重命名（如 utils.getValue, file.saveFile）
export * from "./helpers/validation.ts";
export * from "./helpers/format.ts";
export * from "./helpers/crypto.ts";
export * from "./helpers/cache.ts";
export * from "./helpers/http.ts";
export * from "./helpers/web3.ts";
export * from "./helpers/utils.ts";
export * from "./helpers/storage.ts";
export * from "./helpers/url.ts";
export * from "./helpers/time.ts";
export * from "./helpers/array.ts";
export * from "./helpers/math.ts";
export * from "./helpers/file.ts";

// 同时提供命名空间导出（可选，用于避免命名冲突或按模块组织代码）
// 注意：cache 命名空间重命名为 cacheHelpers，避免与 plugins 的 cache 插件冲突
export * as validation from "./helpers/validation.ts";
export * as format from "./helpers/format.ts";
export * as crypto from "./helpers/crypto.ts";
export * as cacheHelpers from "./helpers/cache.ts";
export * as http from "./helpers/http.ts";
export * as web3 from "./helpers/web3.ts";
export * as utils from "./helpers/utils.ts";
export * as storage from "./helpers/storage.ts";
export * as url from "./helpers/url.ts";
export * as time from "./helpers/time.ts";
export * as array from "./helpers/array.ts";
export * as math from "./helpers/math.ts";
export * as file from "./helpers/file.ts";

// 导出用户扩展示例（可选）
export * from "./user/index.ts";

/**
 * 初始化所有内置扩展
 * 调用此函数来注册所有内置扩展方法
 */
export function initExtensions(): void {
  initStringExtensions();
  initArrayExtensions();
  initDateExtensions();
  initObjectExtensions();
  initRequestExtensions();
}

/**
 * 初始化扩展系统（推荐）
 * 初始化所有内置扩展，并可选地初始化用户扩展
 * @param initUserExtensions 是否初始化用户扩展（默认false）
 */
export function setupExtensions(initUserExtensions: boolean = false): void {
  // 初始化内置扩展
  initExtensions();

  // 可选：初始化用户扩展
  if (initUserExtensions) {
    // 动态导入用户扩展（如果存在）
    import("./user/index.ts")
      .then((module) => {
        if (module.initUserExtensions) {
          module.initUserExtensions();
        }
      })
      .catch(() => {
        // 用户扩展不存在，忽略错误
      });
  }
}
