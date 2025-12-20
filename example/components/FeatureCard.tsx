/**
 * 特性卡片组件
 * 用于展示框架的核心特性
 */

interface FeatureCardProps {
  /** 特性标题 */
  title: string;
  /** 特性描述 */
  description?: string;
  /** 图标颜色 */
  iconColor?: string;
  /** 是否高亮 */
  highlighted?: boolean;
}

/**
 * 特性卡片组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function FeatureCard({
  title,
  description,
  iconColor = 'text-green-500',
  highlighted = false
}: FeatureCardProps) {
  return (
    <li className={`flex items-center text-gray-700 ${highlighted ? 'font-semibold' : ''}`}>
      <svg 
        className={`w-5 h-5 ${iconColor} mr-3`} 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path 
          fillRule="evenodd" 
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
          clipRule="evenodd" 
        />
      </svg>
      <div>
        <span className="text-lg">{title}</span>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>
    </li>
  );
}

