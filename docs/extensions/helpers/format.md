### 格式化函数

提供常用的数据格式化函数。

```typescript
import {
  formatNumber,
  formatCurrency,
  formatFileSize,
  formatDate,
  formatRelativeTime,
  formatPercent,
  formatPhone,
  formatIdCard,
  formatBankCard,
  formatText,
} from "@dreamer/dweb/extensions";

// 格式化数字（添加千分位）
formatNumber(1234567.89, 2); // "1,234,567.89"

// 格式化货币
formatCurrency(1234.56); // "¥1,234.56"
formatCurrency(1234.56, '$', 2); // "$1,234.56"

// 格式化文件大小
formatFileSize(1024); // "1 KB"
formatFileSize(1048576); // "1 MB"

// 格式化日期
formatDate(new Date(), "YYYY-MM-DD"); // "2024-01-15"

// 格式化相对时间
formatRelativeTime(new Date(Date.now() - 3600000)); // "1小时前"

// 格式化百分比
formatPercent(75, 100); // "75.00%"

// 格式化手机号（隐藏中间4位）
formatPhone("13800138000"); // "138****8000"

// 格式化身份证号（隐藏中间部分）
formatIdCard("110101199001011234"); // "110***********1234"

// 格式化银行卡号（隐藏中间部分）
formatBankCard("6222021234567890123"); // "6222 **** **** 0123"

// 格式化文本（截断）
formatText("Hello World", 5); // "Hello..."
```
