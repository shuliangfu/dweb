/**
 * CLI 输出工具模块
 * 提供统一的 CLI 输出格式和样式
 *
 * @module utils/cli-output
 */

/**
 * ANSI 颜色代码
 */
const colors = {
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
} as const;

/**
 * 检查是否支持颜色输出
 * 在以下情况下禁用颜色：
 * 1. 设置了 NO_COLOR 环境变量（标准环境变量）
 * 2. 设置了 DWEB_NO_COLOR 环境变量（框架特定变量）
 * 3. TERM 环境变量为 "dumb"
 * 4. 检测到在 Docker 容器中运行
 * 5. stdout 或 stderr 不是 TTY（守护进程或重定向到文件）
 */
function supportsColor(): boolean {
  // 检查 NO_COLOR 环境变量（标准环境变量，用于禁用颜色）
  if (Deno.env.get("NO_COLOR")) {
    return false;
  }

  // 检查框架特定的环境变量
  if (Deno.env.get("DWEB_NO_COLOR")) {
    return false;
  }

  // 检查 TERM 环境变量
  if (Deno.env.get("TERM") === "dumb") {
    return false;
  }

  // 检查是否在 Docker 容器中运行
  // 多种检测方式确保能正确识别 Docker 环境
  // 注意：在 Docker 中使用 tee 时，stdout 仍然是 TTY，所以必须依赖容器检测
  try {
    // 方式1: 检查 .dockerenv 文件（Docker 容器的标志文件）
    try {
      Deno.statSync("/.dockerenv");
      return false; // 在 Docker 容器中，禁用颜色
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
        return false; // 在容器中，禁用颜色
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

  // 检查 stdout 和 stderr 是否都是 TTY
  // 如果其中任何一个不是 TTY，通常意味着是守护进程或输出被重定向，应该禁用颜色
  try {
    const stdoutIsTTY = Deno.stdout.isTerminal();
    const stderrIsTTY = Deno.stderr.isTerminal();

    // 只有当 stdout 和 stderr 都是 TTY 时才使用颜色
    // 这样可以检测到使用 tee 等工具重定向输出的情况
    return stdoutIsTTY && stderrIsTTY;
  } catch {
    // 如果检查失败，默认禁用颜色（更安全）
    return false;
  }
}

const useColor = supportsColor();

/**
 * 应用颜色
 */
function colorize(text: string, color: keyof typeof colors): string {
  if (!useColor) {
    return text;
  }
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * 输出成功消息
 */
export function success(message: string): void {
  console.log(`${colorize("✓", "green")} ${message}`);
}

/**
 * 输出错误消息
 */
export function error(message: string): void {
  console.error(`${colorize("✗", "red")} ${message}`);
}

/**
 * 输出警告消息
 */
export function warn(message: string): void {
  console.warn(`${colorize("⚠", "yellow")} ${message}`);
}

/**
 * 输出信息消息
 */
export function info(message: string): void {
  console.log(`${colorize("ℹ", "blue")} ${message}`);
}

/**
 * 输出标题
 */
export function title(message: string): void {
  console.log(`\n${colorize(message, "bright")}\n`);
}

/**
 * 输出步骤
 */
export function step(message: string): void {
  console.log(`${colorize("→", "cyan")} ${message}`);
}

/**
 * 输出进度消息
 */
export function progress(message: string): void {
  console.log(`${colorize("●", "magenta")} ${message}`);
}

/**
 * 输出分隔线
 */
export function separator(char: string = "─", length: number = 50): void {
  console.log(colorize(char.repeat(length), "dim"));
}

/**
 * 输出表格数据
 */
export function table(
  data: Array<Record<string, string>>,
  headers?: string[],
): void {
  if (data.length === 0) {
    return;
  }

  // 确定列
  const columns = headers || Object.keys(data[0]);

  // 计算每列的最大宽度
  const widths = columns.map((col) => {
    const headerWidth = col.length;
    const dataWidth = Math.max(
      ...data.map((row) => String(row[col] || "").length),
    );
    return Math.max(headerWidth, dataWidth);
  });

  // 输出表头
  const headerRow = columns
    .map((col, i) => colorize(col.padEnd(widths[i]), "bright"))
    .join("  ");
  console.log(headerRow);
  separator("─", headerRow.length);

  // 输出数据行
  for (const row of data) {
    const dataRow = columns
      .map((col, i) => String(row[col] || "").padEnd(widths[i]))
      .join("  ");
    console.log(dataRow);
  }
}

/**
 * 输出命令帮助信息
 */
export function help(
  title: string,
  commands: Array<{ command: string; description: string }>,
): void {
  console.log(`\n${colorize(title, "bright")}\n`);
  console.log(colorize("用法:", "dim"));
  console.log(`  deno run -A src/cli.ts <command>[:app-name]\n`);
  console.log(colorize("命令:", "dim"));
  for (const { command, description } of commands) {
    console.log(`  ${colorize(command.padEnd(20), "cyan")} ${description}`);
  }
  console.log();
}

/**
 * 输出启动横幅
 */
export function banner(text: string): void {
  const lines = [
    "",
    colorize("═".repeat(60), "cyan"),
    colorize(text, "bright"),
    colorize("═".repeat(60), "cyan"),
    "",
  ];
  console.log(lines.join("\n"));
}
