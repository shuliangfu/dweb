/**
 * 页面头部组件
 * 显示页面标题和描述
 */

interface HeaderProps {
  /** 主标题 */
  title: string;
  /** 副标题/描述 */
  subtitle?: string;
  /** 是否居中 */
  centered?: boolean;
}

/**
 * 页面头部组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function Header({
  title,
  subtitle,
  centered = true,
}: HeaderProps) {
  const containerClasses = centered ? "text-center" : "";

  return (
    <div className={containerClasses}>
      <h2 className="text-4xl font-bold text-white mb-4">
        {title}
      </h2>
      {subtitle && (
        <p className="text-xl text-gray-600 max-w-2xl mx-auto text-white">
          {subtitle}
        </p>
      )}
    </div>
  );
}
