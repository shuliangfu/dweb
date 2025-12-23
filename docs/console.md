# 控制台工具

DWeb 框架提供了强大的控制台工具集，用于创建美观的命令行界面、处理用户输入、输出格式化信息等。

## 目录结构

```
src/console/
├── ansi.ts      # ANSI 颜色和格式化工具
├── output.ts    # 命令行输出工具
├── command.ts   # 命令行命令封装类
├── prompt.ts    # 命令行输入工具
├── table.ts     # 表格输出工具
└── mod.ts       # 统一导出模块
```

## 快速开始

### 导入模块

```typescript
// 导入所有控制台工具
import {
  // ANSI 工具
  colors,
  colorize,
  clearScreen,
  
  // 输出工具
  success,
  error,
  warning,
  info,
  separator,
  title,
  keyValue,
  
  // 命令类
  Command,
  
  // 输入工具
  prompt,
  confirm,
  input,
  select,
  
  // 表格工具
  table,
  progressBar,
} from "@dreamer/dweb/console";
```

## ANSI 颜色和格式化工具

### 基本使用

```typescript
import { colors, colorize } from "@dreamer/dweb/console";

// 使用颜色常量
console.log(`${colors.green}成功消息${colors.reset}`);
console.log(`${colors.red}错误消息${colors.reset}`);
console.log(`${colors.yellow}警告消息${colors.reset}`);

// 使用 colorize 函数
console.log(colorize("加粗的绿色文本", "green", true));
```

### 可用颜色

- `red` - 红色
- `green` - 绿色
- `yellow` - 黄色
- `blue` - 蓝色
- `magenta` - 洋红色
- `cyan` - 青色
- `white` - 白色
- `gray` - 灰色

### 样式控制

```typescript
import { colors, clearScreen, hideCursor, showCursor } from "@dreamer/dweb/console";

// 清除屏幕
clearScreen();

// 隐藏/显示光标
hideCursor();
// ... 执行操作 ...
showCursor();

// 移动光标
import { moveCursor } from "@dreamer/dweb/console";
moveCursor(10, 5); // 移动到第10行第5列
```

## 命令行输出工具

### 消息输出

```typescript
import { success, error, warning, info } from "@dreamer/dweb/console";

// 成功消息（绿色 ✓）
success("操作成功完成");

// 错误消息（红色 ✗）
error("操作失败");

// 警告消息（黄色 ⚠）
warning("请注意");

// 信息消息（蓝色 ℹ）
info("这是一条信息");
```

### 格式化输出

```typescript
import { separator, title, keyValue, keyValuePairs, list, numberedList } from "@dreamer/dweb/console";

// 分隔线
separator(); // 默认 50 个 ━
separator("=", 80); // 自定义字符和长度

// 标题
title("系统信息");

// 键值对
keyValue("版本", "1.0.0");
keyValue("作者", "DWeb Team");

// 多行键值对
keyValuePairs({
  "版本": "1.0.0",
  "作者": "DWeb Team",
  "许可证": "MIT",
});

// 列表
list(["项目 A", "项目 B", "项目 C"]);
list(["选项 1", "选项 2"], "→"); // 自定义前缀

// 带编号的列表
numberedList(["第一项", "第二项", "第三项"]);
numberedList(["项目 A", "项目 B"], 10); // 从 10 开始编号
```

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

```typescript
const cmd = new Command("my-command", "示例命令")
  .example("my-command --help", "查看帮助信息")
  .example("my-command file.txt -o output.txt", "处理文件并输出")
  .example("my-command --port 8080 --env prod", "生产环境运行");
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
- 选项列表（按分组显示，带默认值和可选值）
- 使用示例
- 子命令列表（显示常用选项）
- 版本信息
```

## 命令行输入工具

### 基础输入

```typescript
import { prompt } from "@dreamer/dweb/console";

// 普通输入
const name = await prompt("请输入您的姓名：");

// 隐藏输入（用于密码）
const password = await prompt("请输入密码：", true);
```

### 确认输入

```typescript
import { confirm } from "@dreamer/dweb/console";

// 确认操作（默认 no）
const confirmed = await confirm("确定要删除吗？");

// 确认操作（默认 yes）
const confirmed = await confirm("继续操作？", true);
```

### 文本输入（带验证）

```typescript
import { input } from "@dreamer/dweb/console";

// 必填输入
const name = await input("请输入姓名：");

// 可选输入
const email = await input("请输入邮箱（可选）：", undefined, false);

// 带验证的输入
const url = await input(
  "请输入 URL：",
  (value) => {
    if (!value.startsWith("http://") && !value.startsWith("https://")) {
      return "URL 必须以 http:// 或 https:// 开头";
    }
    return null;
  }
);
```

