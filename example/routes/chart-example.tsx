/**
 * @file chart-example.tsx
 * @description 图表示例页面 - 演示如何在 SSR 中使用 Chart.js
 * 
 * 这个示例展示了：
 * 1. 如何在服务端渲染时处理图表（渲染占位符）
 * 2. 如何在客户端 hydration 时初始化图表
 * 3. 如何避免服务端和客户端渲染不一致的问题
 */

import Chart from "../components/Chart.tsx";
import type { PageProps } from "@dreamer/dweb";

/**
 * 图表示例页面
 */
export default function ChartExamplePage({ data }: PageProps) {
  // 趋势图表数据（对应图片中的图表）
  const trendsData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "This Week",
        data: [120, 130, 100, 135, 90, 230, 210],
        borderColor: "rgb(59, 130, 246)", // blue-500
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "Last Week",
        data: [220, 185, 195, 235, 290, 325, 305],
        borderColor: "rgb(34, 197, 94)", // green-500
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // 图表配置
  const trendsConfig = {
    data: trendsData,
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        title: {
          display: true,
          text: "Trends",
          font: {
            size: 18,
            weight: "bold",
          },
        },
        legend: {
          display: true,
          position: "top" as const,
        },
        tooltip: {
          enabled: true,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 350,
          ticks: {
            stepSize: 50,
          },
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            图表示例
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            演示如何在 SSR 中使用 Chart.js 渲染图表
          </p>
        </div>

        {/* 图表容器 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            趋势图表
          </h2>
          <div className="h-96">
            <Chart
              type="line"
              config={trendsConfig}
              className="w-full h-full"
            />
          </div>
        </div>

        {/* 说明文档 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            实现说明
          </h2>
          <div className="prose dark:prose-invert max-w-none">
            <h3>问题分析</h3>
            <ul>
              <li>
                <strong>Chart.js 需要浏览器环境：</strong>
                Chart.js 依赖 <code>window</code>、<code>document</code> 和
                Canvas API，这些在服务端不可用
              </li>
              <li>
                <strong>SSR 只能生成静态 HTML：</strong>
                服务端无法执行 JavaScript 或创建 Canvas 元素
              </li>
              <li>
                <strong>Hydration 不匹配：</strong>
                如果服务端和客户端渲染的内容不一致，会导致 hydration 错误
              </li>
            </ul>

            <h3>解决方案</h3>
            <ol>
              <li>
                <strong>服务端渲染占位符：</strong>
                在 SSR 时渲染一个空的 <code>&lt;canvas&gt;</code> 元素
              </li>
              <li>
                <strong>客户端初始化图表：</strong>
                使用 <code>useEffect</code> 在组件挂载后初始化图表
              </li>
              <li>
                <strong>避免重复创建：</strong>
                使用 <code>useRef</code> 保存图表实例，在组件卸载时销毁
              </li>
            </ol>

            <h3>使用方式</h3>
            <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded">
              <code>{`import Chart from "../components/Chart.tsx";

<Chart
  type="line"
  config={{
    data: {
      labels: ['Mon', 'Tue', 'Wed'],
      datasets: [{
        label: 'Data',
        data: [1, 2, 3]
      }]
    },
    options: {
      responsive: true
    }
  }}
/>`}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
