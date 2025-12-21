/**
 * i18n 全局类型声明
 * 使 $t() 和 t() 函数可以在全局作用域中直接使用，无需导入
 */

/**
 * 翻译函数类型
 */
type TranslationFunction = (
  key: string,
  params?: Record<string, string>,
) => string;

/**
 * 扩展 globalThis 类型以包含 $t 和 t 函数
 * 这些函数始终可用：如果 i18n 插件未初始化，会返回 key 本身
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

  /**
   * 全局翻译函数 t（$t 的别名）
   * 可以在任何地方直接使用，无需导入
   * 如果 i18n 插件未初始化，会返回 key 本身（不会报错）
   *
   * @example
   * const message = t('common.welcome');
   * const messageWithParams = t('user.greeting', { name: 'John' });
   */
  var t: TranslationFunction;
}

/**
 * 扩展 Window 接口以包含 $t 和 t 函数（客户端）
 */
interface Window {
  /**
   * 客户端全局翻译函数 $t
   */
  $t?: TranslationFunction;

  /**
   * 客户端全局翻译函数 t（$t 的别名）
   */
  t?: TranslationFunction;
}

export {};
