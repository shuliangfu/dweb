/**
 * 命令行输入工具
 * 提供美化的用户输入和交互功能，包括文本输入、密码输入、选择等
 */

import { colors } from "./ansi.ts";
import { error } from "./output.ts";

/**
 * 读取一行输入
 * @returns 输入的内容
 */
async function readLine(): Promise<string | null> {
  const decoder = new TextDecoder();
  const buf = new Uint8Array(1024);
  const n = await Deno.stdin.read(buf);
  if (n === null) {
    return null;
  }
  const line = decoder.decode(buf.subarray(0, n)).trim();
  return line || null;
}

/**
 * 基础输入提示
 * @param message 提示信息
 * @param hidden 是否隐藏输入（用于密码，显示为 *）
 * @returns 用户输入的内容
 */
export async function prompt(
  message: string,
  hidden = false,
): Promise<string | null> {
  const encoder = new TextEncoder();

  // 美化提示信息：添加颜色和图标
  const formattedMessage =
    `${colors.cyan}${colors.bright}❯${colors.reset} ${colors.dim}${message}${colors.reset}`;

  Deno.stdout.writeSync(encoder.encode(formattedMessage));

  if (hidden) {
    // 密码输入模式：显示 * 号
    return await readLineHidden();
  } else {
    // 普通输入模式
    const input = await readLine();
    return input;
  }
}

/**
 * 读取隐藏输入（显示为 * 号）
 * @returns 用户输入的内容
 */
async function readLineHidden(): Promise<string | null> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let input = "";
  let isRaw = false;

  try {
    // 尝试启用原始模式
    if (Deno.stdin.setRaw) {
      Deno.stdin.setRaw(true, { cbreak: true });
      isRaw = true;
    }

    while (true) {
      const buf = new Uint8Array(10);
      const n = await Deno.stdin.read(buf);

      if (n === null || n === 0) {
        continue;
      }

      const bytes = buf.subarray(0, n);
      const char = bytes[0];

      // Enter 键（\r 或 \n）
      if (char === 0x0d || char === 0x0a) {
        break;
      }

      // Ctrl+C
      if (char === 0x03) {
        Deno.stdout.writeSync(encoder.encode("\n"));
        Deno.exit(0);
      }

      // 退格键或 Delete 键
      if (char === 0x7f || char === 0x08) {
        if (input.length > 0) {
          input = input.slice(0, -1);
          // 回退光标并清除字符
          Deno.stdout.writeSync(encoder.encode("\b \b"));
        }
        continue;
      }

      // 可打印字符（ASCII 32-126）
      if (char >= 32 && char <= 126) {
        input += decoder.decode(bytes.subarray(0, 1));
        // 显示 * 号
        Deno.stdout.writeSync(encoder.encode("*"));
      }
    }

    // 换行
    Deno.stdout.writeSync(encoder.encode("\n"));

    return input || null;
  } catch (_err) {
    // 如果原始模式失败，回退到普通输入
    if (isRaw && Deno.stdin.setRaw) {
      Deno.stdin.setRaw(false);
    }
    // 回退到普通输入（不隐藏）
    return await readLine();
  } finally {
    // 恢复终端
    if (isRaw && Deno.stdin.setRaw) {
      Deno.stdin.setRaw(false);
    }
  }
}

/**
 * 确认输入（yes/no）
 * @param message 提示信息
 * @param defaultValue 默认值（true 表示默认 yes，false 表示默认 no）
 * @returns 用户确认结果
 */
export async function confirm(
  message: string,
  defaultValue = false,
): Promise<boolean> {
  const defaultText = defaultValue ? "Y/n" : "y/N";
  const input = await prompt(`${message} (${defaultText}): `);

  if (!input || input.trim() === "") {
    return defaultValue;
  }

  const lower = input.trim().toLowerCase();
  return lower === "y" || lower === "yes";
}

/**
 * 输入文本（带验证）
 * @param message 提示信息
 * @param validator 验证函数，返回错误信息或 null
 * @param required 是否必填
 * @returns 用户输入的内容
 */
export async function input(
  message: string,
  validator?: (value: string) => string | null,
  required = true,
): Promise<string> {
  while (true) {
    const value = await prompt(message);

    if (!value || value.trim() === "") {
      if (required) {
        error("此项为必填项，请输入");
        continue;
      }
      return "";
    }

    const trimmed = value.trim();

    if (validator) {
      const errorMsg = validator(trimmed);
      if (errorMsg) {
        error(errorMsg);
        continue;
      }
    }

    return trimmed;
  }
}

/**
 * 输入密码（带确认）
 * @param message 提示信息
 * @param minLength 最小长度
 * @param confirmMessage 确认提示信息
 * @returns 用户输入的密码
 */
