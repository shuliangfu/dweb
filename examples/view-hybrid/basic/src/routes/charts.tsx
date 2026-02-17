/**
 * Chart.js 图表示例页
 * 路由: /charts
 * 展示 Chart.js 全部内置图表类型：折线图、柱状图、雷达图、环形图、饼图、极地图、气泡图、散点图
 * 使用项目内安装的 npm:chart.js，仅在客户端挂载后初始化图表
 */

import type { VNode } from "@dreamer/view";
/** 静态导入 chart.js/auto，自动注册全部图表类型及组件 */
import Chart from "chart.js/auto";

/** 是否已初始化过图表（避免重复创建） */
let chartsInitialized = false;
/** 是否已调度过初始化（避免多次 setTimeout） */
let chartsScheduled = false;

/** 页面内锚点导航项 */
const NAV_ITEMS = [
  { id: "line", label: "折线图 (Line)" },
  { id: "bar", label: "柱状图 (Bar)" },
  { id: "radar", label: "雷达图 (Radar)" },
  { id: "doughnut", label: "环形图 (Doughnut)" },
  { id: "pie", label: "饼图 (Pie)" },
  { id: "polarArea", label: "极地图 (Polar Area)" },
  { id: "bubble", label: "气泡图 (Bubble)" },
  { id: "scatter", label: "散点图 (Scatter)" },
] as const;

/**
 * 在客户端创建全部 Chart.js 图表示例
 * 仅在存在 document 时执行，使用 globalThis 兼容 Deno 环境
 */
