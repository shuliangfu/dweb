/**
 * 数学工具函数文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "数学工具 - DWeb 框架文档",
  description:
    "DWeb 框架的数学计算工具函数，提供数学计算辅助功能",
};

export default function MathPage() {
  const quickStartCode = `import { clamp, round, random, sum, percent } from "@dreamer/dweb/utils";

// 限制数值范围
const value = clamp(150, 0, 100); // 100

// 四舍五入
const rounded = round(3.14159, 2); // 3.14

// 随机数
const randomNum = random(1, 10);

// 数组求和
const total = sum([1, 2, 3, 4, 5]);

// 计算百分比
const pct = percent(25, 100); // 25`;

  const clampCode = `import { clamp } from "@dreamer/dweb/utils";

clamp(150, 0, 100); // 100
clamp(-10, 0, 100); // 0
clamp(50, 0, 100); // 50`;

  const roundCode = `import { round, floor, ceil } from "@dreamer/dweb/utils";

// 四舍五入（指定小数位）
round(3.14159, 2); // 3.14
round(3.5); // 4

// 向下取整（指定小数位）
floor(3.14159, 2); // 3.14
floor(3.9, 0); // 3

// 向上取整（指定小数位）
ceil(3.14159, 2); // 3.15
ceil(3.1, 0); // 4`;

  const randomCode = `import { random, randomInt } from "@dreamer/dweb/utils";

// 生成随机浮点数
random(1, 10); // 1 到 10 之间的随机数
random(0, 1); // 0 到 1 之间的随机数
random(); // 0 到 1 之间的随机数

// 生成随机整数
randomInt(1, 10); // 1 到 10 之间的随机整数（包含 1 和 10）
randomInt(0, 100); // 0 到 100 之间的随机整数`;

  const statsCode = `import { sum, average, max, min } from "@dreamer/dweb/utils";

// 求和
sum([1, 2, 3, 4, 5]); // 15
sum([10, 20, 30]); // 60

// 平均值
average([1, 2, 3, 4, 5]); // 3
average([10, 20, 30]); // 20

// 最大值
max([1, 5, 3, 9, 2]); // 9
max([-10, -5, -20]); // -5

// 最小值
min([1, 5, 3, 9, 2]); // 1
min([-10, -5, -20]); // -20`;

  const percentCode = `import { percent } from "@dreamer/dweb/utils";

percent(25, 100); // 25
percent(1, 3); // 33.33
percent(1, 3, 0); // 33（指定小数位为 0）`;

  const lerpCode = `import { lerp } from "@dreamer/dweb/utils";

lerp(0, 100, 0.5); // 50
lerp(10, 20, 0.3); // 13
lerp(0, 100, 0); // 0
lerp(0, 100, 1); // 100`;

  const distanceCode = `import { distance } from "@dreamer/dweb/utils";

distance(0, 0, 3, 4); // 5（勾股定理：3-4-5 三角形）`;

  const inRangeCode = `import { inRange } from "@dreamer/dweb/utils";

inRange(5, 0, 10); // true
inRange(15, 0, 10); // false
inRange(0, 0, 10); // true（包含边界）`;

  const exampleCode = `import {
  clamp,
  round,
  randomInt,
  sum,
  average,
  percent,
  lerp,
  distance,
  inRange,
} from "@dreamer/dweb/utils";

// 限制进度值在 0-100 之间
const progress = clamp(userProgress, 0, 100);

// 格式化金额（保留 2 位小数）
const price = round(99.999, 2); // 100

// 生成随机 ID
const randomId = randomInt(1000, 9999);

// 计算平均分
const scores = [85, 90, 78, 92, 88];
const avgScore = average(scores);

// 计算完成百分比
const completed = 75;
const total = 100;
const completionRate = percent(completed, total);

// 动画插值
const startValue = 0;
const endValue = 100;
const currentValue = lerp(startValue, endValue, 0.5); // 50

// 计算鼠标点击位置到原点的距离
const clickDistance = distance(0, 0, mouseX, mouseY);

// 验证输入范围
if (inRange(userInput, 0, 100)) {
  // 输入有效
}`;

  const apiCode = `// 数值处理
- clamp(value, min, max) - 限制数值范围
- round(value, decimals?) - 四舍五入
- floor(value, decimals?) - 向下取整
- ceil(value, decimals?) - 向上取整

// 随机数生成
- random(min?, max?) - 生成随机浮点数
- randomInt(min?, max?) - 生成随机整数

// 数组统计
- sum(array) - 数组求和
- average(array) - 数组平均值
- max(array) - 数组最大值
- min(array) - 数组最小值

// 百分比和插值
- percent(value, total, decimals?) - 计算百分比
- lerp(start, end, t) - 线性插值

// 距离和范围
- distance(x1, y1, x2, y2) - 计算两点距离
- inRange(value, min, max) - 判断数值是否在范围内`;

  const content = {
    title: "数学工具",
    description:
      "提供数学计算辅助函数。所有函数在服务端和客户端都可用。",
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
        title: "数值处理",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "限制数值范围",
            blocks: [
              {
                type: "text",
                content: "将数值限制在指定的最小值和最大值之间。",
              },
              {
                type: "code",
                code: clampCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "取整函数",
            blocks: [
              {
                type: "code",
                code: roundCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "随机数生成",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "生成随机数",
            blocks: [
              {
                type: "code",
                code: randomCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "数组统计",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "数组统计函数",
            blocks: [
              {
                type: "code",
                code: statsCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "百分比和插值",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "计算百分比",
            blocks: [
              {
                type: "code",
                code: percentCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "线性插值",
            blocks: [
              {
                type: "text",
                content: "在两个值之间进行线性插值。",
              },
              {
                type: "code",
                code: lerpCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "距离计算",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "计算两点距离",
            blocks: [
              {
                type: "text",
                content: "计算二维平面上两点之间的欧几里得距离。",
              },
              {
                type: "code",
                code: distanceCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "范围判断",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "判断数值是否在范围内",
            blocks: [
              {
                type: "code",
                code: inRangeCode,
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
