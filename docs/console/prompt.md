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
