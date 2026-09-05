/**
 * @dreamer/console 集成
 *
 * 扩展 Command 类（含 App 实例），重新导出 output、prompt、table 等 CLI 工具 API。
 * 提供美化输出、表格、用户交互、ANSI 样式、参数解析。
 *
 * @example
 * ```ts
 * import { Command, output, prompt, table } from "jsr:@dreamer/dweb/feature/command";
 * ```
 *
 * @module
 */

import {
  Command as BaseCommand,
  type CommandHandler as BaseCommandHandler,
  type ParsedOptions,
} from "@dreamer/console";
import { ServiceContainer } from "@dreamer/service";
import { getConfig } from "../core/config.ts";
import { DwebErrorCode, throwDwebError } from "../utils/errors.ts";
import { initializeServiceContainer } from "../core/service.ts";
import type { App } from "../core/app.ts";

/**
 * 扩展的命令执行函数类型
 *
 * 第三个参数为 dweb 扩展的 Command 实例，可通过 command.app 访问 App。
 *
 * @param args 命令行参数数组
 * @param options 解析后的选项
 * @param command 当前 Command 实例（可访问 app、container）
 * @returns void 或 Promise<void>
 *
 * @example
 * ```ts
 * const handler: CommandHandler = async (args, options, command) => {
 *   await command?.initApp();
 *   const app = command?.app;
 *   if (app) await app.start();
 * };
 * ```
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
 *
 * @example
 * ```ts
 * const cmd = new Command("dev", "启动开发服务器");
 * cmd.action(async () => {
 *   await cmd.initApp();
 *   const app = cmd.app;
 *   // ...
 * });
 * ```
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
   */
  async initApp(): Promise<void> {
    // 获取已加载的配置
    // 配置加载优先级（从低到高）：
    // 1. common/config/main.ts（公共框架配置）
    // 2. 应用/config/main.ts（应用框架配置）
    // 3. 入口文件 main.ts 传入的 config（最高优先级）
    const loadedConfig = getConfig(this._container);
    delete loadedConfig.server;
    loadedConfig.hotReload = false;
    loadedConfig.kind = loadedConfig.kind ?? "console";

    // 创建 App 实例并保存（console 模式：不 listen，按需动态加载避免冷启动挂载完整 SSR/渲染器依赖）
    const { App: AppClass } = await import("../core/app.ts");
    this._app = new AppClass(loadedConfig, { mode: "console" });

    // 启动 App（会初始化所有服务，不 listen HTTP）
    await this._app.start({ mode: "console" });
  }

  /**
   * 获取 App 实例
   * 如果实例未设置，会尝试从配置文件加载（console 模式）
   *
   * @returns App 实例（如果存在）
   */
  get app(): App {
    if (!this._app) {
      throwDwebError(DwebErrorCode.APP_NOT_INITIALIZED);
    }
    return this._app;
  }

  /** 服务容器（用于获取 config、database 等） */
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

/**
 * ANSI 与终端控制（来自 @dreamer/console）：
 * - clearLine, clearScreen: 清行/清屏
 * - colorize, colors: 颜色与样式
 * - hideCursor, showCursor: 光标显隐
 * - moveCursor: 移动光标
 * - shouldUseColor, stripAnsiCodes: 颜色检测与去除
 */
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

/**
 * 输出与反馈（来自 @dreamer/console）：
 * - error, info, success, warning: 消息输出
 * - startSpinner, stopSpinner, succeedSpinner, failSpinner: 加载动画
 * - keyValue, keyValuePairs, list, numberedList: 结构化输出
 * - separator, title: 分隔与标题
 */
export {
  error,
  failSpinner,
  info,
  keyValue,
  keyValuePairs,
  list,
  numberedList,
  separator,
  startSpinner,
  stopSpinner,
  succeedSpinner,
  success,
  title,
  warning,
} from "@dreamer/console";

/**
 * 用户交互（来自 @dreamer/console）：
 * - confirm: 确认
 * - input, inputEmail, inputNumber, inputPassword, inputUsername: 输入
 * - interactiveMenu, interactiveMenuSearch, multiSelect, select: 菜单选择
 * - pause, prompt: 暂停与提示
 */
export {
  confirm,
  input,
  inputEmail,
  inputNumber,
  inputPassword,
  inputUsername,
  interactiveMenu,
  interactiveMenuSearch,
  multiSelect,
  pause,
  prompt,
  select,
} from "@dreamer/console";

/**
 * 表格与进度条（来自 @dreamer/console）：
 * - keyValueTable, table: 表格
 * - progressBar, progressBarLive, progressBarLiveFinish: 进度条
 * - TableColumn, TableOptions: 表格类型
 */
export {
  keyValueTable,
  progressBar,
  progressBarLive,
  progressBarLiveFinish,
  table,
  type TableColumn,
  type TableOptions,
} from "@dreamer/console";

/**
 * CLI 类型（来自 @dreamer/console）：
 * - ArgumentValidator, CommandArgument, CommandOption: 参数与选项
 * - CommandHook, OptionValidator, OptionValueType: 钩子与校验
 * - InputOptions, InteractiveMultiMenuOptions, PromptOptions: 交互选项
 * - ParsedOptions: 解析后的选项
 */
export type {
  ArgumentValidator,
  CommandArgument,
  CommandHook,
  CommandOption,
  InputOptions,
  InteractiveMultiMenuOptions,
  OptionValidator,
  OptionValueType,
  ParsedOptions,
  PromptOptions,
} from "@dreamer/console";
