/**
 * 数组工具函数文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "数组工具 - DWeb 框架文档",
  description:
    "DWeb 框架的数组操作工具函数，提供数组分块、去重、分组、排序等功能",
};

export default function ArrayPage() {
  const quickStartCode = `import { chunk, unique, groupBy, intersection } from "@dreamer/dweb/utils";

// 数组分块
const chunks = chunk([1, 2, 3, 4, 5], 2);

// 数组去重
const uniqueItems = unique([1, 2, 2, 3, 3, 3]);

// 按条件分组
const grouped = groupBy(users, 'role');

// 数组交集
const common = intersection([1, 2, 3], [2, 3, 4]);`;

  const chunkCode = `import { chunk } from "@dreamer/dweb/utils";

chunk([1, 2, 3, 4, 5], 2);
// [[1, 2], [3, 4], [5]]`;

  const flattenCode = `import { flatten } from "@dreamer/dweb/utils";

flatten([1, [2, 3], [4, [5, 6]]]);
// [1, 2, 3, 4, 5, 6]

flatten([1, [2, [3, [4]]]], 2);
// [1, 2, 3, [4]]（只扁平化两层）`;

  const uniqueCode = `import { unique } from "@dreamer/dweb/utils";

unique([1, 2, 2, 3, 3, 3]);
// [1, 2, 3]

unique(['a', 'b', 'a', 'c']);
// ['a', 'b', 'c']`;

  const groupByCode = `import { groupBy } from "@dreamer/dweb/utils";

const users = [
  { id: 1, role: 'admin', name: 'Alice' },
  { id: 2, role: 'user', name: 'Bob' },
  { id: 3, role: 'admin', name: 'Charlie' },
];

// 按键分组
groupBy(users, 'role');
// { admin: [{ id: 1, ... }, { id: 3, ... }], user: [{ id: 2, ... }] }

// 按函数分组
groupBy(users, (user) => user.name.length);
// { 5: [{ id: 1, ... }, { id: 2, ... }], 7: [{ id: 3, ... }] }`;

  const sortByCode = `import { sortBy } from "@dreamer/dweb/utils";

const users = [
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 25 },
  { id: 3, name: 'Charlie', age: 35 },
];

// 按键排序（升序）
sortBy(users, 'age');
// 按年龄升序排序

// 按函数排序（降序）
sortBy(users, (user) => user.name.length, 'desc');
// 按名字长度降序排序`;

  const shuffleCode = `import { shuffle } from "@dreamer/dweb/utils";

shuffle([1, 2, 3, 4, 5]);
// [3, 1, 5, 2, 4]（随机顺序）`;

  const sampleCode = `import { sample } from "@dreamer/dweb/utils";

sample([1, 2, 3, 4, 5], 3);
// [2, 5, 1]（随机选择 3 个元素）`;

  const partitionCode = `import { partition } from "@dreamer/dweb/utils";

partition([1, 2, 3, 4, 5], (n) => n % 2 === 0);
// [[2, 4], [1, 3, 5]]`;

  const zipCode = `import { zip, unzip } from "@dreamer/dweb/utils";

// 数组压缩
zip([1, 2, 3], ['a', 'b', 'c']);
// [[1, 'a'], [2, 'b'], [3, 'c']]

// 数组解压
unzip([[1, 'a'], [2, 'b'], [3, 'c']]);
// [[1, 2, 3], ['a', 'b', 'c']]`;

  const intersectionCode = `import { intersection, union, difference } from "@dreamer/dweb/utils";

// 数组交集
intersection([1, 2, 3], [2, 3, 4], [3, 4, 5]);
// [3]

// 数组并集
union([1, 2, 3], [2, 3, 4], [3, 4, 5]);
// [1, 2, 3, 4, 5]

// 数组差集
difference([1, 2, 3, 4], [2, 3], [3, 4]);
// [1]`;

  const exampleCode = `import {
  chunk,
  groupBy,
  sortBy,
  intersection,
  union,
  sum,
  average,
} from "@dreamer/dweb/utils";

// 分页处理
const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const pages = chunk(items, 3);
// [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]

// 用户分组
const users = [
  { id: 1, role: 'admin', age: 30 },
  { id: 2, role: 'user', age: 25 },
  { id: 3, role: 'admin', age: 35 },
];
const grouped = groupBy(users, 'role');
const sorted = sortBy(users, 'age', 'desc');

// 集合操作
const commonTags = intersection(tags1, tags2, tags3);
const allTags = union(tags1, tags2, tags3);

// 统计（sum 和 average 现在位于 math.ts 中）
const total = sum(scores);
const avg = average(scores);`;

  const apiCode = `// 基础操作
- chunk<T>(array, size) - 数组分块
- flatten<T>(array, depth?) - 数组扁平化
- unique<T>(array) - 数组去重

// 分组和排序
- groupBy<T>(array, keyOrFn) - 按条件分组
- sortBy<T>(array, keyOrFn, order?) - 按条件排序

// 随机操作
- shuffle<T>(array) - 数组洗牌
- sample<T>(array, count) - 随机采样

// 数组分割
- partition<T>(array, predicate) - 数组分割

// 数组压缩
- zip<T>(...arrays) - 数组压缩
- unzip<T>(array) - 数组解压

// 集合操作
- intersection<T>(...arrays) - 数组交集
- union<T>(...arrays) - 数组并集
- difference<T>(array, ...arrays) - 数组差集

// 统计函数（已移至 math.ts）
- sum, average, max, min`;

  const content = {
    title: "数组工具",
    description:
      "提供数组操作的补充工具函数（与 builtin/array.ts 的扩展方法互补）。所有函数在服务端和客户端都可用。",
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
        title: "数组操作",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "数组分块",
            blocks: [
              {
                type: "text",
                content: "将数组分割成指定大小的块。",
              },
              {
                type: "code",
                code: chunkCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "数组扁平化",
            blocks: [
              {
                type: "text",
                content: "将嵌套数组扁平化为一维数组。",
              },
              {
                type: "code",
                code: flattenCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "数组去重",
            blocks: [
              {
                type: "text",
                content: "去除数组中的重复元素。",
              },
              {
                type: "code",
                code: uniqueCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "数组分组和排序",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "按条件分组",
            blocks: [
              {
                type: "text",
                content: "根据指定的键或函数对数组进行分组。",
              },
              {
                type: "code",
                code: groupByCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "按条件排序",
            blocks: [
              {
                type: "text",
                content: "根据指定的键或函数对数组进行排序。",
              },
              {
                type: "code",
                code: sortByCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "数组随机操作",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "数组洗牌",
            blocks: [
              {
                type: "text",
                content: "随机打乱数组元素的顺序。",
              },
              {
                type: "code",
                code: shuffleCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "随机采样",
            blocks: [
              {
                type: "text",
                content: "从数组中随机选择指定数量的元素。",
              },
              {
                type: "code",
                code: sampleCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "数组分割",
        blocks: [
          {
            type: "text",
            content: "将数组分割为满足条件和不满足条件的两部分。",
          },
          {
            type: "code",
            code: partitionCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "数组压缩和解压",
        blocks: [
          {
            type: "code",
            code: zipCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "集合操作",
        blocks: [
          {
            type: "code",
            code: intersectionCode,
            language: "typescript",
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
          {
            type: "alert",
            level: "info",
            content:
              "**注意：** `sum`, `average`, `max`, `min` 函数已移至 [数学工具](./math) 模块。这些函数在 `math.ts` 中提供相同的功能。",
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
