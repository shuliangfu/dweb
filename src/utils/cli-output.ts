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
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
} as const;

/**
 * 检查是否支持颜色输出
 */
function supportsColor(): boolean {
  // 检查环境变量和终端类型
  if (Deno.env.get('NO_COLOR')) {
    return false;
  }
  if (Deno.env.get('TERM') === 'dumb') {
    return false;
  }
  // Deno 默认支持颜色
  return true;
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
  console.log(`${colorize('✓', 'green')} ${message}`);
}

/**
 * 输出错误消息
 */
export function error(message: string): void {
  console.error(`${colorize('✗', 'red')} ${message}`);
}

/**
 * 输出警告消息
 */
export function warn(message: string): void {
  console.warn(`${colorize('⚠', 'yellow')} ${message}`);
}

/**
 * 输出信息消息
 */
export function info(message: string): void {
  console.log(`${colorize('ℹ', 'blue')} ${message}`);
}

/**
 * 输出标题
 */
export function title(message: string): void {
  console.log(`\n${colorize(message, 'bright')}\n`);
}

/**
 * 输出步骤
 */
export function step(message: string): void {
  console.log(`${colorize('→', 'cyan')} ${message}`);
}

/**
 * 输出进度消息
 */
export function progress(message: string): void {
  console.log(`${colorize('●', 'magenta')} ${message}`);
}

/**
 * 输出分隔线
 */
export function separator(char: string = '─', length: number = 50): void {
  console.log(colorize(char.repeat(length), 'dim'));
}

/**
 * 输出表格数据
 */
export function table(data: Array<Record<string, string>>, headers?: string[]): void {
  if (data.length === 0) {
    return;
  }

  // 确定列
  const columns = headers || Object.keys(data[0]);
  
  // 计算每列的最大宽度
  const widths = columns.map(col => {
    const headerWidth = col.length;
    const dataWidth = Math.max(...data.map(row => String(row[col] || '').length));
    return Math.max(headerWidth, dataWidth);
  });

  // 输出表头
  const headerRow = columns
    .map((col, i) => colorize(col.padEnd(widths[i]), 'bright'))
    .join('  ');
  console.log(headerRow);
  separator('─', headerRow.length);

  // 输出数据行
  for (const row of data) {
    const dataRow = columns
      .map((col, i) => String(row[col] || '').padEnd(widths[i]))
      .join('  ');
    console.log(dataRow);
  }
}

/**
 * 输出命令帮助信息
 */
export function help(title: string, commands: Array<{ command: string; description: string }>): void {
  console.log(`\n${colorize(title, 'bright')}\n`);
  console.log(colorize('用法:', 'dim'));
  console.log(`  deno run -A src/cli.ts <command>[:app-name]\n`);
  console.log(colorize('命令:', 'dim'));
  for (const { command, description } of commands) {
    console.log(`  ${colorize(command.padEnd(20), 'cyan')} ${description}`);
  }
  console.log();
}

/**
 * 输出启动横幅
 */
export function banner(text: string): void {
  const lines = [
    '',
    colorize('═'.repeat(60), 'cyan'),
    colorize(text, 'bright'),
    colorize('═'.repeat(60), 'cyan'),
    '',
  ];
  console.log(lines.join('\n'));
}

