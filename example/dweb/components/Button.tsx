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
    primary: 'text-white bg-indigo-600 hover:bg-indigo-700',
    secondary: 'text-gray-700 bg-white hover:bg-gray-50',
    outline: 'text-indigo-600 bg-transparent border-2 border-indigo-600 hover:bg-indigo-50'
  };

  const baseClasses = 'inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md transition-colors';

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

