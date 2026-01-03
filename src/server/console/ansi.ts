/**
 * ANSI 颜色代码和终端格式化工具
 * 提供终端颜色、样式和格式化功能
 */

/**
 * 检查是否应该使用颜色输出
 * 只检查 DWEB_NO_COLOR 环境变量
 *
 * @returns 如果应该使用颜色返回 true，否则返回 false
 */
function shouldUseColor(): boolean {
  // 检查 DWEB_NO_COLOR 环境变量
  const dwebNoColor = Deno.env.get("DWEB_NO_COLOR");

  // 添加调试日志
  console.error(
    `[shouldUseColor] DWEB_NO_COLOR=${dwebNoColor}, 所有环境变量:`,
    Object.keys(Deno.env.toObject())
      .filter((key) => key.includes("COLOR") || key.includes("DWEB"))
      .map((key) => `${key}=${Deno.env.get(key)}`)
      .join(", "),
  );

  if (dwebNoColor) {
    console.error(
      `[shouldUseColor] 检测到 DWEB_NO_COLOR=${dwebNoColor}，禁用颜色输出`,
    );
    return false;
  }

  console.error(`[shouldUseColor] 未设置 DWEB_NO_COLOR，启用颜色输出`);
  return true;
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
 * 移除字符串中的 ANSI 转义码
 * 用于清理包含颜色代码的文本，特别是在非 TTY 环境或日志文件中
 *
 * @param text 包含 ANSI 转义码的文本
 * @returns 移除所有 ANSI 转义码后的纯文本
 *
 * @example
 * ```typescript
 * const coloredText = "\x1b[32mHello\x1b[0m";
 * const plainText = stripAnsiCodes(coloredText); // "Hello"
 * ```
 */
export function stripAnsiCodes(text: string): string {
  // 匹配所有 ANSI 转义序列
  // 格式: ESC [ 参数序列 m 或 ESC [ 参数序列 ; 参数序列 m
  // 例如: \x1b[0m, \x1b[32m, \x1b[1;34m 等
  // deno-lint-ignore no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

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
