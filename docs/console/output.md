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
