/**
 * ANSI 颜色代码和终端格式化工具
 * 提供终端颜色、样式和格式化功能
 */

/**
 * 检查是否应该使用颜色输出
 * 在以下情况下禁用颜色：
 * 1. 设置了 DWEB_NO_COLOR 环境变量（框架特定变量）
 * 2. 设置了 NO_COLOR 环境变量（标准环境变量）
 * 3. TERM 环境变量为 "dumb"
 * 4. 检测到在 Docker 容器中运行
 * 5. stdout 或 stderr 不是 TTY（守护进程或重定向到文件）
 *
 * 这是一个共用函数，供所有需要判断是否使用颜色的模块使用
 *
 * @returns 如果应该使用颜色返回 true，否则返回 false
 */
export function shouldUseColor(): boolean {
  // 1. 检查 DWEB_NO_COLOR 环境变量（框架特定变量，优先级最高）
  const dwebNoColor = Deno.env.get("DWEB_NO_COLOR");
  if (dwebNoColor) {
    return false;
  }

  // 2. 检查 NO_COLOR 环境变量（标准环境变量，用于禁用颜色）
  if (Deno.env.get("NO_COLOR")) {
    return false;
  }

  // 3. 检查 TERM 环境变量
  const term = Deno.env.get("TERM");
  if (term === "dumb") {
    return false;
  }

  // 4. 检查是否在 Docker 容器中运行
  // 多种检测方式确保能正确识别 Docker 环境
  // 注意：在 Docker 中使用 tee 时，stdout 仍然是 TTY，所以必须依赖容器检测
  try {
    // 方式1: 检查 .dockerenv 文件（Docker 容器的标志文件）
    try {
      Deno.statSync("/.dockerenv");
      return false;
    } catch {
      // 文件不存在，继续检查
    }

    // 方式2: 检查 /proc/1/cgroup 是否包含 docker 或 containerd
    try {
      const cgroupContent = Deno.readTextFileSync("/proc/1/cgroup");
      if (
        cgroupContent.includes("docker") ||
        cgroupContent.includes("containerd") ||
        cgroupContent.includes("kubepods") ||
        cgroupContent.includes("/docker/") ||
        cgroupContent.includes("/containerd/")
      ) {
        return false;
      }
    } catch {
      // 文件不存在或读取失败，继续检查
    }

    // 方式3: 检查环境变量（某些容器运行时会设置）
    const containerEnv = Deno.env.get("container");
    if (
      containerEnv === "docker" ||
      Deno.env.get("DOCKER_CONTAINER") === "true" ||
      containerEnv !== undefined // 如果设置了 container 环境变量（通常是容器环境）
    ) {
      return false;
    }

    // 方式4: 检查 /proc/self/mountinfo 是否包含 docker
    try {
      const mountInfo = Deno.readTextFileSync("/proc/self/mountinfo");
      if (
        mountInfo.includes("docker") ||
        mountInfo.includes("containerd") ||
        mountInfo.includes("/docker/") ||
        mountInfo.includes("/containerd/")
      ) {
        return false;
      }
    } catch {
      // 文件不存在或读取失败，继续检查
    }
  } catch {
    // 忽略错误，继续检查
  }

  // 5. 检查 stdout 和 stderr 是否都是 TTY
  // 如果其中任何一个不是 TTY，通常意味着是守护进程或输出被重定向，应该禁用颜色
  try {
    const stdoutIsTTY = Deno.stdout.isTerminal();
    const stderrIsTTY = Deno.stderr.isTerminal();

    // 只有当 stdout 和 stderr 都是 TTY 时才使用颜色
    // 这样可以检测到使用 tee 等工具重定向输出的情况
    if (!stdoutIsTTY || !stderrIsTTY) {
      return false;
    }
  } catch {
    // 如果检查失败，默认禁用颜色（更安全）
    return false;
  }

  // 所有检查都通过，启用颜色输出
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
