/**
 * @dreamer/console 集成
 *
 * 职责：
 * - 扩展 Command 类，添加 App 实例支持
 * - 重新导出 @dreamer/console 的其他 API
 * - 提供 CLI 工具支持
 *
 * 功能：
 * - 扩展的 Command 类（包含 app 实例）
 * - 美化输出（成功、错误、警告、信息等）
 * - 表格显示（多种样式）
 * - 用户交互（文本输入、选择、确认等）
 * - ANSI 颜色和样式支持
 * - 参数解析和选项处理
 *
 * 使用方式：
 * ```typescript
 * // 按需导入，避免依赖过大
 * import { Command, output, prompt, table } from "@dweb/feature/command";
 * ```
 */

import {
  Command as BaseCommand,
  type CommandHandler as BaseCommandHandler,
  type ParsedOptions,
} from "@dreamer/console";
import { ServiceContainer } from "@dreamer/service";
import type { App } from "../core/app.ts";
import { getConfig } from "../core/config.ts";
import { initializeServiceContainer } from "../core/service.ts";
/**
 * 扩展的命令执行函数类型
 * 第三个参数是 Command 实例（而不是 unknown）
 */
export type CommandHandler = (
  args: string[],
  options: ParsedOptions,
  command?: Command,
) => Promise<void> | void;

/**
 * 扩展的 Command 类，包含 App 实例
 *
 * 在 CLI 命令中可以通过 this.app 访问 App 实例
 * 如果创建时没有传入 app，会尝试从配置文件加载（console 模式）
 */
export class Command extends BaseCommand {
  /** App 实例（可选） */
  private _app?: App;
  readonly _container: ServiceContainer;

  /**
   * 创建命令实例
   *
   * @param name 命令名称
   * @param description 命令描述（可选）
   */
  constructor(name: string, description?: string) {
    super(name, description);
    this._container = initializeServiceContainer();
  }

  /**
   * 初始化 App 实例
   * 从配置文件加载并初始化 App（console 模式）
   *
   * @param configDirectory 配置目录（默认："./config"）
   */
  async initApp(): Promise<void> {
    // 动态导入 App 类，避免在类型检查时下载所有依赖
    const { App } = await import("../core/app.ts");

    // 获取已加载的配置
    // 配置加载优先级（从低到高）：
    // 1. common/config/main.ts（公共框架配置）
    // 2. 应用/config/main.ts（应用框架配置）
    // 3. 入口文件 main.ts 传入的 config（最高优先级）
    const loadedConfig = getConfig(this._container);
    delete loadedConfig.server;

    // 创建 App 实例并保存
    this._app = new App(loadedConfig);

    // 启动 App（会初始化所有服务）
    await this._app.start();
  }

  /**
   * 获取 App 实例
   * 如果实例未设置，会尝试从配置文件加载（console 模式）
   *
   * @returns App 实例（如果存在）
   */
  get app(): App {
    if (!this._app) {
      throw new Error("App 实例未初始化");
    }
    return this._app;
  }

  get container(): ServiceContainer {
    return this._container;
  }

  /**
   * 设置命令执行函数（重写以使用扩展的 CommandHandler 类型）
   *
   * @param handler 命令执行函数
   * @returns 当前命令实例（支持链式调用）
   */
  override action(handler: CommandHandler): this {
    // 将扩展的 CommandHandler 转换为基类的 CommandHandler
    const baseHandler: BaseCommandHandler = (args, options, command) => {
      return handler(args, options, command as Command);
    };
    return super.action(baseHandler);
  }

  /**
   * 创建子命令（重写以返回扩展的 Command 实例）
   * 子命令调用 alias() 时，会同时注册到父级的 subcommandAliases，使别名生效
   *
   * @param name 子命令名称
   * @param description 子命令描述
   * @returns 子命令实例
   */
  override command(name: string, description?: string): Command {
    const subcommand = new Command(name, description);
    // 访问父类的私有属性需要使用类型断言
    const baseThis = this as unknown as BaseCommand;
    const subcommands = (baseThis as any).subcommands as Map<
      string,
      BaseCommand
    >;
    const subcommandAliases = (baseThis as any).subcommandAliases as Map<
      string,
      string
    >;
    subcommands.set(name, subcommand);

    // 包装 alias：子命令的 alias() 同时注册到父级，使 "dweb g" 等能正确路由
    const originalAlias = subcommand.alias.bind(subcommand);
    subcommand.alias = (alias: string) => {
      originalAlias(alias);
      subcommandAliases.set(alias, name);
      return subcommand;
    };
    return subcommand;
  }
}

// 重新导出 @dreamer/console 的其他 API（除了 Command）
export {
  clearLine,
  clearScreen,
  colorize,
  colors,
  hideCursor,
  moveCursor,
  shouldUseColor,
  showCursor,
  stripAnsiCodes,
} from "@dreamer/console";

export {
  error,
  info,
  keyValue,
  keyValuePairs,
  list,
  numberedList,
  separator,
  success,
  title,
  warning,
} from "@dreamer/console";

export {
  confirm,
  input,
  inputEmail,
  inputNumber,
  inputPassword,
  inputUsername,
  interactiveMenu,
  multiSelect,
  pause,
  prompt,
  select,
} from "@dreamer/console";

export {
  keyValueTable,
  progressBar,
  table,
  type TableColumn,
  type TableOptions,
} from "@dreamer/console";

// 重新导出类型（除了 CommandHandler，我们需要扩展它）
export type {
  ArgumentValidator,
  CommandArgument,
  CommandHook,
  CommandOption,
  OptionValidator,
  OptionValueType,
  ParsedOptions,
} from "@dreamer/console";
