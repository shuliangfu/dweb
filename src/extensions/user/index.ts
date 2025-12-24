/**
 * 用户自定义扩展示例
 * 演示如何创建和使用自定义扩展
 */

import { registerExtension } from '../registry.ts';

/**
 * 示例：自定义字符串扩展
 * 将字符串转换为首字母大写的格式
 */
export function initCustomStringExtension(): void {
  registerExtension({
    name: 'toCapitalize',
    type: 'method',
    target: 'String',
    handler: function (this: string): string {
      return this.charAt(0).toUpperCase() + this.slice(1).toLowerCase();
    },
    description: '自定义：将字符串转换为首字母大写格式',
  });
}

/**
 * 示例：自定义辅助函数
 * 计算两个数字的和
 */
export function add(a: number, b: number): number {
  return a + b;
}

/**
 * 示例：自定义工具函数
 * 生成指定长度的随机数字字符串
 */
export function generateRandomNumber(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

/**
 * 初始化所有用户自定义扩展
 * 在应用启动时调用此函数来注册所有自定义扩展
 */
export function initUserExtensions(): void {
  // 注册自定义扩展
  initCustomStringExtension();

  // 可以在这里注册更多自定义扩展
  // registerExtension({ ... });
}

