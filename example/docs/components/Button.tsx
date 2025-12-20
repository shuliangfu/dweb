/**
 * 按钮组件
 * 提供多种样式的按钮
 */

import { h } from 'preact';
import type { ComponentChildren, JSX } from 'preact';

/**
 * 按钮组件属性
 */
export interface ButtonProps {
  /** 按钮文本 */
  children: ComponentChildren;
  /** 按钮链接（如果提供，则渲染为 a 标签） */
  href?: string;
  /** 按钮类型 */
  variant?: 'primary' | 'secondary' | 'outline';
  /** 点击事件处理函数（当没有 href 时使用） */
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
}: ButtonProps): JSX.Element {
  // 根据 variant 设置样式类
  const variantClasses = {
    primary: 'text-white bg-indigo-600 hover:bg-indigo-700',
    secondary: 'text-gray-700 bg-white hover:bg-gray-50 border border-gray-300',
    outline: 'text-indigo-600 bg-transparent border-2 border-indigo-600 hover:bg-indigo-50'
  };

  const baseClasses = 'inline-flex items-center px-6 py-3 text-base font-medium rounded-md transition-colors';

  // 如果 className 中包含了背景色或文字颜色，则完全使用 className，不添加 variant 的样式
  // 这样可以避免样式冲突，确保自定义样式生效
  const hasCustomBg = className.includes('bg-');
  const hasCustomText = className.includes('text-');
  
  // 构建最终的样式类
  let combinedClasses: string;
  if (hasCustomBg && hasCustomText) {
    // 如果同时有自定义背景和文字颜色，完全使用 className，不添加 variant 样式
    combinedClasses = `${baseClasses} ${className}`.replace(/s+/g, ' ').trim();
  } else if (hasCustomBg || hasCustomText) {
    // 如果只有其中一个，移除 variant 中对应的样式
    let finalVariantClasses = variantClasses[variant];
    if (hasCustomBg) {
      // 移除所有背景色相关的类（包括 hover:bg-*）
      finalVariantClasses = finalVariantClasses.replace(/s*(?:hover:)?bg-[^s]+/g, '').trim();
    }
    if (hasCustomText) {
      // 移除所有文字颜色相关的类（包括 hover:text-*）
      finalVariantClasses = finalVariantClasses.replace(/s*(?:hover:)?text-[^s]+/g, '').trim();
    }
    combinedClasses = `${baseClasses} ${finalVariantClasses} ${className}`.replace(/s+/g, ' ').trim();
  } else {
    // 没有自定义样式，使用 variant 的完整样式
    combinedClasses = `${baseClasses} ${variantClasses[variant]} ${className}`.replace(/s+/g, ' ').trim();
  }

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
