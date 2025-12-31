/**
 * 按钮组件
 * 提供多种样式的按钮
 */

import type { ComponentChildren } from 'preact';

interface ButtonProps {
  /** 按钮文本 */
  children: ComponentChildren;
  /** 按钮链接（如果提供，则渲染为 a 标签） */
  href?: string;
  /** 按钮类型 */
  variant?: 'primary' | 'secondary' | 'outline';
  /** 点击事件处理函数 */
  onClick?: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 按钮组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function Button({
  children,
  href,
  variant = 'primary',
  onClick,
  className = ''
}: ButtonProps) {
  // 根据 variant 设置样式类
  const variantClasses = {
    primary: 'text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg',
    secondary: 'text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm',
    outline: 'text-indigo-600 bg-transparent border-2 border-indigo-600 hover:bg-indigo-50'
  };

  const baseClasses = 'inline-flex items-center justify-center px-6 py-3 text-base font-medium rounded-xl transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500';

  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${className}`;

  // 如果有 href，渲染为链接
  if (href) {
    return (
      <a href={href} className={combinedClasses}>
        {children}
      </a>
    );
  }

  // 否则渲染为按钮
  return (
    <button 
      type="button"
      onClick={onClick}
      className={combinedClasses}
    >
      {children}
    </button>
  );
}

