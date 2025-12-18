/**
 * CSR (Client-Side Rendering) 示例
 * 页面完全在客户端渲染
 */

// 导出渲染模式
export const renderMode = 'csr' as const;

/**
 * CSR 页面组件
 * 注意：在 CSR 模式下，服务端不会渲染内容，只提供容器
 */
export default function CSRPage({ params: _params, query: _query, data: _data }: any) {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">CSR 示例页面</h1>
      <p className="text-gray-600 mb-4">
        这是一个客户端渲染（CSR）的示例页面。
        页面内容完全在客户端渲染，服务端只提供容器。
      </p>
      <div className="mt-4">
        <button 
          onClick={() => alert('CSR 页面交互正常！')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          点击测试交互
        </button>
      </div>
    </div>
  );
}

