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

// 导出辅助函数
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
