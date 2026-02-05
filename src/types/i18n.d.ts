/**
 * dweb 框架 i18n 全局类型声明
 *
 * 使用 initDwebI18n() 初始化后，i18n.install() 会将 $t 挂载到 globalThis。
 * 通过 deno.json compilerOptions.types 引入，各模块可直接使用 $t("key") 而无需导入。
 *
 * @example
 * ```ts
 * // 无需 import { $t }
 * $t("cli.usage");
 * $t("log.buildComplete", { duration: "100" });
 * ```
 */
declare global {
  /**
   * 全局翻译函数
   * 由 initDwebI18n() -> i18n.install() 挂载到 globalThis
   */
  function $t(
    key: string,
    params?: Record<string, string | number | boolean>,
  ): string;
}

export {};