### 专用输入方法

```typescript
import {
  inputPassword,
  inputEmail,
  inputUsername,
  inputNumber,
} from "@dreamer/dweb/console";

// 密码输入（带确认）
const password = await inputPassword(
  "请输入密码：",
  8, // 最小长度
  "请再次输入密码："
);

// 邮箱输入（带验证）
const email = await inputEmail("请输入邮箱：");

// 用户名输入（带验证）
const username = await inputUsername(
  "请输入用户名：",
  3,  // 最小长度
  50, // 最大长度
);

// 数字输入（带验证）
const port = await inputNumber(
  "请输入端口号：",
  1,    // 最小值
  65535 // 最大值
);
```

### 选择输入

```typescript
import { select, multiSelect } from "@dreamer/dweb/console";

// 单选
const index = await select(
  "请选择框架：",
  ["React", "Vue", "Angular", "Svelte"],
  0 // 默认选项索引
);
const framework = ["React", "Vue", "Angular", "Svelte"][index];

// 多选
const indices = await multiSelect(
  "请选择功能（可多选）：",
  ["TypeScript", "ESLint", "Prettier", "Jest"],
  1, // 最少选择数量
  3  // 最多选择数量
);
```

### 交互式菜单

```typescript
import { interactiveMenu } from "@dreamer/dweb/console";

// 交互式菜单（支持上下键导航）
const index = await interactiveMenu(
  "请选择操作：",
  ["创建项目", "启动服务", "构建项目", "部署项目"],
  0 // 默认选项
);
```

### 暂停等待

```typescript
import { pause } from "@dreamer/dweb/console";

// 等待用户按键继续
await pause("按 Enter 键继续...");
```

## 表格输出工具

### 基本表格

```typescript
import { table } from "@dreamer/dweb/console";

const data = [
  { name: "Alice", age: 25, city: "Beijing" },
  { name: "Bob", age: 30, city: "Shanghai" },
  { name: "Charlie", age: 35, city: "Guangzhou" },
];

table(data, [
  { header: "姓名", width: 15, align: "left" },
  { header: "年龄", width: 10, align: "right" },
  { header: "城市", width: 0, align: "left" },
], {
  border: true,
  borderStyle: "single",
  header: true,
});
```

### 键值对表格

```typescript
import { keyValueTable } from "@dreamer/dweb/console";

keyValueTable({
  "版本": "1.0.0",
  "作者": "DWeb Team",
  "许可证": "MIT",
  "仓库": "https://github.com/shuliangfu/dweb",
});
```

### 进度条

```typescript
import { progressBar } from "@dreamer/dweb/console";

// 显示进度条
for (let i = 0; i <= 100; i += 10) {
  progressBar(i, 100, 30, "处理中");
  await new Promise((resolve) => setTimeout(resolve, 200));
}
```

## 完整示例

### 示例 1：创建 CLI 工具（基础功能）

```typescript
import { Command } from "@dreamer/dweb/console";
import { success, error, info, title, separator } from "@dreamer/dweb/console";

const cmd = new Command("my-cli", "我的 CLI 工具")
  .setVersion("1.0.0")
  .alias("mc")  // 添加别名
  .option({
    name: "verbose",
    alias: "v",
    description: "显示详细信息",
  })
  .option({
    name: "config",
    alias: "c",
    description: "配置文件路径",
    requiresValue: true,
    defaultValue: "./config.json",
  })
  .argument({
    name: "action",
    description: "要执行的操作",
    required: true,
  })
  .example("my-cli start --config ./prod.json", "使用生产配置启动")
  .action(async (args, options) => {
    const action = args[0];
    const verbose = options.verbose === true;
    const config = options.config as string;
    
    title("执行操作");
    
    if (verbose) {
      info(`操作: ${action}`);
      info(`配置: ${config}`);
    }
    
    separator();
    
    // 执行操作逻辑
    success(`操作 ${action} 执行成功`);
  });

await cmd.execute();
```

### 示例 1.1：高级选项功能

