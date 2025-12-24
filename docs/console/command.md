## 命令行命令封装类

`Command` 类提供了完整的命令行命令封装功能，支持参数解析、选项处理、子命令等。

### 基本使用

```typescript
import { Command } from "@dreamer/dweb/console";
import { success, error } from "@dreamer/dweb/console";

// 创建命令（description 参数可选）
const cmd = new Command("my-command")
  .info("这是一个示例命令")  // 使用 info() 方法设置描述
  .setVersion("1.0.0")
  .alias("mc")  // 添加命令别名
  .option({
    name: "verbose",
    alias: "v",
    description: "显示详细信息",
  })
  .option({
    name: "output",
    alias: "o",
    description: "输出文件路径",
    requiresValue: true,
  })
  .argument({
    name: "file",
    description: "要处理的文件",
    required: true,
  })
  .example("my-command file.txt -o output.txt", "处理文件并输出")
  .action(async (args, options) => {
    const file = args[0];
    const verbose = options.verbose === true;
    const output = options.output as string | undefined;
    
    if (verbose) {
      success(`处理文件: ${file}`);
    }
    
    if (output) {
      success(`输出到: ${output}`);
    }
    
    // 执行命令逻辑...
  });

// 执行命令
await cmd.execute();
```

### 选项定义

```typescript
// 布尔选项（不需要值）
.option({
  name: "help",
  alias: "h",
  description: "显示帮助信息",
})

// 需要值的选项
.option({
  name: "port",
  alias: "p",
  description: "端口号",
  requiresValue: true,
  defaultValue: "3000",
  type: "number",  // 自动类型转换：string | number | boolean | array
})

// 带验证的选项
.option({
  name: "env",
  description: "环境",
  requiresValue: true,
  choices: ["dev", "prod", "test"],  // 枚举值验证
  validator: (value) => {
    // 自定义验证函数，返回 true 或错误消息
    return value.length > 0 || "环境不能为空";
  },
})

// 必需选项
.option({
  name: "config",
  alias: "c",
  description: "配置文件路径",
  requiresValue: true,
  required: true,  // 标记为必需选项
})

// 选项分组
.option({
  name: "host",
  description: "主机地址",
  requiresValue: true,
  group: "服务器配置",  // 在帮助信息中分组显示
})

// 选项冲突检测
.option({
  name: "json",
  description: "JSON 输出",
  conflicts: ["yaml"],  // 与 --yaml 选项冲突
})

// 选项依赖
.option({
  name: "output",
  description: "输出文件",
  requiresValue: true,
  dependsOn: ["format"],  // 依赖于 --format 选项
})
```

### 参数定义

```typescript
// 必需参数
.argument({
  name: "source",
  description: "源文件路径",
  required: true,
})

// 可选参数
.argument({
  name: "destination",
  description: "目标文件路径",
  required: false,
})

// 带验证的参数
.argument({
  name: "action",
  description: "操作类型",
  required: true,
  choices: ["create", "update", "delete"],  // 枚举值验证
  validator: (value) => {
    // 自定义验证函数，返回 true 或错误消息
    return value.length > 0 || "操作类型不能为空";
  },
})
```

### 子命令

```typescript
const cmd = new Command("app", "应用程序管理工具");

// 添加子命令（description 参数可选）
const createCmd = cmd.command("create")
  .info("创建新项目")  // 使用 info() 方法设置描述
  .argument({
    name: "name",
    description: "项目名称",
    required: true,
  })
  .action(async (args) => {
    const name = args[0];
    success(`创建项目: ${name}`);
  });

const listCmd = cmd.command("list", "列出所有项目")
  .action(async () => {
    success("项目列表");
  });

// 为子命令添加别名
cmd.subcommandAlias("c", "create");  // 可以使用 app c 代替 app create

await cmd.execute();
```

### 命令钩子

```typescript
const cmd = new Command("my-command", "示例命令")
  .before(async (args, options) => {
    // 执行前钩子
    console.log("准备执行命令...");
  })
  .after(async (args, options) => {
    // 执行后钩子
    console.log("命令执行完成");
  })
  .action(async (args, options) => {
    // 主处理函数
    console.log("执行命令逻辑");
  });
```

### 使用示例

使用 `example()` 方法为命令添加使用示例，帮助用户快速理解命令用法：

```typescript
const cmd = new Command("my-command", "示例命令")
  .example("my-command --help", "查看帮助信息")
  .example("my-command file.txt -o output.txt", "处理文件并输出")
  .example("my-command --port 8080 --env prod", "生产环境运行");
```

**显示格式**：
- 示例描述会显示在命令的同一行，用空格分隔
- 多个示例的描述会自动对齐，确保美观和易读
- 支持中文字符，自动计算字符宽度确保对齐准确

帮助信息中的示例显示效果：
```
示例:
  my-command --help                 查看帮助信息
  my-command file.txt -o output.txt 处理文件并输出
  my-command --port 8080 --env prod 生产环境运行
```

### 自动帮助信息

命令会自动生成帮助信息，用户可以通过 `--help` 或 `-h` 选项查看：

```bash
my-command --help
```

帮助信息会自动显示：
- 命令名称和别名
- 命令描述
- 用法说明
- 参数列表（带必需标记和可选值）
- 选项列表（按分组显示，带默认值和可选值，自动对齐）
- 使用示例（描述与命令同一行，自动对齐）
- 子命令列表（显示常用选项）
- 提示信息（显示具体的命令示例，如：`deno run -A src/cli.ts dev --help`）
- 版本信息

**对齐优化**：
- 所有选项的描述会自动对齐，从同一列开始
- 支持中文字符宽度计算（中文字符占 2 个字符宽度）
- 确保显示效果美观统一
```
