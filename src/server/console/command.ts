/**
 * 命令行命令封装类
 * 用于创建和管理命令行命令，支持参数解析、选项处理和帮助信息
 * 所有命令自动支持数据库连接功能（如果配置了数据库）
 */

import { colors } from "./ansi.ts";
import { error as outputError, warning } from "./output.ts";
import { getDatabaseAsync } from "../../features/database/access.ts";
import type { DatabaseAdapter } from "../../features/database/types.ts";
import { loadConfigForConsole } from "../../core/config.ts";
import { Application } from "../../core/application.ts";
import { ConfigManager } from "../../core/config-manager.ts";

/**
 * 选项值类型
 */
export type OptionValueType = "string" | "number" | "boolean" | "array";

/**
 * 选项值验证函数
 */
export type OptionValidator = (value: string) => boolean | string;

/**
 * 参数值验证函数
 */
export type ArgumentValidator = (value: string) => boolean | string;

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
  defaultValue?: string | boolean | number;
  /** 选项值类型（用于自动类型转换） */
  type?: OptionValueType;
  /** 选项值验证函数，返回 true 或错误消息字符串 */
  validator?: OptionValidator;
  /** 选项分组名称（用于在帮助信息中分组显示） */
  group?: string;
  /** 选项是否必需 */
  required?: boolean;
  /** 与此选项冲突的选项名称列表 */
  conflicts?: string[];
  /** 此选项依赖的选项名称列表 */
  dependsOn?: string[];
  /** 选项的可选值列表（用于枚举验证） */
  choices?: string[];
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
  /** 参数值验证函数，返回 true 或错误消息字符串 */
  validator?: ArgumentValidator;
  /** 参数的可选值列表（用于枚举验证） */
  choices?: string[];
}

/**
 * 解析后的命令选项
 */
export interface ParsedOptions {
  [key: string]: string | boolean | number | string[] | undefined;
}

/**
 * 命令执行函数类型
 * @param args 命令行参数
 * @param options 解析后的选项
 * @param command Command 实例，可以用于访问 getDatabase() 等方法
 */
export type CommandHandler = (
  args: string[],
  options: ParsedOptions,
  command?: Command,
) => Promise<void> | void;

/**
 * 命令钩子函数类型
 */
export type CommandHook = (
  args: string[],
  options: ParsedOptions,
) => Promise<void> | void;

/**
 * 命令行命令类
 */
export class Command {
  /** 命令名称 */
  private name: string;
  /** 命令别名列表 */
  private aliases: string[] = [];
  /** 命令描述 */
  private description?: string;
  /** 命令版本 */
  private version?: string;
  /** 自定义用法字符串（如果设置，将覆盖自动生成的用法） */
  private usage?: string;
  /** 是否保持应用运行 */
  private isKeepAlive?: boolean;
  /** 使用示例列表 */
  private examples: Array<{ command: string; description?: string }> = [];
  /** 命令选项列表 */
  private options: CommandOption[] = [];
  /** 命令参数列表 */
  private arguments: CommandArgument[] = [];
  /** 命令执行函数 */
  private handler?: CommandHandler;
  /** 命令执行前钩子 */
  private beforeHook?: CommandHook;
  /** 命令执行后钩子 */
  private afterHook?: CommandHook;
  /** 子命令列表 */
  private subcommands: Map<string, Command> = new Map();
  /** 子命令别名映射 */
  private subcommandAliases: Map<string, string> = new Map();
  /** 配置是否已初始化 */
  private appInitialized = false;
  /** 应用实例 */
  private app: Application | null = null;

  /**
   * 创建命令实例
   * @param name 命令名称
   * @param description 命令描述（可选，可通过 info() 方法设置）
   */
  constructor(name: string, description?: string) {
    this.name = name;
    this.description = description;

    this.before(async (_args, _options) => {
      await this.initializedApp();
    });
  }

  /**
   * 设置命令描述
   * @param description 命令描述
   * @returns 当前命令实例（支持链式调用）
   */
  info(description: string): this {
    this.description = description;
    return this;
  }