function initCharts(): void {
  const g = globalThis as unknown as { document?: Document };
  if (!g.document || chartsInitialized) return;
  chartsInitialized = true;

  const doc = g.document!;
  const colors = [
    "#667eea",
    "#764ba2",
    "#f093fb",
    "#4facfe",
    "#43e97b",
    "#fa709a",
    "#fee140",
    "#30cfd0",
  ];
  const colorsRgba = colors.map((_, i) => {
    const r = [102, 118, 240, 79, 67, 250, 254, 48][i];
    const gr = [126, 75, 147, 172, 233, 112, 225, 207][i];
    const b = [234, 162, 251, 254, 123, 154, 64, 208][i];
    return `rgba(${r},${gr},${b},0.2)`;
  });
  const colorsRgba5 = [
    "rgba(102,126,234,0.6)",
    "rgba(118,75,162,0.6)",
    "rgba(240,147,251,0.6)",
    "rgba(79,172,254,0.6)",
    "rgba(67,233,123,0.6)",
  ];
  const col = (i: number) => colors[i % colors.length];
  const colRgba = (i: number) => colorsRgba[i % colorsRgba.length];

  const opts = { responsive: true, maintainAspectRatio: false };

  const lineEl = doc.getElementById("chart-line");
  if (lineEl instanceof HTMLCanvasElement) {
    new Chart(lineEl, {
      type: "line",
      data: {
        labels: ["1月", "2月", "3月", "4月", "5月", "6月"],
        datasets: [
          {
            label: "系列 A",
            data: [12, 19, 8, 15, 22, 18],
            borderColor: col(0),
            backgroundColor: colRgba(0),
            fill: true,
            tension: 0.3,
          },
          {
            label: "系列 B",
            data: [2, 9, 14, 11, 6, 12],
            borderColor: col(1),
            backgroundColor: colRgba(1),
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: { ...opts, plugins: { legend: { position: "top" } } },
    });
  }

  const barEl = doc.getElementById("chart-bar");
  if (barEl instanceof HTMLCanvasElement) {
    new Chart(barEl, {
      type: "bar",
      data: {
        labels: ["红", "绿", "蓝", "黄", "紫", "橙"],
        datasets: [{
          label: "数量",
          data: [12, 19, 6, 14, 8, 11],
          backgroundColor: colors.slice(0, 6),
        }],
      },
      options: {
        ...opts,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  const radarEl = doc.getElementById("chart-radar");
  if (radarEl instanceof HTMLCanvasElement) {
    new Chart(radarEl, {
      type: "radar",
      data: {
        labels: ["速度", "力量", "耐力", "技巧", "防御", "敏捷"],
        datasets: [
          {
            label: "角色 A",
            data: [85, 70, 90, 75, 80, 88],
            backgroundColor: colRgba(0),
            borderColor: col(0),
            pointBackgroundColor: col(0),
          },
          {
            label: "角色 B",
            data: [70, 92, 65, 88, 72, 75],
            backgroundColor: colRgba(1),
            borderColor: col(1),
            pointBackgroundColor: col(1),
          },
        ],
      },
      options: { ...opts, plugins: { legend: { position: "top" } } },
    });
  }

  const doughnutEl = doc.getElementById("chart-doughnut");
  if (doughnutEl instanceof HTMLCanvasElement) {
    new Chart(doughnutEl, {
      type: "doughnut",
      data: {
        labels: ["A", "B", "C", "D", "E"],
        datasets: [{
          data: [30, 25, 20, 15, 10],
          backgroundColor: colors.slice(0, 5),
          borderWidth: 2,
        }],
      },
      options: { ...opts, plugins: { legend: { position: "right" } } },
    });
  }

  const pieEl = doc.getElementById("chart-pie");
  if (pieEl instanceof HTMLCanvasElement) {
    new Chart(pieEl, {
      type: "pie",
      data: {
        labels: ["苹果", "香蕉", "橙子", "葡萄", "西瓜"],
        datasets: [{
          data: [35, 25, 20, 12, 8],
          backgroundColor: colors.slice(0, 5),
          borderWidth: 2,
        }],
      },
      options: { ...opts, plugins: { legend: { position: "right" } } },
    });
  }

  const polarEl = doc.getElementById("chart-polarArea");
  if (polarEl instanceof HTMLCanvasElement) {
    new Chart(polarEl, {
      type: "polarArea",
      data: {
        labels: ["北", "东", "南", "西", "中"],
        datasets: [{
          data: [11, 16, 7, 14, 9],
          backgroundColor: colorsRgba5,
          borderWidth: 2,
        }],
      },
      options: { ...opts, plugins: { legend: { position: "right" } } },
    });
  }

  const bubbleEl = doc.getElementById("chart-bubble");
  if (bubbleEl instanceof HTMLCanvasElement) {
    new Chart(bubbleEl, {
      type: "bubble",
      data: {
        datasets: [
          {
            label: "组1",
            data: [{ x: 20, y: 30, r: 15 }, { x: 40, y: 10, r: 10 }, {
              x: 60,
              y: 40,
              r: 20,
            }],
            backgroundColor: "rgba(102,126,234,0.5)",
            borderColor: col(0),
          },
          {
            label: "组2",
            data: [{ x: 35, y: 35, r: 12 }, { x: 50, y: 20, r: 8 }, {
              x: 70,
              y: 25,
              r: 18,
            }],
            backgroundColor: "rgba(118,75,162,0.5)",
            borderColor: col(1),
          },
        ],
      },
      options: {
        ...opts,
        plugins: { legend: { position: "top" } },
        scales: { x: { beginAtZero: true }, y: { beginAtZero: true } },
      },
    });
  }

  const scatterEl = doc.getElementById("chart-scatter");
  if (scatterEl instanceof HTMLCanvasElement) {
    new Chart(scatterEl, {
      type: "scatter",
      data: {
        datasets: [
          {
            label: "系列 1",
            data: [{ x: 10, y: 20 }, { x: 25, y: 35 }, { x: 40, y: 15 }, {
              x: 55,
              y: 45,
            }, { x: 70, y: 28 }],
            backgroundColor: col(0),
            pointRadius: 8,
          },
          {
            label: "系列 2",
            data: [{ x: 15, y: 25 }, { x: 30, y: 20 }, { x: 45, y: 40 }, {
              x: 60,
              y: 18,
            }, { x: 75, y: 38 }],
            backgroundColor: col(1),
            pointRadius: 8,
          },
        ],
      },
      options: {
        ...opts,
        plugins: { legend: { position: "top" } },
        scales: { x: { beginAtZero: true }, y: { beginAtZero: true } },
      },
    });
  }
}

export default function Charts(): VNode {
  // 仅在客户端执行：延迟一帧后初始化图表（确保 canvas 已挂载），使用项目内 npm:chart.js
  const g = globalThis as unknown as { document?: Document };
  if (g.document && !chartsInitialized && !chartsScheduled) {
    chartsScheduled = true;
    setTimeout(initCharts, 0);
  }
  return (
    <div className="py-5">
      {/* 标题区 */}
      <section className="mb-8 rounded-xl bg-linear-to-br from-[#667eea] to-[#764ba2] px-6 py-8 text-center text-white">
        <h1 className="mb-2 text-3xl font-bold">Chart.js 图表示例</h1>
        <p className="text-white/90">
          本页展示 Chart.js 全部内置图表类型，点击下方导航可快速定位到对应图表。
        </p>
      </section>

      {/* 导航：锚点链接到各图表区块 */}
      <nav className="sticky top-16 z-40 mb-8 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-500">图表导航</h2>
        <ul className="flex flex-wrap gap-2 list-none m-0 p-0">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <a
                href={`/charts#${item.id}`}
                className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 no-underline transition-colors hover:bg-[#667eea] hover:text-white"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* 图表容器：每个区块一个标题 + 一个 canvas，由 initCharts 在客户端按 id 初始化 */}
      <div className="space-y-12">
        <section
          id="line"
          className="scroll-mt-24 rounded-lg border border-gray-200 bg-white p-6 shadow-md"
        >
          <h3 className="mb-4 text-xl font-semibold text-[#667eea]">
            折线图 (Line)
          </h3>
          <div className="h-80">
            <canvas id="chart-line" />
          </div>
        </section>

        <section
          id="bar"
          className="scroll-mt-24 rounded-lg border border-gray-200 bg-white p-6 shadow-md"
        >
          <h3 className="mb-4 text-xl font-semibold text-[#667eea]">
            柱状图 (Bar)
          </h3>
          <div className="h-80">
            <canvas id="chart-bar" />
          </div>
        </section>

        <section
          id="radar"
          className="scroll-mt-24 rounded-lg border border-gray-200 bg-white p-6 shadow-md"
        >
          <h3 className="mb-4 text-xl font-semibold text-[#667eea]">
            雷达图 (Radar)
          </h3>
          <div className="h-80">
            <canvas id="chart-radar" />
          </div>
        </section>

        <section
          id="doughnut"
          className="scroll-mt-24 rounded-lg border border-gray-200 bg-white p-6 shadow-md"
        >
          <h3 className="mb-4 text-xl font-semibold text-[#667eea]">
            环形图 (Doughnut)
          </h3>
          <div className="mx-auto h-80 w-full max-w-sm">
            <canvas id="chart-doughnut" />
          </div>
        </section>

        <section
          id="pie"
          className="scroll-mt-24 rounded-lg border border-gray-200 bg-white p-6 shadow-md"
        >
          <h3 className="mb-4 text-xl font-semibold text-[#667eea]">
            饼图 (Pie)
          </h3>
          <div className="mx-auto h-80 w-full max-w-sm">
            <canvas id="chart-pie" />
          </div>
        </section>

        <section
          id="polarArea"
          className="scroll-mt-24 rounded-lg border border-gray-200 bg-white p-6 shadow-md"
        >
          <h3 className="mb-4 text-xl font-semibold text-[#667eea]">
            极地图 (Polar Area)
          </h3>
          <div className="mx-auto h-80 w-full max-w-sm">
            <canvas id="chart-polarArea" />
          </div>
        </section>

        <section
          id="bubble"
          className="scroll-mt-24 rounded-lg border border-gray-200 bg-white p-6 shadow-md"
        >
          <h3 className="mb-4 text-xl font-semibold text-[#667eea]">
            气泡图 (Bubble)
          </h3>
          <div className="h-80">
            <canvas id="chart-bubble" />
          </div>
        </section>

        <section
          id="scatter"
          className="scroll-mt-24 rounded-lg border border-gray-200 bg-white p-6 shadow-md"
        >
          <h3 className="mb-4 text-xl font-semibold text-[#667eea]">
            散点图 (Scatter)
          </h3>
          <div className="h-80">
            <canvas id="chart-scatter" />
          </div>
        </section>
      </div>
    </div>
  );
}
