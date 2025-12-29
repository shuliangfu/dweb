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
