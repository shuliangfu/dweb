/**
 * 控制台工具模块
 * 统一导出所有控制台相关功能，用于命令行交互和输出
 *
 * 此模块提供以下功能：
 *
 * **ANSI 颜色和格式化工具（ansi）**
 * - 终端颜色代码
 * - 文本样式（粗体、下划线等）
 * - 光标控制
 *
 * **命令行输出工具（output）**
 * - 格式化输出（info、success、error、warning）
 * - 进度条显示
 * - 日志级别控制
 *
 * **命令行命令封装类（command）**
 * - 命令定义和执行
 * - 参数解析
 * - 帮助信息生成
 *
 * **命令行输入工具（prompt）**
 * - 交互式输入
 * - 选择菜单
 * - 确认提示
 *
 * **表格输出工具（table）**
 * - 格式化表格显示
 * - 对齐和边框
 * - 数据格式化
 *
 * @example
 * ```typescript
 * import { info, success, Command, interactiveMenu } from "@dreamer/dweb/console";
 *
 * // 输出信息
 * info("正在启动服务器...");
 * success("服务器启动成功！");
 *
 * // 创建命令
 * const cmd = new Command("dev", "启动开发服务器");
 * cmd.action(() => {
 *   // 执行命令逻辑
 * });
 *
 * // 交互式菜单
 * const choice = await interactiveMenu({
 *   message: "请选择操作",
 *   choices: ["开发", "构建", "部署"],
 * });
 * ```
 */

// ANSI 颜色和格式化工具
export * from "./ansi.ts";

// 命令行输出工具
export * from "./output.ts";

// 命令行命令封装类
export * from "./command.ts";

// 命令行输入工具
export * from "./prompt.ts";

// 表格输出工具
export * from "./table.ts";
