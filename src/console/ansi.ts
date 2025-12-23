/**
 * ANSI 颜色代码和终端格式化工具
 * 提供终端颜色、样式和格式化功能
 */

/**
 * ANSI 颜色代码常量
 */
export const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
};

/**
 * 应用颜色到文本
 * @param text 要着色的文本
 * @param color 颜色名称
 * @param bold 是否加粗
 * @returns 带颜色代码的文本
 */
export function colorize(text: string, color: keyof typeof colors, bold = false): string {
  const colorCode = colors[color];
  const boldCode = bold ? colors.bright : "";
  return `${boldCode}${colorCode}${text}${colors.reset}`;
}

/**
 * 清除屏幕
 */
export function clearScreen(): void {
  const encoder = new TextEncoder();
  Deno.stdout.writeSync(encoder.encode("\x1b[2J\x1b[H"));
}

/**
 * 隐藏光标
 */
export function hideCursor(): void {
  const encoder = new TextEncoder();
  Deno.stdout.writeSync(encoder.encode("\x1b[?25l"));
}

/**
 * 显示光标
 */
export function showCursor(): void {
  const encoder = new TextEncoder();
  Deno.stdout.writeSync(encoder.encode("\x1b[?25h"));
}

/**
 * 移动光标到指定位置
 * @param row 行号（从1开始）
 * @param col 列号（从1开始）
 */
export function moveCursor(row: number, col: number): void {
  const encoder = new TextEncoder();
  Deno.stdout.writeSync(encoder.encode(`\x1b[${row};${col}H`));
}

/**
 * 清除当前行
 */
export function clearLine(): void {
  const encoder = new TextEncoder();
  Deno.stdout.writeSync(encoder.encode("\r\x1b[K"));
}

