/**
 * 特性展示区域组件
 * 用于展示框架的核心特性
 */

interface Feature {
  /** 特性标题 */
  title: string;
  /** 特性描述 */
  description: string;
  /** 图标（emoji 或 SVG） */
  icon: string;
  /** 是否高亮 */
  highlighted?: boolean;
}

interface FeatureSectionProps {
  /** 特性列表 */
  features: Feature[];
  /** 标题 */
  title?: string;
  /** 副标题 */
  subtitle?: string;
}

/**
 * 特性展示区域组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function FeatureSection({
  features,
  title = '核心特性',
  subtitle = 'DWeb 提供了现代化 Web 开发所需的所有功能',
}: FeatureSectionProps) {
  return (
    <div className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 标题区域 */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            {title}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        {/* 特性网格 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`relative p-8 rounded-2xl border-2 transition-all hover:shadow-xl ${
                feature.highlighted
                  ? 'border-blue-500 bg-linear-to-br from-blue-50 to-indigo-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-lg'
              }`}
            >
              {/* 图标 */}
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 text-white text-3xl shadow-lg">
                  {feature.icon}
                </div>
              </div>

              {/* 标题 */}
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {feature.title}
              </h3>

              {/* 描述 */}
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>

              {/* 高亮标记 */}
              {feature.highlighted && (
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white">
                    推荐
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

