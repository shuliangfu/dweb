/**
 * 命令行输出工具
 * 提供美化的输出方法，包括成功、错误、警告、信息等消息
 */

import { colorize } from "./ansi.ts";

// ==================== 输出方法 ====================

/**
 * 输出成功消息
 * @param message 消息内容
 */
export function success(message: string): void {
  console.log(
    `${colorize("✓", "green", true)} ${colorize(message, "green")}`,
  );
}

/**
 * 输出错误消息
 * @param message 消息内容
 */
export function error(message: string): void {
  console.error(
    `${colorize("✗", "red", true)} ${colorize(message, "red")}`,
  );
}

/**
 * 输出警告消息
 * @param message 消息内容
 */
export function warning(message: string): void {
  console.log(
    `${colorize("⚠", "yellow", true)} ${colorize(message, "yellow")}`,
  );
}

/**
 * 输出信息消息
 * @param message 消息内容
 */
export function info(message: string): void {
  console.log(
    `${colorize("ℹ", "blue", true)} ${colorize(message, "blue")}`,
  );
}

/**
 * 输出分隔线
 * @param char 分隔字符（默认：━）
 * @param length 长度（默认：50）
 */
export function separator(char = "━", length = 50): void {
  console.log(colorize(char.repeat(length), "gray"));
}

/**
 * 输出标题
 * @param title 标题内容
 */
export function title(title: string): void {
  console.log(`\n${colorize(title, "cyan", true)}\n`);
}

/**
 * 输出键值对信息
 * @param key 键名
 * @param value 值
 */
export function keyValue(key: string, value: string | number): void {
  console.log(
    `${colorize(key + ":", "gray")} ${colorize(String(value), "white", true)}`,
  );
}

/**
 * 输出多行键值对信息
 * @param data 键值对对象
 */
export function keyValuePairs(data: Record<string, string | number>): void {
  for (const [key, value] of Object.entries(data)) {
    keyValue(key, value);
  }
}

/**
 * 输出列表
 * @param items 列表项
 * @param prefix 前缀符号（默认：•）
 */
export function list(items: string[], prefix = "•"): void {
  items.forEach((item) => {
    console.log(`${colorize(prefix, "gray")} ${item}`);
  });
}

/**
 * 输出带编号的列表
 * @param items 列表项
 * @param start 起始编号（默认：1）
 */
export function numberedList(items: string[], start = 1): void {
  items.forEach((item, index) => {
    const number = start + index;
    console.log(`${colorize(`[${number}]`, "gray")} ${item}`);
  });
}