```typescript
import { Command } from "@dreamer/dweb/console";

const cmd = new Command("server", "服务器管理工具")
  .option({
    name: "port",
    alias: "p",
    description: "端口号",
    requiresValue: true,
    type: "number",  // 自动转换为数字
    validator: (value) => {
      const port = Number(value);
      return (port > 0 && port < 65536) || "端口号必须在 1-65535 之间";
    },
    group: "服务器配置",
  })
  .option({
    name: "env",
    description: "环境",
    requiresValue: true,
    choices: ["dev", "prod", "test"],  // 枚举值
    group: "服务器配置",
  })
  .option({
    name: "json",
    description: "JSON 输出",
    conflicts: ["yaml"],  // 与 --yaml 冲突
  })
  .option({
    name: "yaml",
    description: "YAML 输出",
    conflicts: ["json"],  // 与 --json 冲突
  })
  .option({
    name: "output",
    description: "输出文件",
    requiresValue: true,
    dependsOn: ["format"],  // 依赖于 --format
  })
  .action(async (args, options) => {
    const port = options.port as number;
    const env = options.env as string;
    console.log(`启动服务器: 端口 ${port}, 环境 ${env}`);
  });

await cmd.execute();
```

### 示例 2：交互式项目创建工具

```typescript
import {
  title,
  success,
  separator,
  input,
  select,
  confirm,
  inputEmail,
  inputPassword,
} from "@dreamer/dweb/console";

async function createProject() {
  title("创建新项目");
  
  // 输入项目信息
  const name = await input("项目名称：");
  const description = await input("项目描述：", undefined, false);
  
  // 选择框架
  const frameworkIndex = await select(
    "选择框架：",
    ["React", "Vue", "Angular", "Svelte"]
  );
  const frameworks = ["React", "Vue", "Angular", "Svelte"];
  const framework = frameworks[frameworkIndex];
  
  // 输入用户信息
  const email = await inputEmail("您的邮箱：");
  const password = await inputPassword("设置密码：");
  
  separator();
  
  // 确认信息
  console.log(`项目名称: ${name}`);
  console.log(`项目描述: ${description || "无"}`);
  console.log(`框架: ${framework}`);
  console.log(`邮箱: ${email}`);
  
  const confirmed = await confirm("确认创建项目？");
  
  if (confirmed) {
    success("项目创建成功！");
  } else {
    success("已取消创建");
  }
}

await createProject();
```

### 示例 3：数据展示工具

```typescript
import {
  title,
  table,
  keyValueTable,
  progressBar,
  separator,
} from "@dreamer/dweb/console";

// 显示用户列表
const users = [
  { id: 1, name: "Alice", email: "alice@example.com", role: "Admin" },
  { id: 2, name: "Bob", email: "bob@example.com", role: "User" },
  { id: 3, name: "Charlie", email: "charlie@example.com", role: "User" },
];

title("用户列表");
table(users, [
  { header: "ID", width: 5, align: "right" },
  { header: "姓名", width: 15, align: "left" },
  { header: "邮箱", width: 25, align: "left" },
  { header: "角色", width: 10, align: "left" },
]);

separator();

// 显示系统信息
title("系统信息");
keyValueTable({
  "操作系统": Deno.build.os,
  "架构": Deno.build.arch,
  "Deno 版本": Deno.version.deno,
  "V8 版本": Deno.version.v8,
});

separator();

// 显示进度
title("处理进度");
for (let i = 0; i <= 100; i += 10) {
  progressBar(i, 100, 40, "处理中");
  await new Promise((resolve) => setTimeout(resolve, 100));
}
```

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

## 最佳实践

1. **使用合适的输出方法**：根据消息类型选择合适的输出方法（success、error、warning、info）
2. **提供清晰的提示**：在用户输入时提供清晰、友好的提示信息
3. **验证用户输入**：使用内置的验证方法或自定义验证函数确保输入的有效性
4. **显示帮助信息**：为命令提供详细的帮助信息，方便用户使用
5. **处理错误**：妥善处理错误情况，提供有意义的错误消息
6. **使用表格展示数据**：对于结构化数据，使用表格工具提供更好的可读性
7. **使用选项分组**：对于选项较多的命令，使用 `group` 属性对选项进行分组，提高帮助信息的可读性
8. **添加使用示例**：使用 `example()` 方法为命令添加使用示例，帮助用户快速理解命令用法
9. **利用类型转换**：使用 `type` 属性自动转换选项值类型，减少手动类型转换代码
10. **使用命令钩子**：使用 `before()` 和 `after()` 钩子处理命令执行前后的通用逻辑
11. **选项冲突和依赖检测**：使用 `conflicts` 和 `dependsOn` 属性确保选项使用的正确性

## 注意事项

- 在非交互式环境中（如 CI/CD），某些交互式功能可能不可用
- 某些终端可能不支持所有 ANSI 转义序列
- 隐藏输入功能在某些环境中可能回退到普通输入模式
- 交互式菜单需要终端支持原始模式，否则会自动回退到普通选择模式

