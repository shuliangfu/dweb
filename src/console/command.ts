/**
 * 命令行命令封装类
 * 用于创建和管理命令行命令，支持参数解析、选项处理和帮助信息
 */

import { colors } from "./ansi.ts";
import { error as outputError, warning } from "./output.ts";

/**
 * 命令选项定义
 */
export interface CommandOption {
  /** 选项名称（长格式，如 --help） */
  name: string;
  /** 选项别名（短格式，如 -h） */
  alias?: string;
  /** 选项描述 */
  description: string;
  /** 是否需要值 */
  requiresValue?: boolean;
  /** 默认值 */
  defaultValue?: string | boolean;
}

/**
 * 命令参数定义
 */
export interface CommandArgument {
  /** 参数名称 */
  name: string;
  /** 参数描述 */
  description: string;
  /** 是否必需 */
  required?: boolean;
}

/**
 * 解析后的命令选项
 */
export interface ParsedOptions {
  [key: string]: string | boolean | undefined;
}

/**
 * 命令执行函数类型
 */
export type CommandHandler = (
  args: string[],
  options: ParsedOptions
) => Promise<void> | void;

/**
 * 命令行命令类
 */
export class Command {
  /** 命令名称 */
  private name: string;
  /** 命令描述 */
  private description: string;
  /** 命令版本 */
  private version?: string;
  /** 自定义用法字符串（如果设置，将覆盖自动生成的用法） */
  private usage?: string;
  /** 命令选项列表 */
  private options: CommandOption[] = [];
  /** 命令参数列表 */
  private arguments: CommandArgument[] = [];
  /** 命令执行函数 */
  private handler?: CommandHandler;
  /** 子命令列表 */
  private subcommands: Map<string, Command> = new Map();

