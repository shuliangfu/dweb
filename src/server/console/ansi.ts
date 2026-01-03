/**
 * ANSI 颜色代码和终端格式化工具
 * 提供终端颜色、样式和格式化功能
 */

/**
 * 检查是否应该使用颜色输出
 * 在以下情况下禁用颜色：
 * 1. 设置了 NO_COLOR 环境变量
 * 2. TERM 环境变量为 "dumb"
 * 3. stdout 不是 TTY（守护进程或重定向到文件）
 *
 * @returns 如果应该使用颜色返回 true，否则返回 false
 */
function shouldUseColor(): boolean {
  // 检查 NO_COLOR 环境变量（标准环境变量，用于禁用颜色）
  if (Deno.env.get("NO_COLOR")) {
    return false;
  }

  // 检查 TERM 环境变量
  const term = Deno.env.get("TERM");
  if (term === "dumb") {
    return false;
  }

  // 检查 stdout 是否是 TTY
  // 如果不是 TTY，通常是守护进程或输出被重定向到文件，应该禁用颜色
  try {
    return Deno.stdout.isTerminal();
  } catch {
    // 如果检查失败，默认禁用颜色（更安全）
    return false;
  }
}

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
 * 如果检测到是守护进程或非 TTY 环境，将不应用颜色
 * @param text 要着色的文本
 * @param color 颜色名称
 * @param bold 是否加粗
 * @returns 带颜色代码的文本（如果支持颜色）或原始文本（如果不支持颜色）
 */
export function colorize(
  text: string,
  color: keyof typeof colors,
  bold = false,
): string {
  // 如果不应该使用颜色，直接返回原始文本
  if (!shouldUseColor()) {
    return text;
  }

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
