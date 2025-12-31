/**
 * 技术卡片组件
 * 用于展示技术栈信息
 */

interface TechCardProps {
  /** 技术名称 */
  name: string;
  /** 技术描述 */
  description: string;
  /** 图标/表情符号 */
  icon: string;
}

/**
 * 技术卡片组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function TechCard({ name, description, icon }: TechCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md dark:shadow-lg p-6 hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-gray-700 group hover:-translate-y-1">
      <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform duration-300">{icon}</div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{name}</h3>
      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

