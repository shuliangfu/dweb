## API 参考

### Command 类

#### 方法

- `info(description: string): this` - 设置命令描述（支持链式调用）
- `alias(alias: string): this` - 添加命令别名（支持链式调用）
- `setVersion(version: string): this` - 设置命令版本（支持链式调用）
- `setUsage(usage: string): this` - 设置自定义用法字符串（支持链式调用）
- `example(command: string, description?: string): this` - 添加使用示例（支持链式调用）
- `option(option: CommandOption): this` - 添加命令选项（支持链式调用）
- `argument(argument: CommandArgument): this` - 添加命令参数（支持链式调用）
- `action(handler: CommandHandler): this` - 设置命令执行函数（支持链式调用）
- `before(hook: CommandHook): this` - 设置命令执行前钩子（支持链式调用）
- `after(hook: CommandHook): this` - 设置命令执行后钩子（支持链式调用）
- `command(name: string, description?: string): Command` - 添加子命令（description 可选）
- `subcommandAlias(alias: string, commandName: string): this` - 为子命令添加别名（支持链式调用）
- `initializeApp(): Promise<void>` - 手动初始化应用实例（如果未初始化）
- `waitForAppInit(): Promise<void>` - 等待应用初始化完成
- `getDatabase(): Promise<DatabaseAdapter | null>` - 获取数据库连接（如果已配置）
- `getApp(): Application | null` - 获取应用实例（如果已初始化）
- `showHelp(): void` - 显示帮助信息
- `execute(args?: string[]): Promise<void>` - 执行命令（无参数时自动显示帮助）

#### 接口

```typescript
// 选项值类型
type OptionValueType = "string" | "number" | "boolean" | "array";

// 选项值验证函数
type OptionValidator = (value: string) => boolean | string;

// 参数值验证函数
type ArgumentValidator = (value: string) => boolean | string;

interface CommandOption {
  name: string;                    // 选项名称（长格式，如 --help）
  alias?: string;                  // 选项别名（短格式，如 -h）
  description: string;             // 选项描述
  requiresValue?: boolean;         // 是否需要值
  defaultValue?: string | boolean | number; // 默认值
  type?: OptionValueType;          // 选项值类型（用于自动类型转换）
  validator?: OptionValidator;      // 选项值验证函数
  group?: string;                  // 选项分组名称（用于在帮助信息中分组显示）
  required?: boolean;              // 选项是否必需
  conflicts?: string[];            // 与此选项冲突的选项名称列表
  dependsOn?: string[];            // 此选项依赖的选项名称列表
  choices?: string[];               // 选项的可选值列表（用于枚举验证）
}

interface CommandArgument {
  name: string;                    // 参数名称
  description: string;             // 参数描述
  required?: boolean;              // 是否必需
  validator?: ArgumentValidator;   // 参数值验证函数
  choices?: string[];              // 参数的可选值列表（用于枚举验证）
}

type CommandHandler = (
  args: string[],
  options: ParsedOptions
) => Promise<void> | void;

type CommandHook = (
  args: string[],
  options: ParsedOptions
) => Promise<void> | void;

interface ParsedOptions {
  [key: string]: string | boolean | number | string[] | undefined;
}
```
