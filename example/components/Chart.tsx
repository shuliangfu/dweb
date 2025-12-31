/**
 * @file Chart.tsx
 * @description 图表组件 - 支持服务端渲染和客户端渲染
 * 
 * 这个组件解决了 Chart.js 在 SSR 中的问题：
 * 1. 服务端渲染时：渲染一个占位符（空的 canvas 元素）
 * 2. 客户端 hydration 时：使用 useEffect 在组件挂载后初始化图表
 * 3. 避免服务端和客户端渲染不一致的问题
 */

import { useEffect, useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import Chart from "chart/auto";
import { getThemeStore } from "@dreamer/dweb/client";
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
  // 获取当前主题
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // 获取主题并订阅主题变化
  useEffect(() => {
    if (typeof globalThis === "undefined" || !globalThis.window) {
      return;
    }

    // 获取初始主题
    const themeStore = getThemeStore();
    if (themeStore) {
      const currentTheme = themeStore.value || "light";
      setTheme(currentTheme);

      // 订阅主题变化
      const unsubscribe = themeStore.$subscribe((state: unknown) => {
        if (state && typeof state === "object" && "value" in state) {
          const themeValue = (state as { value: "light" | "dark" }).value;
          setTheme(themeValue);
        }
      });

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }
  }, []);

  // 根据主题获取文字颜色
  const getTextColor = () => {
    return theme === "dark" ? "#e5e7eb" : "#374151"; // gray-200 : gray-700
  };

  // 根据主题获取网格线颜色
  const getGridColor = () => {
    return theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";
  };

  // 合并配置，添加主题相关的颜色
  const getMergedConfig = (): ChartConfiguration => {
    const textColor = getTextColor();
    const gridColor = getGridColor();
    const baseOptions = (config.options || {}) as Record<string, unknown>;

    // 使用类型断言来简化配置合并
    const mergedConfig: ChartConfiguration = {
      ...config,
      options: {
        ...baseOptions,
        color: textColor,
        plugins: {
          ...(baseOptions.plugins as Record<string, unknown> || {}),
          title: baseOptions.plugins && typeof baseOptions.plugins === "object" && "title" in baseOptions.plugins
            ? {
              ...(baseOptions.plugins.title as Record<string, unknown>),
              color: textColor,
            }
            : undefined,
          legend: baseOptions.plugins && typeof baseOptions.plugins === "object" && "legend" in baseOptions.plugins
            ? {
              ...(baseOptions.plugins.legend as Record<string, unknown>),
              labels: {
                ...(baseOptions.plugins.legend && typeof baseOptions.plugins.legend === "object" && "labels" in baseOptions.plugins.legend
                  ? baseOptions.plugins.legend.labels as Record<string, unknown>
                  : {}),
                color: textColor,
              },
            }
            : undefined,
        } as Record<string, unknown>,
        scales: {
          ...(baseOptions.scales as Record<string, unknown> || {}),
          x: baseOptions.scales && typeof baseOptions.scales === "object" && "x" in baseOptions.scales
            ? {
              ...(baseOptions.scales.x as Record<string, unknown>),
              ticks: {
                ...(baseOptions.scales.x && typeof baseOptions.scales.x === "object" && "ticks" in baseOptions.scales.x
                  ? baseOptions.scales.x.ticks as Record<string, unknown>
                  : {}),
                color: textColor,
              },
              grid: {
                ...(baseOptions.scales.x && typeof baseOptions.scales.x === "object" && "grid" in baseOptions.scales.x
                  ? baseOptions.scales.x.grid as Record<string, unknown>
                  : {}),
                color: gridColor,
              },
            }
            : {
              ticks: { color: textColor },
              grid: { color: gridColor },
            },
          y: baseOptions.scales && typeof baseOptions.scales === "object" && "y" in baseOptions.scales
            ? {
              ...(baseOptions.scales.y as Record<string, unknown>),
              ticks: {
                ...(baseOptions.scales.y && typeof baseOptions.scales.y === "object" && "ticks" in baseOptions.scales.y
                  ? baseOptions.scales.y.ticks as Record<string, unknown>
                  : {}),
                color: textColor,
              },
              grid: {
                ...(baseOptions.scales.y && typeof baseOptions.scales.y === "object" && "grid" in baseOptions.scales.y
                  ? baseOptions.scales.y.grid as Record<string, unknown>
                  : {}),
                color: gridColor,
              },
            }
            : {
              ticks: { color: textColor },
              grid: { color: gridColor },
            },
        } as Record<string, unknown>,
      } as Record<string, unknown>,
    };

    return mergedConfig;
  };

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
      try {
        chartInstanceRef.current.destroy();
      } catch (error) {
        // 忽略销毁时的错误（可能图表已经被销毁）
        console.warn("[Chart] 销毁图表实例时出错:", error);
      }
      chartInstanceRef.current = null;
    }

    // 使用 setTimeout 确保 canvas 已经完全准备好，避免重复创建
    const timer = setTimeout(() => {
      // 再次检查 canvas 是否存在（防止在延迟期间被卸载）
      if (!canvasRef.current) {
        return;
      }

      try {
        // 获取合并后的配置（包含主题颜色）
        const mergedConfig = getMergedConfig();

        // 确保配置中包含 type 字段（Chart.js 需要）
        const chartConfig = {
          type,
          ...mergedConfig,
        };

        // 创建新的图表实例（使用类型断言绕过复杂的类型检查）
        // deno-lint-ignore no-explicit-any
        const chart = new Chart(canvasRef.current, chartConfig as any);

        // 保存图表实例
        chartInstanceRef.current = chart;
      } catch (error) {
        console.error("[Chart] 图表初始化失败:", error);
      }
    }, 0);

    // 清理函数：组件卸载时销毁图表实例和定时器
    return () => {
      clearTimeout(timer);
      if (chartInstanceRef.current) {
        try {
          chartInstanceRef.current.destroy();
        } catch (error) {
          // 忽略销毁时的错误
          console.warn("[Chart] 清理时销毁图表实例出错:", error);
        }
        chartInstanceRef.current = null;
      }
    };
  }, [type, config, theme]); // 当 type、config 或 theme 变化时重新创建图表

  // 处理 style 属性（支持字符串或对象）
  const styleAttr = typeof style === "string"
    ? style
    : style
    ? Object.entries(style)
        .map(([key, value]) => `${key}: ${value}`)
        .join("; ")
    : "";

  return (
    <div className={`chart-container w-full h-full ${className}`} style={styleAttr}>
      {/* 加载状态（仅在客户端 hydration 前显示） */}
      {loading && typeof globalThis !== "undefined" && globalThis.window && (
        <div className="chart-loading">{loading}</div>
      )}
      
      {/* Canvas 元素 - 服务端和客户端都会渲染这个元素 */}
      <canvas
        ref={canvasRef}
        id={chartId}
        className="chart-canvas w-full h-full"
        style="display: block; width: 100%; height: 100%;"
      />
    </div>
  );
}
