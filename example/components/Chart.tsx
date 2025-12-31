/**
 * @file Chart.tsx
 * @description 图表组件 - 支持服务端渲染和客户端渲染
 * 
 * 这个组件解决了 Chart.js 在 SSR 中的问题：
 * 1. 服务端渲染时：渲染一个占位符（空的 canvas 元素）
 * 2. 客户端 hydration 时：使用 useEffect 在组件挂载后初始化图表
 * 3. 避免服务端和客户端渲染不一致的问题
 */

import { useEffect, useRef } from "preact/hooks";
import type { ComponentChildren } from "preact";
import Chart from "chart/auto";
// Chart.js 类型定义（从 chart.js 包中导入）
// 注意：chart/auto 会自动注册所有图表类型
type ChartType = "line" | "bar" | "pie" | "doughnut" | "polarArea" | "radar" | "scatter" | "bubble";
interface ChartConfiguration {
  type?: ChartType;
  data?: {
    labels?: string[];
    datasets?: Array<{
      label?: string;
      data?: number[];
      borderColor?: string;
      backgroundColor?: string | string[];
      fill?: boolean;
      tension?: number;
      [key: string]: unknown;
    }>;
  };
  options?: {
    responsive?: boolean;
    maintainAspectRatio?: boolean;
    plugins?: {
      title?: {
        display?: boolean;
        text?: string;
        font?: {
          size?: number;
          weight?: string;
        };
      };
      legend?: {
        display?: boolean;
        position?: "top" | "bottom" | "left" | "right";
      };
      tooltip?: {
        enabled?: boolean;
      };
      [key: string]: unknown;
    };
    scales?: {
      y?: {
        beginAtZero?: boolean;
        max?: number;
        ticks?: {
          stepSize?: number;
        };
      };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * 图表组件属性
 */
export interface ChartProps {
  /** 图表类型（line, bar, pie 等） */
  type: ChartType;
  /** 图表配置 */
  config: Omit<ChartConfiguration, "type">;
  /** 图表容器的 className */
  className?: string;
  /** 图表容器的 style */
  style?: string | Record<string, string>;
  /** 加载状态时显示的内容 */
  loading?: ComponentChildren;
  /** 图表 ID（可选，不提供时自动生成） */
  id?: string;
}

/**
 * 图表组件
 * 
 * 使用示例：
 * ```tsx
 * <Chart
 *   type="line"
 *   config={{
 *     data: {
 *       labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
 *       datasets: [{
 *         label: 'This Week',
 *         data: [120, 130, 100, 135, 90, 230, 210],
 *         borderColor: 'rgb(59, 130, 246)',
 *         backgroundColor: 'rgba(59, 130, 246, 0.1)',
 *       }]
 *     },
 *     options: {
 *       responsive: true,
 *       plugins: {
 *         legend: { display: true }
 *       }
 *     }
 *   }}
 * />
 * ```
 */
export default function ChartComponent({
  type,
  config,
  className = "",
  style,
  loading,
  id,
}: ChartProps) {
  // 使用 ref 保存 canvas 元素的引用
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 使用 ref 保存 Chart 实例，以便在组件卸载时销毁
  const chartInstanceRef = useRef<Chart | null>(null);
  // 生成唯一的图表 ID
  const chartId = id || `chart-${Math.random().toString(36).substring(2, 9)}`;

  // 在客户端挂载后初始化图表
  useEffect(() => {
    // 检查是否在浏览器环境中
    if (typeof globalThis === "undefined" || !globalThis.window) {
      return;
    }

    // 检查 canvas 元素是否存在
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn("[Chart] Canvas 元素未找到");
      return;
    }

    // 如果已经存在图表实例，先销毁它（避免重复创建）
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    try {
      // 创建新的图表实例
      const chart = new Chart(canvas, {
        type,
        ...config,
      });

      // 保存图表实例
      chartInstanceRef.current = chart;
    } catch (error) {
      console.error("[Chart] 图表初始化失败:", error);
    }

    // 清理函数：组件卸载时销毁图表实例
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [type, config]); // 当 type 或 config 变化时重新创建图表

  // 处理 style 属性（支持字符串或对象）
  const styleAttr = typeof style === "string"
    ? style
    : style
    ? Object.entries(style)
        .map(([key, value]) => `${key}: ${value}`)
        .join("; ")
    : "";

  return (
    <div className={`chart-container ${className}`} style={styleAttr}>
      {/* 加载状态（仅在客户端 hydration 前显示） */}
      {loading && typeof globalThis !== "undefined" && globalThis.window && (
        <div className="chart-loading">{loading}</div>
      )}
      
      {/* Canvas 元素 - 服务端和客户端都会渲染这个元素 */}
      <canvas
        ref={canvasRef}
        id={chartId}
        className="chart-canvas"
        style="display: block; max-width: 100%; height: auto;"
      />
    </div>
  );
}
