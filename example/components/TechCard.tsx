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
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{name}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

