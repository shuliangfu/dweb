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

## 文档导航

### 核心模块

- [ANSI 颜色和格式化工具](./ansi.md) - 颜色、样式、光标控制
- [命令行输出工具](./output.md) - 消息输出、格式化输出
- [命令行命令封装类](./command.md) - Command 类、选项、参数、子命令
- [命令行输入工具](./prompt.md) - 用户输入、确认、选择、交互式菜单
- [表格输出工具](./table.md) - 表格、键值对表格、进度条

### 其他

- [完整示例](./examples.md) - 实际使用示例
- [API 参考](./api.md) - 完整 API 文档
- [最佳实践](./best-practices.md) - 使用建议和注意事项

## 相关文档

- [核心模块](../core.md) - 框架核心功能
- [扩展系统](../extensions/README.md) - 扩展系统
- [中间件](../middleware/README.md) - 中间件系统
- [插件](../plugins/README.md) - 插件系统