export async function inputPassword(
  message = "请输入密码：",
  minLength = 8,
  confirmMessage = "请再次输入密码：",
): Promise<string> {
  while (true) {
    const password = await prompt(`${message}（至少 ${minLength} 位）`, true);

    if (!password || password.length < minLength) {
      error(`密码不能为空且长度至少 ${minLength} 位`);
      continue;
    }

    const confirmPassword = await prompt(confirmMessage, true);

    if (password !== confirmPassword) {
      error("两次输入的密码不一致，请重新输入");
      continue;
    }

    return password;
  }
}

/**
 * 输入邮箱（带验证）
 * @param message 提示信息
 * @param required 是否必填
 * @returns 用户输入的邮箱
 */
export async function inputEmail(
  message = "请输入邮箱：",
  required = true,
): Promise<string> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return await input(
    message,
    (value) => {
      if (!emailRegex.test(value)) {
        return "邮箱格式不正确";
      }
      return null;
    },
    required,
  );
}

/**
 * 输入用户名（带验证）
 * @param message 提示信息
 * @param minLength 最小长度
 * @param maxLength 最大长度
 * @param required 是否必填
 * @returns 用户输入的用户名
 */
export async function inputUsername(
  message = "请输入用户名：",
  minLength = 3,
  maxLength = 50,
  required = true,
): Promise<string> {
  const usernameRegex = /^[a-zA-Z0-9_]+$/;

  return await input(
    message,
    (value) => {
      if (value.length < minLength) {
        return `用户名长度至少 ${minLength} 个字符`;
      }
      if (value.length > maxLength) {
        return `用户名长度不能超过 ${maxLength} 个字符`;
      }
      if (!usernameRegex.test(value)) {
        return "用户名只能包含字母、数字和下划线";
      }
      return null;
    },
    required,
  );
}

/**
 * 输入数字（带验证）
 * @param message 提示信息
 * @param min 最小值
 * @param max 最大值
 * @param required 是否必填
 * @returns 用户输入的数字
 */
export async function inputNumber(
  message: string,
  min?: number,
  max?: number,
  required = true,
): Promise<number> {
  while (true) {
    const value = await prompt(message);

    if (!value || value.trim() === "") {
      if (required) {
        error("此项为必填项，请输入数字");
        continue;
      }
      return NaN;
    }

    const num = Number(value.trim());

    if (isNaN(num)) {
      error("请输入有效的数字");
      continue;
    }

    if (min !== undefined && num < min) {
      error(`数字不能小于 ${min}`);
      continue;
    }

    if (max !== undefined && num > max) {
      error(`数字不能大于 ${max}`);
      continue;
    }

    return num;
  }
}

/**
 * 单选（从选项列表中选择）
 * @param message 提示信息
 * @param options 选项列表
 * @param defaultValue 默认选项索引
 * @returns 选中的选项索引
 */
export async function select(
  message: string,
  options: string[],
  defaultValue?: number,
): Promise<number> {
  console.log(`\n${colors.cyan}${colors.bright}${message}${colors.reset}`);

  options.forEach((option, index) => {
    const marker = defaultValue === index
      ? `${colors.green}●${colors.reset}`
      : "○";
    console.log(
      `  ${marker} ${colors.dim}[${index + 1}]${colors.reset} ${option}`,
    );
  });

  while (true) {
    const input = await prompt(
      `\n请选择 (1-${options.length}${
        defaultValue !== undefined ? `, 默认: ${defaultValue + 1}` : ""
      }): `,
    );

    if (!input || input.trim() === "") {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      error("请选择一个选项");
      continue;
    }

    const num = Number(input.trim());

    if (isNaN(num) || num < 1 || num > options.length) {
      error(`请输入 1-${options.length} 之间的数字`);
      continue;
    }

    return num - 1;
  }
}

/**
 * 多选（从选项列表中选择多个）
 * @param message 提示信息
 * @param options 选项列表
 * @param min 最少选择数量
 * @param max 最多选择数量
 * @returns 选中的选项索引数组
 */
export async function multiSelect(
  message: string,
  options: string[],
  min = 1,
  max?: number,
): Promise<number[]> {
  console.log(`\n${colors.cyan}${colors.bright}${message}${colors.reset}`);

  options.forEach((option, index) => {
    console.log(`  ${colors.dim}[${index + 1}]${colors.reset} ${option}`);
  });

  const maxText = max ? `，最多 ${max} 个` : "";
  const minText = min > 0 ? `，至少 ${min} 个` : "";

  while (true) {
    const input = await prompt(`\n请选择（用逗号分隔${minText}${maxText}）: `);

    if (!input || input.trim() === "") {
      if (min === 0) {
        return [];
      }
      error("请至少选择一个选项");
      continue;
    }

    const parts = input.split(",").map((p) => p.trim()).filter((p) => p !== "");
    const indices = parts.map((p) => Number(p)).filter((n) =>
      !isNaN(n) && n >= 1 && n <= options.length
    );

    if (indices.length === 0) {
      error("请选择有效的选项");
      continue;
    }

    // 去重并转换为 0-based 索引
    const uniqueIndices = [...new Set(indices)].map((n) => n - 1);

    if (uniqueIndices.length < min) {
      error(`至少需要选择 ${min} 个选项`);
      continue;
    }

    if (max !== undefined && uniqueIndices.length > max) {
      error(`最多只能选择 ${max} 个选项`);
      continue;
    }

    return uniqueIndices.sort((a, b) => a - b);
  }
}

