/**
 * Hero 区域组件
 * 用于首页顶部的大标题区域
 */

import { useEffect, useState } from "preact/hooks";

interface HeroProps {
  /** 主标题 */
  title: string;
  /** 副标题 */
  subtitle: string;
  /** 主要 CTA 按钮文本 */
  primaryCTA?: string;
  /** 主要 CTA 链接 */
  primaryCTALink?: string;
  /** 次要 CTA 按钮文本 */
  secondaryCTA?: string;
  /** 次要 CTA 链接 */
  secondaryCTALink?: string;
  /** 版本号（可选，如果不提供则尝试从 globalThis.__PAGE_DATA__ 获取） */
  version?: string;
}

/**
 * Hero 区域组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function Hero({
  title,
  subtitle,
  primaryCTA = "快速开始",
  primaryCTALink = "/docs",
  secondaryCTA = "查看文档",
  secondaryCTALink = "/docs",
  version,
}: HeroProps) {
  // 获取版本号：优先使用 props，其次从 globalThis.__PAGE_DATA__ 获取
  const versionString = version ||
    (typeof globalThis !== "undefined" &&
      (globalThis as {
        __PAGE_DATA__?: { versionInfo?: { versionString?: string } };
      }).__PAGE_DATA__?.versionInfo?.versionString) ||
    null;

  // 生成随机位置的 helper (仅在客户端有效，SSR 时使用默认位置以避免 hydration mismatch)
  // 为了简单起见和避免 SSR 问题，我们使用 CSS 变量或确定性的伪随机数，或者接受初始位置是固定的，动画会打乱它们。
  // 更好的方式是使用 useEffect 在挂载后随机化位置，或者使用确定性的随机种子。
  // 这里我们采用一种简单的策略：使用 CSS 类来定义大致区域，具体的随机性交给动画本身（动画路径已经是复杂的了）。
  // 如果需要每次刷新位置都不同，可以在 useEffect 中设置 style。

  // 状态用于控制是否显示背景（作为开关）
  const [showBackground, setShowBackground] = useState(true);

  // 客户端随机化位置 (可选，为了增强随机感)
  const [positions, setPositions] = useState([
    { top: "-top-20", right: "-right-20", left: "auto", bottom: "auto" },
    { top: "top-1/2", left: "-left-20", right: "auto", bottom: "auto" },
    { bottom: "-bottom-20", right: "right-1/4", top: "auto", left: "auto" },
    { top: "top-1/4", left: "left-1/3", right: "auto", bottom: "auto" },
    { bottom: "bottom-1/4", right: "right-10", top: "auto", left: "auto" },
  ]);

  useEffect(() => {
    // 在组件挂载后，随机打乱位置数组
    // 简单的洗牌算法
    const shuffled = [...positions].sort(() => Math.random() - 0.5);
    setPositions(shuffled);
  }, []); // 空依赖数组，只在挂载时执行一次

  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-950 py-24 lg:py-36">
      {/* 背景开关按钮 (开发/演示用，实际生产环境可能不需要，或者放在设置里) */}
      <button
        onClick={() => setShowBackground(!showBackground)}
        className="absolute top-4 right-4 z-20 p-2 text-xs text-gray-400 hover:text-gray-600 bg-white/50 rounded-full opacity-0 hover:opacity-100 transition-opacity"
        title="Toggle Background Animation"
      >
        {showBackground ? "Hide BG" : "Show BG"}
      </button>

      {/* 背景装饰 */}
      {showBackground && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className={`absolute ${positions[0].top} ${positions[0].right} ${
              positions[0].left
            } ${
              positions[0].bottom
            } w-[30rem] h-[30rem] bg-blue-500/20 dark:bg-blue-600/10 mix-blend-multiply filter blur-3xl opacity-40 animate-float-slow`}
          >
          </div>
          <div
            className={`absolute ${positions[1].top} ${positions[1].right} ${
              positions[1].left
            } ${
              positions[1].bottom
            } w-[25rem] h-[25rem] bg-purple-500/20 dark:bg-purple-600/10 mix-blend-multiply filter blur-3xl opacity-40 animate-float-medium`}
          >
          </div>
          <div
            className={`absolute ${positions[2].top} ${positions[2].right} ${
              positions[2].left
            } ${
              positions[2].bottom
            } w-[28rem] h-[28rem] bg-indigo-500/20 dark:bg-indigo-600/10 mix-blend-multiply filter blur-3xl opacity-40 animate-float-fast`}
          >
          </div>
          <div
            className={`absolute ${positions[3].top} ${positions[3].right} ${
              positions[3].left
            } ${
              positions[3].bottom
            } w-64 h-64 bg-pink-500/15 dark:bg-pink-600/5 mix-blend-multiply filter blur-3xl opacity-30 animate-float-slow animation-delay-1000`}
          >
          </div>
          <div
            className={`absolute ${positions[4].top} ${positions[4].right} ${
              positions[4].left
            } ${
              positions[4].bottom
            } w-80 h-80 bg-cyan-500/15 dark:bg-cyan-600/5 mix-blend-multiply filter blur-3xl opacity-30 animate-float-medium animation-delay-2000`}
          >
          </div>
        </div>
      )}

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <div className="text-center">
          {/* 主标题 */}
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-gray-900 dark:text-white mb-8 tracking-tight leading-tight">
            <span className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
              {title}
            </span>
          </h1>

          {/* 副标题 */}
          <p className="mt-8 text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed font-light">
            {subtitle}
          </p>

          {/* CTA 按钮组 */}
          <div className="mt-12 flex flex-col sm:flex-row gap-6 justify-center items-center">
            <a
              href={primaryCTALink}
              className="group inline-flex items-center px-10 py-5 text-lg font-bold text-white bg-linear-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-full hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              {primaryCTA}
              <svg
                className="ml-2 w-5 h-5 transform group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </a>
            <a
              href={secondaryCTALink}
              className="inline-flex items-center px-10 py-5 text-lg font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-md hover:shadow-lg border border-gray-200 dark:border-gray-700 hover:-translate-y-1"
            >
              {secondaryCTA}
            </a>
          </div>

          {/* 版本信息 */}
          {versionString && (
            <div className="mt-10 text-sm text-gray-500 dark:text-gray-400 animate-fade-in-up">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-gray-200 dark:border-gray-700 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse">
                </span>
                最新版本 v{versionString}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
