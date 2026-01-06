/**
 * 格式化工具函数文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "格式化函数 - DWeb 框架文档",
  description:
    "DWeb 框架的格式化工具函数，提供常用的数据格式化功能，包括数字、日期、文本等格式化",
};

export default function FormatPage() {
  const quickStartCode = `import {
  formatNumber,
  formatCurrency,
  formatFileSize,
  formatDate,
  formatRelativeTime,
  formatPercent,
} from "@dreamer/dweb/utils/format";

// 格式化数字
formatNumber(1234567.89, 2); // "1,234,567.89"

// 格式化货币
formatCurrency(1234.56); // "¥1,234.56"

// 格式化文件大小
formatFileSize(1024); // "1 KB"

// 格式化日期
formatDate(new Date(), "YYYY-MM-DD"); // "2024-01-15"

// 格式化相对时间
formatRelativeTime(new Date(Date.now() - 3600000)); // "1小时前"`;

  const numberCode = `import { formatNumber } from "@dreamer/dweb/utils/format";

formatNumber(1234567); // "1,234,567"
formatNumber(1234.567, 2); // "1,234.57"
formatNumber(999.99, 2); // "999.99"`;

  const currencyCode =
    `import { formatCurrency } from "@dreamer/dweb/utils/format";

formatCurrency(1234.56); // "¥1,234.56"
formatCurrency(1234.56, '$', 2); // "$1,234.56"
formatCurrency(999.99, '€', 0); // "€1,000"`;

  const fileSizeCode =
    `import { formatFileSize } from "@dreamer/dweb/utils/format";

formatFileSize(1024); // "1 KB"
formatFileSize(1048576); // "1 MB"
formatFileSize(1073741824); // "1 GB"
formatFileSize(0); // "0 Bytes"`;

  const dateCode = `import { formatDate } from "@dreamer/dweb/utils/format";

const date = new Date('2024-01-15 14:30:45');

// 基础格式
formatDate(date, 'YYYY-MM-DD'); // "2024-01-15"
formatDate(date, 'YYYY-MM-DD HH:mm:ss'); // "2024-01-15 14:30:45"

// 中文格式
formatDate(date, 'YYYY年MM月DD日'); // "2024年01月15日"
formatDate(date, 'YYYY年MMM'); // "2024年1月"
formatDate(date, 'YYYY-MM-DD dddd'); // "2024-01-15 星期一"

// 12小时制
formatDate(date, 'hh:mm:ss A'); // "02:30:45 PM"
formatDate(date, 'YYYY-MM-DD hh:mm a'); // "2024-01-15 02:30 pm"

// 包含毫秒
formatDate(date, 'YYYY-MM-DD HH:mm:ss.SSS'); // "2024-01-15 14:30:45.000"

// 季度
formatDate(date, 'YYYY年Q季度'); // "2024年Q1季度"`;

  const dateFormatOptionsCode = `支持的格式选项：

- **年份：** \`YYYY\`（4位）、\`YY\`（2位）
- **月份：** \`MM\`（2位）、\`M\`（1-2位）、\`MMM\`（中文简写，如：1月）、\`MMMM\`（中文完整，如：一月）
- **日期：** \`DD\`（2位）、\`D\`（1-2位）
- **小时：** \`HH\`/\`H\`（24小时制）、\`hh\`/\`h\`（12小时制）
- **分钟：** \`mm\`/\`m\`
- **秒数：** \`ss\`/\`s\`
- **毫秒：** \`SSS\`
- **上午/下午：** \`A\`（AM/PM）、\`a\`（am/pm）
- **星期几：** \`ddd\`（简写，如：周一）、\`dddd\`（完整，如：星期一）
- **季度：** \`Q\`（如：Q1）`;

  const relativeTimeCode =
    `import { formatRelativeTime } from "@dreamer/dweb/utils/format";

const oneHourAgo = new Date(Date.now() - 3600000);
formatRelativeTime(oneHourAgo); // "1小时前"

const tomorrow = new Date(Date.now() + 86400000);
formatRelativeTime(tomorrow); // "1天后"

const oneMinuteAgo = new Date(Date.now() - 60000);
formatRelativeTime(oneMinuteAgo); // "1分钟前"`;

  const percentCode =
    `import { formatPercent } from "@dreamer/dweb/utils/format";

formatPercent(25, 100); // "25.00%"
formatPercent(1, 3); // "33.33%"
formatPercent(1, 3, 0); // "33%"
formatPercent(0, 0); // "0%"（避免除零错误）`;

  const phoneCode = `import { formatPhone } from "@dreamer/dweb/utils/format";

formatPhone('13812345678'); // "138****5678"
formatPhone('13900139000'); // "139****9000"
formatPhone('123'); // "123"（长度不符合，返回原值）`;

  const idCardCode = `import { formatIdCard } from "@dreamer/dweb/utils/format";

formatIdCard('110101199001011234'); // "110***********1234"
formatIdCard('123'); // "123"（长度不符合，返回原值）`;

  const bankCardCode =
    `import { formatBankCard } from "@dreamer/dweb/utils/format";

formatBankCard('6222021234567890123'); // "6222 **** **** 0123"
formatBankCard('6222 0212 3456 7890 123'); // "6222 **** **** 0123"（自动去除空格）
formatBankCard('123'); // "123"（长度不符合，返回原值）`;

  const textCode = `import { formatText } from "@dreamer/dweb/utils/format";

formatText('这是一段很长的文本', 5); // "这是一段很..."
formatText('短文本', 10); // "短文本"（不截断）
formatText('Hello World', 5, '...'); // "Hello..."
formatText('测试文本', 3, '…'); // "测试文…"（自定义后缀）`;

  const exampleCode = `import {
  formatNumber,
  formatCurrency,
  formatFileSize,
  formatDate,
  formatRelativeTime,
  formatPercent,
  formatPhone,
  formatText,
} from "@dreamer/dweb/utils/format";

// 商品价格显示
const price = 1234.56;
const formattedPrice = formatCurrency(price); // "¥1,234.56"

// 文件大小显示
const fileSize = 1048576;
const formattedSize = formatFileSize(fileSize); // "1 MB"

// 日期显示
const now = new Date();
const dateStr = formatDate(now, 'YYYY-MM-DD HH:mm:ss'); // "2024-01-15 14:30:45"
const relativeTime = formatRelativeTime(oneHourAgo); // "1小时前"

// 进度显示
const completed = 75;
const total = 100;
const progress = formatPercent(completed, total); // "75.00%"

// 用户信息脱敏
const phone = '13812345678';
const maskedPhone = formatPhone(phone); // "138****5678"

// 文本截断
const longText = '这是一段很长的文本内容';
const shortText = formatText(longText, 10); // "这是一段很长的文本..."`;

  const apiCode = `// 数字格式化
- formatNumber(num, decimals?) - 格式化数字（添加千分位）
- formatCurrency(amount, currency?, decimals?) - 格式化货币
- formatFileSize(bytes, decimals?) - 格式化文件大小

// 日期格式化
- formatDate(date, pattern?) - 格式化日期
- formatRelativeTime(date) - 格式化相对时间

// 百分比格式化
- formatPercent(value, total, decimals?) - 格式化百分比

// 敏感信息脱敏
- formatPhone(phone) - 格式化手机号
- formatIdCard(idCard) - 格式化身份证号
- formatBankCard(cardNumber) - 格式化银行卡号

// 文本格式化
- formatText(text, maxLength, suffix?) - 格式化文本（截断）`;

  const content = {
    title: "格式化函数",
    description:
      "提供常用的数据格式化函数，包括数字、日期、文本等格式化。所有函数在服务端和客户端都可用。",
    sections: [
      {
        title: "快速开始",
        blocks: [
          {
            type: "code",
            code: quickStartCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "数字格式化",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "格式化数字（添加千分位）",
            blocks: [
              {
                type: "text",
                content: "将数字格式化为带千分位分隔符的字符串。",
              },
              {
                type: "code",
                code: numberCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "格式化货币",
            blocks: [
              {
                type: "text",
                content: "将金额格式化为货币格式，包含货币符号和千分位。",
              },
              {
                type: "code",
                code: currencyCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "格式化文件大小",
            blocks: [
              {
                type: "text",
                content:
                  "将字节数格式化为可读的文件大小（Bytes, KB, MB, GB 等）。",
              },
              {
                type: "code",
                code: fileSizeCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "日期格式化",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "格式化日期",
            blocks: [
              {
                type: "text",
                content: "将日期格式化为指定格式的字符串，支持丰富的格式选项。",
              },
              {
                type: "code",
                code: dateCode,
                language: "typescript",
              },
              {
                type: "text",
                content: dateFormatOptionsCode,
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "格式化相对时间",
            blocks: [
              {
                type: "text",
                content:
                  "将日期格式化为相对时间字符串（如：2小时前、3天前等）。",
              },
              {
                type: "code",
                code: relativeTimeCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "百分比格式化",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "格式化百分比",
            blocks: [
              {
                type: "text",
                content: "计算并格式化百分比值。",
              },
              {
                type: "code",
                code: percentCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "敏感信息脱敏",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "格式化手机号",
            blocks: [
              {
                type: "text",
                content: "将手机号格式化为脱敏格式，隐藏中间4位数字。",
              },
              {
                type: "code",
                code: phoneCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "格式化身份证号",
            blocks: [
              {
                type: "text",
                content: "将身份证号格式化为脱敏格式，隐藏中间11位。",
              },
              {
                type: "code",
                code: idCardCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "格式化银行卡号",
            blocks: [
              {
                type: "text",
                content: "将银行卡号格式化为脱敏格式，只显示前后各4位。",
              },
              {
                type: "code",
                code: bankCardCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "文本格式化",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "格式化文本（截断）",
            blocks: [
              {
                type: "text",
                content: "如果文本超过指定长度，则截断并添加省略号。",
              },
              {
                type: "code",
                code: textCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "完整示例",
        blocks: [
          {
            type: "code",
            code: exampleCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "API 参考",
        blocks: [
          {
            type: "code",
            code: apiCode,
            language: "typescript",
          },
        ],
      },
    ],
  };

  return (
    <DocRenderer
      content={content as Parameters<typeof DocRenderer>[0]["content"]}
    />
  );
}