  /**
   * 添加命令别名
   * @param alias 别名
   * @returns 当前命令实例（支持链式调用）
   */
  alias(alias: string): this {
    this.aliases.push(alias);
    return this;
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

  keepAlive(): this {
    this.isKeepAlive = true;
    return this;
  }

  /**
   * 添加使用示例
   * @param command 示例命令
   * @param description 示例描述（可选）
   * @returns 当前命令实例（支持链式调用）
   */
  example(command: string, description?: string): this {
    this.examples.push({ command, description });
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
   * 设置命令执行前钩子
   * @param hook 钩子函数
   * @returns 当前命令实例（支持链式调用）
   */
  before(hook: CommandHook): this {
    this.beforeHook = hook;
    return this;
  }

  /**
   * 设置命令执行后钩子
   * @param hook 钩子函数
   * @returns 当前命令实例（支持链式调用）
   */
  after(hook: CommandHook): this {
    this.afterHook = hook;
    return this;
  }

  /**
   * 添加子命令
   * @param name 子命令名称
   * @param description 子命令描述
   * @returns 子命令实例
   */
  command(name: string, description?: string): Command {
    const subcommand = new Command(name, description);
    this.subcommands.set(name, subcommand);
    return subcommand;
  }

  /**
   * 为子命令添加别名
   * @param alias 别名
   * @param commandName 子命令名称
   * @returns 当前命令实例（支持链式调用）
   */
  subcommandAlias(alias: string, commandName: string): this {
    if (!this.subcommands.has(commandName)) {
      throw new Error(`子命令 "${commandName}" 不存在`);
    }
    this.subcommandAliases.set(alias, commandName);
    return this;
  }

  /**
   * 转换选项值类型
   * @param value 原始值
   * @param type 目标类型
   * @returns 转换后的值
   */
  private convertOptionValue(
    value: string,
    type?: OptionValueType,
  ): string | number | boolean | string[] {
    if (!type || type === "string") {
      return value;
    }

    if (type === "boolean") {
      return value === "true" || value === "1" || value === "yes";
    }

    if (type === "number") {
      const num = Number(value);
      if (isNaN(num)) {
        throw new Error(`无法将 "${value}" 转换为数字`);
      }
      return num;
    }

    if (type === "array") {
      // 支持逗号分隔的数组值
      return value.split(",").map((v) => v.trim());
    }

    return value;
  }

  /**
   * 验证选项值
   * @param option 选项定义
   * @param value 选项值
   * @returns 验证结果，true 表示通过，字符串表示错误消息
   */
  private validateOptionValue(
    option: CommandOption,
    value: string,
  ): boolean | string {
    // 检查枚举值
    if (option.choices && option.choices.length > 0) {
      if (!option.choices.includes(value)) {
        return `选项 --${option.name} 的值必须是以下之一: ${
          option.choices.join(", ")
        }`;
      }
    }

    // 执行自定义验证函数
    if (option.validator) {
      const result = option.validator(value);
      if (result !== true) {
        return result || `选项 --${option.name} 的值无效`;
      }
    }

    return true;
  }

  /**
   * 验证参数值
   * @param argument 参数定义
   * @param value 参数值
   * @returns 验证结果，true 表示通过，字符串表示错误消息
   */
  private validateArgumentValue(
    argument: CommandArgument,
    value: string,
  ): boolean | string {
    // 检查枚举值
    if (argument.choices && argument.choices.length > 0) {
      if (!argument.choices.includes(value)) {
        return `参数 ${argument.name} 的值必须是以下之一: ${
          argument.choices.join(", ")
        }`;
      }
    }

    // 执行自定义验证函数
    if (argument.validator) {
      const result = argument.validator(value);
      if (result !== true) {
        return result || `参数 ${argument.name} 的值无效`;
      }
    }

    return true;
  }

  /**
   * 检查选项冲突和依赖
   * @param parsedOptions 解析后的选项
   */
  private validateOptionRelations(parsedOptions: ParsedOptions): void {
    for (const opt of this.options) {
      const optionValue = parsedOptions[opt.name];

      // 检查冲突
      if (
        opt.conflicts && opt.conflicts.length > 0 && optionValue !== undefined
      ) {
        for (const conflictName of opt.conflicts) {
          if (parsedOptions[conflictName] !== undefined) {
            outputError(
              `选项 --${opt.name} 与 --${conflictName} 冲突，不能同时使用`,
            );
            Deno.exit(1);
          }
        }
      }

      // 检查依赖
      if (
        opt.dependsOn && opt.dependsOn.length > 0 && optionValue !== undefined
      ) {
        for (const depName of opt.dependsOn) {
          if (parsedOptions[depName] === undefined) {
            outputError(
              `选项 --${opt.name} 依赖于 --${depName}，请先指定 --${depName}`,
            );
            Deno.exit(1);
          }
        }
      }

      // 检查必需选项
      if (opt.required && optionValue === undefined) {
        outputError(`选项 --${opt.name} 是必需的`);
        Deno.exit(1);
      }
    }
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
        parsedOptions[opt.name] = opt.defaultValue as string | boolean | number;
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
            let value: string;
            if (arg.includes("=")) {
              const [, val] = arg.split("=", 2);
              value = val;
            } else if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
              value = args[i + 1];
              i++;
            } else {
              outputError(`选项 --${optionName} 需要值`);
              Deno.exit(1);
            }

            // 验证选项值
            const validation = this.validateOptionValue(option, value);
            if (validation !== true) {
              outputError(validation as string);
              Deno.exit(1);
            }

            // 转换类型
            try {
              parsedOptions[optionName] = this.convertOptionValue(
                value,
                option.type,
              );
            } catch (err) {
              outputError(
                err instanceof Error ? err.message : String(err),
              );
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
          (opt) => opt.alias === optionName,
        );

        if (option) {
          if (option.requiresValue) {
            if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
              const value = args[i + 1];

              // 验证选项值
              const validation = this.validateOptionValue(option, value);
              if (validation !== true) {
                outputError(validation as string);
                Deno.exit(1);
              }

              // 转换类型
              try {
                parsedOptions[option.name] = this.convertOptionValue(
                  value,
                  option.type,
                );
              } catch (err) {
                outputError(
                  err instanceof Error ? err.message : String(err),
                );
                Deno.exit(1);
              }

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

      // 验证参数值
      if (j < parsedArgs.length) {
        const validation = this.validateArgumentValue(argDef, parsedArgs[j]);
        if (validation !== true) {
          outputError(validation as string);
          Deno.exit(1);
        }
      }
    }

    // 验证选项关系和必需选项
    this.validateOptionRelations(parsedOptions);

    return {
      arguments: parsedArgs,
      options: parsedOptions,
    };
  }

  /**
   * 显示帮助信息
   */
  showHelp(): void {
    // 显示命令名称和别名
    let nameDisplay =
      `${colors.cyan}${colors.bright}${this.name}${colors.reset}`;
    if (this.aliases.length > 0) {
      nameDisplay += ` ${colors.dim}(${
        this.aliases.join(", ")
      })${colors.reset}`;
    }
    console.log(`\n${nameDisplay}`);

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

      // 如果有子命令，添加子命令提示
      if (this.subcommands.size > 0) {
        usage += " <command>";
      }

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
        let argStr = `  ${required}${colors.cyan}${arg.name}${colors.reset}`;

        // 显示可选值
        if (arg.choices && arg.choices.length > 0) {
          argStr += ` ${colors.dim}(${arg.choices.join("|")})${colors.reset}`;
        }

        // 对齐描述
        const padding = 30 - argStr.length;
        argStr += " ".repeat(Math.max(0, padding));
        argStr += arg.description;

        console.log(argStr);
      }
      console.log();
    }

    // 显示选项（按分组）
    if (this.options.length > 0) {
      // 按分组组织选项
      const groupedOptions = new Map<string, CommandOption[]>();
      const ungroupedOptions: CommandOption[] = [];

      for (const opt of this.options) {
        if (opt.group) {
          if (!groupedOptions.has(opt.group)) {
            groupedOptions.set(opt.group, []);
          }
          groupedOptions.get(opt.group)!.push(opt);
        } else {
          ungroupedOptions.push(opt);
        }
      }

      // 计算所有选项的最大显示长度（用于对齐）
      let maxOptionLength = 0;
      for (const opts of groupedOptions.values()) {
        for (const opt of opts) {
          maxOptionLength = Math.max(
            maxOptionLength,
            this.calculateOptionDisplayLength(opt),
          );
        }
      }
      for (const opt of ungroupedOptions) {
        maxOptionLength = Math.max(
          maxOptionLength,
          this.calculateOptionDisplayLength(opt),
        );
      }
      // 确保最小宽度，保证对齐效果
      maxOptionLength = Math.max(maxOptionLength, 20);

      // 显示分组选项
      for (const [groupName, opts] of groupedOptions) {
        console.log(`${colors.dim}${groupName}:${colors.reset}`);
        for (const opt of opts) {
          this.printOption(opt, maxOptionLength);
        }
        console.log();
      }

      // 显示未分组选项
      if (ungroupedOptions.length > 0) {
        if (groupedOptions.size > 0) {
          console.log(`${colors.dim}选项:${colors.reset}`);
        } else {
          console.log(`${colors.dim}选项:${colors.reset}`);
        }
        for (const opt of ungroupedOptions) {
          this.printOption(opt, maxOptionLength);
        }
        console.log();
      }
    }

    // 显示使用示例
    if (this.examples.length > 0) {
      console.log(`${colors.dim}示例:${colors.reset}`);

      // 计算所有示例命令的最大显示宽度（用于对齐描述）
      let maxCommandWidth = 0;
      for (const example of this.examples) {
        const commandWidth = this.calculateDisplayWidth(example.command);
        maxCommandWidth = Math.max(maxCommandWidth, commandWidth);
      }
      // 确保最小宽度
      maxCommandWidth = Math.max(maxCommandWidth, 20);

      // 显示示例，描述在同一行并对齐
      for (const example of this.examples) {
        const commandWidth = this.calculateDisplayWidth(example.command);
        const padding = maxCommandWidth - commandWidth;
        let exampleStr = `  ${colors.cyan}${example.command}${colors.reset}`;

        if (example.description) {
          // 添加 padding 使描述对齐
          exampleStr += " ".repeat(padding);
          exampleStr += ` ${colors.dim}${example.description}${colors.reset}`;
        }

        console.log(exampleStr);
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
        // 显示子命令名称和描述（子命令名称后加点）
        console.log(
          `  ${nameStr}.${" ".repeat(Math.max(0, padding - 1))}${
            cmd.description || ""
          }`,
        );

        // 显示子命令的选项（最多显示前5个常用选项）
        if (cmd.options.length > 0) {
          // 计算选项名称的最大长度（用于对齐，包含颜色代码但不影响实际宽度）
          // 先计算所有子命令中选项的最大长度，确保统一对齐
          let globalMaxOptionLength = 0;
          for (const [, subCmd] of this.subcommands) {
            for (const opt of subCmd.options.slice(0, 5)) {
              const optionDisplayLength = opt.alias
                ? opt.alias.length + 2 // -a.
                : opt.name.length + 3; // --name.
              globalMaxOptionLength = Math.max(
                globalMaxOptionLength,
                optionDisplayLength,
              );
            }
          }

          // 计算当前子命令选项的最大长度
          let maxOptionDisplayLength = 0;
          for (const opt of cmd.options.slice(0, 5)) {
            // 计算实际显示长度（不包含 ANSI 颜色代码）
            const optionDisplayLength = opt.alias
              ? opt.alias.length + 2 // -a.
              : opt.name.length + 3; // --name.
            maxOptionDisplayLength = Math.max(
              maxOptionDisplayLength,
              optionDisplayLength,
            );
          }

          // 使用全局最大长度确保所有子命令的选项对齐一致
          const alignToLength = Math.max(
            maxOptionDisplayLength,
            globalMaxOptionLength,
            8,
          );

          const displayOptions = cmd.options.slice(0, 5);
          for (const opt of displayOptions) {
            let optionStr = "    ";

            // 显示选项（优先显示别名，选项名称后加点）
            const optionName = opt.alias
              ? `${colors.cyan}-${opt.alias}${colors.reset}.`
              : `${colors.cyan}--${opt.name}${colors.reset}.`;
            optionStr += optionName;

            // 对齐选项描述（计算实际显示长度，不包含 ANSI 代码）
            const optionDisplayLength = opt.alias
              ? opt.alias.length + 2 // -a.
              : opt.name.length + 3; // --name.
            const optionPadding = alignToLength - optionDisplayLength + 2; // +2 用于额外间距
            optionStr += " ".repeat(Math.max(0, optionPadding));
            optionStr += opt.description;

            console.log(optionStr);
          }

          // 如果还有更多选项，显示提示
          if (cmd.options.length > 5) {
            console.log(
              `    ${colors.dim}... 还有 ${
                cmd.options.length - 5
              } 个选项${colors.reset}`,
            );
          }
        }
      }
      console.log();

      // 提示查看子命令详细帮助
      // 获取第一个子命令作为示例
      const firstSubcommand = this.subcommands.keys().next().value;
      if (firstSubcommand) {
        // 尝试获取当前脚本路径
        let scriptPath = "deno run -A <script>";
        try {
          const mainModule = Deno.mainModule;
          if (mainModule) {
            // 从主模块路径中提取脚本路径
            // 例如：file:///path/to/console/cli.ts -> console/cli.ts
            const url = new URL(mainModule);
            if (url.protocol === "file:") {
              const path = url.pathname;
              // 获取相对于当前工作目录的路径
              const cwd = Deno.cwd();
              const scriptRelativePath = path.startsWith(cwd)
                ? path.substring(cwd.length + 1)
                : path.substring(path.lastIndexOf("/") + 1);
              scriptPath = `deno run -A ${scriptRelativePath}`;
            }
          }
        } catch {
          // 如果获取失败，使用默认值
        }

        // 构建完整的命令路径（包含父命令名称）
        // 例如：如果当前命令是 "db"，子命令是 "create-user"，则生成 "deno run -A console/cli.ts db create-user --help"
        let commandPrefix =
          `${scriptPath} ${this.name} ${firstSubcommand} --help`;
        if (this.usage) {
          // 从 usage 中提取命令前缀，替换 <command> 为实际子命令，替换 [选项] 为 --help
          const firstLine = this.usage.split("\n")[0].trim();
          // 如果 usage 中已经包含 deno run，则直接使用；否则添加脚本路径
          if (firstLine.includes("deno run")) {
            commandPrefix = firstLine
              .replace(/<command>/g, `${this.name} ${firstSubcommand}`)
              .replace(/\[选项\]/g, "--help");
          } else {
            commandPrefix = `${scriptPath} ${firstLine}`
              .replace(/<command>/g, `${this.name} ${firstSubcommand}`)
              .replace(/\[选项\]/g, "--help");
          }
        }
        console.log(
          `${colors.dim}提示: 查看子命令详细帮助，例如: ${colors.reset}${colors.cyan}${commandPrefix}${colors.reset}${colors.dim}${colors.reset}\n`,
        );
      } else {
        console.log(
          `${colors.dim}提示: 使用 ${colors.reset}${colors.cyan}${this.name} <command> --help${colors.reset}${colors.dim} 查看子命令的详细选项${colors.reset}\n`,
        );
      }
    }

    // 显示版本
    if (this.version) {
      console.log(`${colors.dim}版本:${colors.reset} ${this.version}\n`);
    }

    // 显示完帮助信息后退出程序
    Deno.exit(0);
  }

