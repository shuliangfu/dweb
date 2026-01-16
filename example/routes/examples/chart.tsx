/**
 * 曲线图示例页面
 * 演示如何使用 Chart 组件绘制各种类型的图表
 */

import { useState } from "preact/hooks";
import Chart from "@components/Chart.tsx";
import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "曲线图示例 - DWeb 框架使用示例",
  description: "使用 Chart.js 绘制各种类型的图表，包括折线图、柱状图、饼图等",
  keywords: "DWeb, 示例, 曲线图, Chart.js, 图表, 数据可视化",
  author: "DWeb",
};

export const renderMode = "csr";

/**
 * 曲线图示例页面组件
 * @param props 页面属性
 * @returns JSX 元素
 */
export default function ChartPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const [chartType, setChartType] = useState<"line" | "bar" | "pie">("line");

  // 折线图数据
  const lineChartData = {
    labels: ["1月", "2月", "3月", "4月", "5月", "6月"],
    datasets: [
      {
        label: "销售额",
        data: [120, 190, 300, 500, 200, 300],
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "利润",
        data: [80, 120, 200, 350, 150, 250],
        borderColor: "rgb(16, 185, 129)",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // 柱状图数据
  const barChartData = {
    labels: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
    datasets: [
      {
        label: "访问量",
        data: [65, 59, 80, 81, 56, 55, 40],
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(251, 191, 36, 0.8)",
          "rgba(239, 68, 68, 0.8)",
          "rgba(139, 92, 246, 0.8)",
          "rgba(236, 72, 153, 0.8)",
          "rgba(20, 184, 166, 0.8)",
        ],
        borderColor: [
          "rgb(59, 130, 246)",
          "rgb(16, 185, 129)",
          "rgb(251, 191, 36)",
          "rgb(239, 68, 68)",
          "rgb(139, 92, 246)",
          "rgb(236, 72, 153)",
          "rgb(20, 184, 166)",
        ],
        borderWidth: 1,
      },
    ],
  };

  // 饼图数据
  const pieChartData = {
    labels: ["产品A", "产品B", "产品C", "产品D", "产品E"],
    datasets: [
      {
        label: "销售占比",
        data: [300, 200, 150, 100, 50],
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(251, 191, 36, 0.8)",
          "rgba(239, 68, 68, 0.8)",
          "rgba(139, 92, 246, 0.8)",
        ],
        borderColor: [
          "rgb(59, 130, 246)",
          "rgb(16, 185, 129)",
          "rgb(251, 191, 36)",
          "rgb(239, 68, 68)",
          "rgb(139, 92, 246)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartCode = `import Chart from '@components/Chart.tsx';

// 折线图示例
<Chart
  type="line"
  config={{
    data: {
      labels: ['1月', '2月', '3月', '4月', '5月', '6月'],
      datasets: [{
        label: '销售额',
        data: [120, 190, 300, 500, 200, 300],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        title: {
          display: true,
          text: '月度销售额趋势'
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  }}
/>

// 柱状图示例
<Chart
  type="bar"
  config={{
    data: {
      labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      datasets: [{
        label: '访问量',
        data: [65, 59, 80, 81, 56, 55, 40],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  }}
/>

// 饼图示例
<Chart
  type="pie"
  config={{
    data: {
      labels: ['产品A', '产品B', '产品C', '产品D', '产品E'],
      datasets: [{
        label: '销售占比',
        data: [300, 200, 150, 100, 50],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)'
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: 'right'
        }
      }
    }
  }}
/>`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          曲线图示例
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          使用{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100 font-mono text-sm">
            Chart
          </code>{" "}
          组件绘制各种类型的图表，支持服务端渲染和客户端渲染。
          <br />
          <span className="text-sm text-gray-500 dark:text-gray-400 mt-2 block">
            支持多种图表类型：折线图、柱状图、饼图、环形图、雷达图等
          </span>
        </p>
      </div>

      {/* 图表类型切换 */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            选择图表类型：
          </h3>
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setChartType("line")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                chartType === "line"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              折线图
            </button>
            <button
              type="button"
              onClick={() => setChartType("bar")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                chartType === "bar"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              柱状图
            </button>
            <button
              type="button"
              onClick={() => setChartType("pie")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                chartType === "pie"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              饼图
            </button>
          </div>
        </div>
      </div>

      {/* 图表展示 */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          {chartType === "line" && "折线图 - 月度销售趋势"}
          {chartType === "bar" && "柱状图 - 周访问量统计"}
          {chartType === "pie" && "饼图 - 产品销售占比"}
        </h3>
        <div className="h-96">
          <Chart
            type={chartType}
            config={{
              data: chartType === "line"
                ? lineChartData
                : chartType === "bar"
                ? barChartData
                : pieChartData,
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: true,
                    position: "top",
                  },
                  title: {
                    display: true,
                    text: chartType === "line"
                      ? "月度销售额趋势"
                      : chartType === "bar"
                      ? "周访问量统计"
                      : "产品销售占比",
                    font: {
                      size: 18,
                      weight: "bold",
                    },
                  },
                },
                scales: chartType === "pie" ? undefined : {
                  y: {
                    beginAtZero: true,
                  },
                },
              },
            }}
            className="w-full h-full"
          />
        </div>
      </div>

      {/* 代码示例 */}
      <CodeBlock
        code={chartCode}
        language="typescript"
        title="Chart 组件使用示例"
      />
    </div>
  );
}
