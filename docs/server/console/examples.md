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
