/**
 * i18n 全局类型声明
 * 使 $t() 函数可以在全局作用域中直接使用，无需导入
 * 
 * 使用方法：
 * 1. 将此文件复制到项目根目录
 * 2. 或者在项目的 TypeScript 配置中引用此文件
 * 3. 或者在需要使用 $t() 的文件顶部添加：/// <reference path="./i18n-global.d.ts" />
 * 
 * 注意：由于 JSR 不允许在发布的包中修改全局类型，此文件位于 example 目录
 * 用户需要在项目中手动引用此文件或创建类似的文件
 */

/**
 * 翻译函数类型
 */
type TranslationFunction = (
  key: string,
  params?: Record<string, string>,
) => string;

/**
 * 扩展 globalThis 类型以包含 $t 函数
 * 这个函数始终可用：如果 i18n 插件未初始化，会返回 key 本身
 */
declare global {
  /**
   * 全局翻译函数 $t
   * 可以在任何地方直接使用，无需导入
   * 如果 i18n 插件未初始化，会返回 key 本身（不会报错）
   *
   * @example
   * const message = $t('common.welcome');
   * const messageWithParams = $t('user.greeting', { name: 'John' });
   */
  var $t: TranslationFunction;
}

/**
 * 扩展 Window 接口以包含 $t 函数（客户端）
 */
interface Window {
  /**
   * 客户端全局翻译函数 $t
   */
  $t?: TranslationFunction;
}

export {};

