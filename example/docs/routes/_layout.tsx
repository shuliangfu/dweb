/**
 * 根布局组件
 * 提供网站的整体布局结构
 * 注意：HTML 文档结构由 _app.tsx 提供
 */

/**
 * 根布局组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default async function RootLayout({ children }: { children: unknown }) {
  // 获取当前路径（在客户端运行时）
  let currentPath = '/';
  if (typeof globalThis !== 'undefined' && globalThis.location) {
    currentPath = globalThis.location.pathname;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 导航栏 */}
      <nav className="bg-white shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <a href="/" className="text-2xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                docs
              </a>
            </div>
            <div className="flex space-x-4">
              <a
                href="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPath === '/' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                首页
              </a>
              <a
                href="/about"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPath === '/about' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                关于
              </a>
            </div>
          </div>
          </div>
        </nav>
      
      {/* 主内容区域 */}
      <main className="grow">
          {children}
        </main>
    </div>
  );
}
