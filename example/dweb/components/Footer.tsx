/**
 * 页脚组件
 * 用于网站底部信息展示
 */

/**
 * 页脚组件
 * @returns JSX 元素
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* 关于 */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">DWeb</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              基于 Deno + Preact + Tailwind CSS 的现代化全栈 Web 框架
            </p>
          </div>

          {/* 快速链接 */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4">快速链接</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/" className="text-gray-400 hover:text-white transition-colors">
                  首页
                </a>
              </li>
              <li>
                <a href="/features" className="text-gray-400 hover:text-white transition-colors">
                  特性
                </a>
              </li>
              <li>
                <a href="/docs" className="text-gray-400 hover:text-white transition-colors">
                  文档
                </a>
              </li>
              <li>
                <a href="/about" className="text-gray-400 hover:text-white transition-colors">
                  关于
                </a>
              </li>
            </ul>
          </div>

          {/* 资源 */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4">资源</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://github.com/shuliangfu/dweb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors inline-flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://jsr.io/@dreamer/dweb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  JSR 包
                </a>
              </li>
            </ul>
          </div>

          {/* 联系 */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4">社区</h4>
            <p className="text-sm text-gray-400">
              欢迎贡献代码和提出建议
            </p>
          </div>
        </div>

        {/* 版权信息 */}
        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
          <p>© {currentYear} DWeb Framework. Built with ❤️ using Deno + Preact + Tailwind CSS</p>
        </div>
      </div>
    </footer>
  );
}