  /**
   * 创建命令实例
   * @param name 命令名称
   * @param description 命令描述
   */
  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }

  /**
   * 设置命令版本
   * @param version 版本号
   * @returns 当前命令实例（支持链式调用）
   */
  setVersion(version: string): this {
    this.version = version;
    return this;
  }

  /**
   * 设置自定义用法字符串
   * @param usage 用法字符串
   * @returns 当前命令实例（支持链式调用）
   */
  setUsage(usage: string): this {
    this.usage = usage;
    return this;
  }

  /**
   * 添加命令选项
   * @param option 选项定义
   * @returns 当前命令实例（支持链式调用）
   */
  option(option: CommandOption): this {
    this.options.push(option);
    return this;
  }

  /**
   * 添加命令参数
   * @param argument 参数定义
   * @returns 当前命令实例（支持链式调用）
   */
  argument(argument: CommandArgument): this {
    this.arguments.push(argument);
    return this;
  }

  /**
   * 设置命令执行函数
   * @param handler 执行函数
   * @returns 当前命令实例（支持链式调用）
   */
  action(handler: CommandHandler): this {
    this.handler = handler;
    return this;
  }

  /**
   * 添加子命令
   * @param name 子命令名称
   * @param description 子命令描述
   * @returns 子命令实例
   */
  command(name: string, description: string): Command {
    const subcommand = new Command(name, description);
    this.subcommands.set(name, subcommand);
    return subcommand;
  }

  /**
   * 解析命令行参数
   * @param args 命令行参数数组
   * @returns 解析后的参数和选项
   */
  private parseArgs(args: string[]): {
    arguments: string[];
    options: ParsedOptions;
  } {
    const parsedOptions: ParsedOptions = {};
    const parsedArgs: string[] = [];
    let i = 0;

    // 初始化选项默认值
    for (const opt of this.options) {
      if (opt.defaultValue !== undefined) {
        parsedOptions[opt.name] = opt.defaultValue;
      }
    }

    // 解析参数和选项
    while (i < args.length) {
      const arg = args[i];

      // 处理选项（以 -- 或 - 开头）
      if (arg.startsWith("--")) {
        const optionName = arg.slice(2);
        const option = this.options.find((opt) => opt.name === optionName);

        if (option) {
          if (option.requiresValue) {
            // 需要值的选项：--option=value 或 --option value
            if (arg.includes("=")) {
              const [name, value] = arg.split("=", 2);
              parsedOptions[name.slice(2)] = value;
            } else if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
              parsedOptions[optionName] = args[i + 1];
              i++;
            } else {
              outputError(`选项 --${optionName} 需要值`);
              Deno.exit(1);
            }
          } else {
            // 布尔选项
            parsedOptions[optionName] = true;
          }
        } else {
          outputError(`未知选项: ${arg}`);
          Deno.exit(1);
        }
      } else if (arg.startsWith("-") && arg.length > 1) {
        // 处理短选项（-h, -abc 等）
        const optionName = arg.slice(1);
        const option = this.options.find(
          (opt) => opt.alias === optionName
        );

        if (option) {
          if (option.requiresValue) {
            if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
              parsedOptions[option.name] = args[i + 1];
              i++;
            } else {
              outputError(`选项 -${optionName} 需要值`);
              Deno.exit(1);
            }
          } else {
            parsedOptions[option.name] = true;
          }
        } else {
          outputError(`未知选项: ${arg}`);
          Deno.exit(1);
        }
      } else {
        // 普通参数
        parsedArgs.push(arg);
      }

      i++;
    }

    // 验证必需参数
    for (let j = 0; j < this.arguments.length; j++) {
      const argDef = this.arguments[j];
      if (argDef.required && j >= parsedArgs.length) {
        outputError(`缺少必需参数: ${argDef.name}`);
        Deno.exit(1);
      }
    }

    return {
      arguments: parsedArgs,
      options: parsedOptions,
    };
  }

  /**
   * 显示帮助信息
   */
  showHelp(): void {
    console.log(`\n${colors.cyan}${colors.bright}${this.name}${colors.reset}`);
    if (this.description) {
      console.log(`  ${this.description}\n`);
    }

    // 显示用法
    console.log(`${colors.dim}用法:${colors.reset}`);
    
    // 如果设置了自定义用法，直接使用
    if (this.usage) {
      console.log(`  ${this.usage}\n`);
    } else {
      // 否则自动生成用法
      let usage = `  ${this.name}`;

      // 添加选项
      const optionalOptions = this.options.filter((opt) => !opt.requiresValue);
      const requiredOptions = this.options.filter((opt) => opt.requiresValue);
      if (optionalOptions.length > 0 || requiredOptions.length > 0) {
        usage += " [选项]";
      }

      // 添加参数
      for (const arg of this.arguments) {
        if (arg.required) {
          usage += ` <${arg.name}>`;
        } else {
          usage += ` [${arg.name}]`;
        }
      }

      console.log(usage + "\n");
    }

    // 显示参数
    if (this.arguments.length > 0) {
      console.log(`${colors.dim}参数:${colors.reset}`);
      for (const arg of this.arguments) {
        const required = arg.required ? `${colors.red}*${colors.reset} ` : "  ";
        console.log(
          `  ${required}${colors.cyan}${arg.name}${colors.reset}    ${arg.description}`
        );
      }
      console.log();
    }

    // 显示选项
    if (this.options.length > 0) {
      console.log(`${colors.dim}选项:${colors.reset}`);
      for (const opt of this.options) {
        let optionStr = "  ";
        if (opt.alias) {
          optionStr += `${colors.cyan}-${opt.alias}${colors.reset}, `;
        }
        optionStr += `${colors.cyan}--${opt.name}${colors.reset}`;
        if (opt.requiresValue) {
          optionStr += ` <值>`;
        }

        // 对齐描述
        const padding = 30 - optionStr.length;
        optionStr += " ".repeat(Math.max(0, padding));
        optionStr += opt.description;

        if (opt.defaultValue !== undefined) {
          optionStr += ` ${colors.dim}(默认: ${opt.defaultValue})${colors.reset}`;
        }

        console.log(optionStr);
      }
      console.log();
    }

    // 显示子命令
    if (this.subcommands.size > 0) {
      console.log(`${colors.dim}子命令:${colors.reset}`);
      
      // 计算最长的子命令名称长度，用于对齐
      let maxNameLength = 0;
      for (const [name] of this.subcommands) {
        maxNameLength = Math.max(maxNameLength, name.length);
      }
      
      // 统一的对齐宽度（命令名称 + 4个空格）
      const alignWidth = maxNameLength + 4;
      
      for (const [name, cmd] of this.subcommands) {
        const nameStr = `${colors.cyan}${name}${colors.reset}`;
        const padding = alignWidth - name.length;
        console.log(`  ${nameStr}${" ".repeat(padding)}${cmd.description}`);
      }
      console.log();
    }

    // 显示版本
    if (this.version) {
      console.log(`${colors.dim}版本:${colors.reset} ${this.version}\n`);
    }
  }

  /**
   * 执行命令
   * @param args 命令行参数（默认使用 Deno.args）
   */
  async execute(args: string[] = Deno.args): Promise<void> {
    // 检查是否请求帮助
    if (args.includes("--help") || args.includes("-h")) {
      this.showHelp();
      return;
    }

    // 检查是否请求版本
    if (args.includes("--version") || args.includes("-v")) {
      if (this.version) {
        console.log(this.version);
      } else {
        outputError("未设置版本号");
      }
      return;
    }

    // 检查子命令
    if (args.length > 0 && this.subcommands.has(args[0])) {
      const subcommand = this.subcommands.get(args[0])!;
      await subcommand.execute(args.slice(1));
      return;
    }

    // 解析参数和选项
    const { arguments: parsedArgs, options: parsedOptions } =
      this.parseArgs(args);

    // 执行命令处理函数
    if (this.handler) {
      try {
        await this.handler(parsedArgs, parsedOptions);
      } catch (err) {
        outputError(`执行命令时出错: ${err instanceof Error ? err.message : String(err)}`);
        Deno.exit(1);
      }
    } else {
      warning("命令未设置处理函数");
      this.showHelp();
    }
  }
}