/**
 * 等待用户按键继续
 * @param message 提示信息
 */
export async function pause(message = "按 Enter 键继续..."): Promise<void> {
  await prompt(message);
}

/**
 * 交互式菜单选择（支持上下键导航）
 * @param message 提示信息
 * @param options 选项列表
 * @param defaultValue 默认选项索引
 * @returns 选中的选项索引
 */
export async function interactiveMenu(
  message: string,
  options: string[],
  defaultValue = 0,
): Promise<number> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let selectedIndex = defaultValue;

  // 显示菜单
  const renderMenu = () => {
    // 移动光标到行首并清除当前行
    Deno.stdout.writeSync(encoder.encode("\r\x1b[K"));

    // 显示标题
    console.log(`${colors.cyan}${colors.bright}${message}${colors.reset}\n`);

    // 显示选项
    options.forEach((option, index) => {
      if (index === selectedIndex) {
        // 选中的选项：高亮显示
        console.log(
          `  ${colors.green}${colors.bright}▶${colors.reset} ${colors.green}${colors.bright}${option}${colors.reset}`,
        );
      } else {
        // 未选中的选项：普通显示
        console.log(`    ${colors.dim}${option}${colors.reset}`);
      }
    });

    console.log(
      `\n${colors.dim}使用 ↑↓ 键选择，Enter 确认，Esc 取消${colors.reset}`,
    );
  };

  // 尝试使用原始模式
  try {
    // 隐藏光标
    Deno.stdout.writeSync(encoder.encode("\x1b[?25l"));

    // 启用原始模式
    const stdin = Deno.stdin;
    const isRaw = Deno.stdin.setRaw !== undefined;

    if (isRaw) {
      Deno.stdin.setRaw(true, { cbreak: true });
    }

    renderMenu();

    while (true) {
      const buf = new Uint8Array(10);
      const n = await stdin.read(buf);

      if (n === null || n === 0) {
        continue;
      }

      const bytes = buf.subarray(0, n);
      const input = decoder.decode(bytes);

      // 处理方向键（ANSI 转义序列）
      // 上箭头: \x1b[A 或 \x1bOA
      // 下箭头: \x1b[B 或 \x1bOB
      if (bytes[0] === 0x1b && bytes[1] === 0x5b) {
        if (bytes[2] === 0x41) {
          // 上箭头
          selectedIndex = selectedIndex > 0
            ? selectedIndex - 1
            : options.length - 1;
          // 清除屏幕并重新渲染
          Deno.stdout.writeSync(encoder.encode("\x1b[2J\x1b[H"));
          renderMenu();
        } else if (bytes[2] === 0x42) {
          // 下箭头
          selectedIndex = selectedIndex < options.length - 1
            ? selectedIndex + 1
            : 0;
          // 清除屏幕并重新渲染
          Deno.stdout.writeSync(encoder.encode("\x1b[2J\x1b[H"));
          renderMenu();
        }
      } else if (
        input === "\r" || input === "\n" || bytes[0] === 0x0d ||
        bytes[0] === 0x0a
      ) {
        // Enter 键
        break;
      } else if (input === "\x1b" || bytes[0] === 0x1b || bytes[0] === 0x03) {
        // Esc 或 Ctrl+C
        // 恢复终端
        Deno.stdout.writeSync(encoder.encode("\x1b[?25h"));
        if (isRaw) {
          Deno.stdin.setRaw(false);
        }
        Deno.exit(0);
      }
    }

    // 恢复终端
    Deno.stdout.writeSync(encoder.encode("\x1b[?25h"));
    if (isRaw) {
      Deno.stdin.setRaw(false);
    }

    // 清屏
    Deno.stdout.writeSync(encoder.encode("\x1b[2J\x1b[H"));

    return selectedIndex;
  } catch (_err) {
    // 如果原始模式不支持，回退到普通选择
    console.log(
      `\n${colors.yellow}警告: 不支持交互式菜单，使用普通选择模式${colors.reset}\n`,
    );
    return await select(message, options, defaultValue);
  }
}
