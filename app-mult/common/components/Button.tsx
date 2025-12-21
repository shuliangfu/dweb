/**
 * 公共按钮组件
 * 可在多个应用中使用
 */
export default function CommonButton({ 
  children, 
  onClick,
  type = 'button',
  className = ''
}: { 
  children: preact.ComponentChildren;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors ${className}`}
    >
      {children}
    </button>
  );
}
