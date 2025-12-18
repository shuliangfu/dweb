/**
 * 根布局组件
 * 使用 Preact + Tailwind CSS v4
 * 提供网站的整体布局结构
 */

import Navbar from '../components/Navbar.tsx';
import Footer from '../components/Footer.tsx';

/**
 * 根布局组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default async function RootLayout({ children }: { children: any }) {
  // 获取当前路径（在客户端运行时）
  let currentPath = '/';
  if (typeof globalThis !== 'undefined' && globalThis.location) {
    currentPath = globalThis.location.pathname;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 导航栏 */}
      <Navbar currentPath={currentPath} />
      
      {/* 主内容区域 */}
      <main className="grow">
        {children}
      </main>
      
      {/* 页脚 */}
      <Footer />
    </div>
  );
}
