/**
 * 404 页面
 * 当访问不存在的路由时显示
 */

import { h } from 'preact';
import Button from '../components/Button.tsx';

/**
 * 404 页面组件
 * @returns JSX 元素
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-4">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-indigo-600 mb-4">404</h1>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            页面未找到
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-md mx-auto">
            抱歉，您访问的页面不存在。请检查 URL 是否正确，或返回首页继续浏览。
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button href="/" variant="primary">
            返回首页
          </Button>
          <Button href="/" variant="outline">
            关于我们
          </Button>
        </div>
      </div>
    </div>
  );
}
