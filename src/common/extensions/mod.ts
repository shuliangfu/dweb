/**
 * 扩展系统模块
 * 提供框架扩展功能的统一入口，允许为内置类型添加自定义方法
 *
 * 此模块提供以下功能：
 *
 * **扩展注册和管理**
 * - 注册自定义扩展方法
 * - 启用/禁用扩展
 * - 查询已注册的扩展
 *
 * **内置扩展**
 * - `StringExtensions` - 字符串扩展方法
 * - `ArrayExtensions` - 数组扩展方法
 * - `DateExtensions` - 日期扩展方法
 * - `ObjectExtensions` - 对象扩展方法
 * - `RequestExtensions` - 请求扩展方法
 *
 * **扩展初始化**
 * - `initExtensions()` - 初始化所有内置扩展
 * - `setupExtensions()` - 初始化内置扩展和用户扩展
 *
 * @example
 * ```typescript
 * import { setupExtensions, registerExtension } from "@dreamer/dweb/extensions";
 *
 * // 初始化所有内置扩展
 * setupExtensions();
 *
 * // 注册自定义扩展
 * registerExtension({
 *   target: "String",
 *   name: "toSlug",
 *   implementation: function() {
 *     return this.toLowerCase().replace(/\s+/g, "-");
 *   },
 * });
 *
 * // 使用扩展方法
 * const slug = "Hello World".toSlug(); // "hello-world"
 * ```
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