  /**
   * 计算字符串的实际显示宽度（考虑中文字符占 2 个字符宽度）
   * @param str 字符串
   * @returns 实际显示宽度
   */
  private calculateDisplayWidth(str: string): number {
    let width = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      // 判断是否为中文字符（包括中文标点）
      // 中文字符的 Unicode 范围：\u4e00-\u9fff
      // 中文标点等：\u3000-\u303f, \uff00-\uffef
      const code = char.charCodeAt(0);
      if (
        (code >= 0x4e00 && code <= 0x9fff) || // 中文字符
        (code >= 0x3000 && code <= 0x303f) || // 中文标点
        (code >= 0xff00 && code <= 0xffef) // 全角字符
      ) {
        width += 2;
      } else {
        width += 1;
      }
    }
    return width;
  }

  /**
   * 计算选项的实际显示长度（不包含 ANSI 颜色代码）
   * 考虑中文字符的宽度（中文字符占 2 个字符宽度）
   * @param opt 选项定义
   * @returns 实际显示长度
   */
  private calculateOptionDisplayLength(opt: CommandOption): number {
    let length = 2; // 前面的两个空格 "  "

    // 必需标记
    if (opt.required) {
      length += 2; // "* "
    }

    // 别名: "-a, " = 4 个字符（"-" + alias + ", "）
    if (opt.alias) {
      // 别名通常是单个字符，但也要考虑中文字符的情况
      length += 1 + this.calculateDisplayWidth(opt.alias) + 2; // "-" + alias + ", "
    }

    // 选项名称: "--name" = name.length + 2
    // 选项名称通常不包含中文，但也要考虑中文字符的情况
    length += this.calculateDisplayWidth(opt.name) + 2; // "--" + name

    // 需要值
    if (opt.requiresValue) {
      // " <值>" 需要整体计算宽度（考虑中文字符）
      length += this.calculateDisplayWidth(" <值>");
    }

    // 可选值
    if (opt.choices && opt.choices.length > 0) {
      const choicesStr = `(${opt.choices.join("|")})`;
      length += this.calculateDisplayWidth(choicesStr) + 1; // " (choices)"
    }

    return length;
  }

  /**
   * 打印单个选项信息
   * @param opt 选项定义
   * @param maxLength 最大显示长度（用于对齐）
   */
  private printOption(opt: CommandOption, maxLength?: number): void {
    let optionStr = "  ";

    // 显示必需标记
    if (opt.required) {
      optionStr += `${colors.red}*${colors.reset} `;
    }

    if (opt.alias) {
      optionStr += `${colors.cyan}-${opt.alias}${colors.reset}, `;
    }
    optionStr += `${colors.cyan}--${opt.name}${colors.reset}`;

    if (opt.requiresValue) {
      optionStr += ` <值>`;
    }

    // 显示可选值
    if (opt.choices && opt.choices.length > 0) {
      optionStr += ` ${colors.dim}(${opt.choices.join("|")})${colors.reset}`;
    }

    // 对齐描述（如果提供了最大长度，使用它；否则使用固定值）
    const actualLength = this.calculateOptionDisplayLength(opt);
    // 如果 maxLength 为 0 或 undefined，使用实际长度（不 padding）
    const targetLength = maxLength && maxLength > 0 ? maxLength : actualLength;
    const padding = Math.max(0, targetLength - actualLength);
    optionStr += " ".repeat(padding);
    optionStr += opt.description;

    if (opt.defaultValue !== undefined) {
      optionStr += ` ${colors.dim}(默认: ${opt.defaultValue})${colors.reset}`;
    }

    console.log(optionStr);
  }

  /**
   * 内部初始化应用实例的方法
   * 执行应用的实际初始化逻辑，包括加载配置、创建 Application 实例和初始化控制台
   *
   * 注意：
   * - 此方法是幂等的，多次调用不会重复初始化
   * - 通过 `appInitialized` 标志确保只初始化一次
   * - 此方法是私有方法，仅供内部使用
   *
   * @private
   * @returns Promise<void> 当应用初始化完成时 resolve
   */
  private async initializedApp(): Promise<void> {
    if (this.appInitialized) {
      return;
    }
    this.appInitialized = true;

    const config = await loadConfigForConsole();
    config.isProduction = false;

    this.app = new Application();

    const configManager = this.app.getService<ConfigManager>("configManager");
    configManager?.setConfig(config);

    await this.app.initializeConsole();
  }

  /**
   * 初始化应用实例
   * 可以手动调用此方法来初始化应用，而不依赖于 before 钩子
   *
   * 注意：
   * - 如果应用已经初始化，此方法不会重复初始化（幂等操作）
   * - Command 类默认会在执行前自动初始化应用（通过 before 钩子）
   * - 但在某些场景下，你可能需要手动控制初始化的时机
   *
   * @returns Promise<void> 当应用初始化完成时 resolve
   *
   * @example
   * ```typescript
   * const cmd = new Command("my-command")
   *   .action(async (args, options, command) => {
   *     // 手动初始化应用
   *     await command.initializeApp();
   *
   *     // 现在可以使用应用实例
   *     const app = command.getApp();
   *     if (app) {
   *       const service = app.getService<MyService>("myService");
   *       // 使用服务...
   *     }
   *   });
   * ```
   */
  public async initializeApp(): Promise<void> {
    await this.initializedApp();
  }

  /**
   * 获取数据库连接
   * 如果数据库未初始化，会先自动初始化
   *
   * 注意：Command 类会在执行前自动初始化数据库（通过 before 钩子），
   * 所以在 action 回调中可以直接使用此方法获取数据库连接
   *
   * @returns 数据库适配器实例，如果未配置数据库则返回 null
   * @throws {Error} 如果获取数据库连接失败
   *
   * @example
   * ```typescript
   * const db = await this.getDatabase();
   * if (db) {
   *   const result = await db.query("SELECT * FROM users");
   * }
   * ```
   */
  public async getDatabase(): Promise<DatabaseAdapter | null> {
    try {
      return await getDatabaseAsync();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`获取数据库连接失败: ${message}`);
    }
  }

  /**
   * 获取应用实例
   * 如果应用未初始化，会先自动初始化
   *
   * 注意：Command 类会在执行前自动初始化应用（通过 before 钩子），
   * 所以在 action 回调中可以直接使用此方法获取应用实例
   *
   * @returns 应用实例，如果未初始化则返回 null
   *
   * @example
   * ```typescript
   * const app = command.getApp();
   * if (app) {
   *   const userService = app.getService<UserService>("userService");
   *   const users = userService.getAllUsers();
   * }
   * ```
   */
  public getApp(): Application | null {
    return this.app;
  }

  /**
   * 执行命令
   * @param args 命令行参数（默认使用 Deno.args）
   */
  async execute(args: string[] = Deno.args): Promise<void> {
    // 先检查子命令（包括别名），如果是子命令，让子命令处理后续参数（包括 --help）
    if (args.length > 0) {
      const firstArg = args[0];

      // 检查子命令别名
      if (this.subcommandAliases.has(firstArg)) {
        const commandName = this.subcommandAliases.get(firstArg)!;
        const subcommand = this.subcommands.get(commandName)!;
        await subcommand.execute(args.slice(1));
        return;
      }

      // 检查子命令
      if (this.subcommands.has(firstArg)) {
        const subcommand = this.subcommands.get(firstArg)!;
        await subcommand.execute(args.slice(1));
        return;
      }
    }

    // 检查是否请求帮助（在子命令检查之后）
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

    // 解析参数和选项
    const { arguments: parsedArgs, options: parsedOptions } = this.parseArgs(
      args,
    );

    // 执行命令处理函数
    if (this.handler) {
      try {
        // 执行前置钩子
        if (this.beforeHook) {
          await this.beforeHook(parsedArgs, parsedOptions);
        }

        // 执行主处理函数，传递 Command 实例作为第三个参数
        await this.handler(parsedArgs, parsedOptions, this);

        // 执行后置钩子
        if (this.afterHook) {
          await this.afterHook(parsedArgs, parsedOptions);
        }
      } catch (err) {
        // 记录错误并退出
        outputError(
          `执行命令时出错: ${err instanceof Error ? err.message : String(err)}`,
        );
        Deno.exit(1);
      }
    } else {
      warning("命令未设置处理函数");
      this.showHelp();
    }

    if (!this.isKeepAlive) {
      Deno.exit(0);
    }
  }
}
