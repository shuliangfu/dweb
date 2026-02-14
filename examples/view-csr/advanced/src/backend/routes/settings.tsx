/**
 * 系统设置页面
 * 路由: /admin/settings
 */

/**
 * 系统设置页面
 */
export default function Settings() {
  return (
    <div class="space-y-6">
      <h1 class="text-2xl font-bold text-gray-900">系统设置</h1>

      {/* 基本设置 */}
      <div class="bg-white rounded-xl shadow-sm p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-6">基本设置</h2>

        <form class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                网站名称
              </label>
              <input
                type="text"
                value="View Advanced Example"
                class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                网站描述
              </label>
              <input
                type="text"
                value="一个全栈应用示例"
                class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              联系邮箱
            </label>
            <input
              type="email"
              value="admin@example.com"
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <button
            type="submit"
            class="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            保存设置
          </button>
        </form>
      </div>

      {/* 服务状态 */}
      <div class="bg-white rounded-xl shadow-sm p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-6">服务状态</h2>

        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 bg-green-500 rounded-full"></div>
              <span class="font-medium">后台服务</span>
            </div>
            <span class="text-sm text-gray-500">运行中 - 端口 3001</span>
          </div>

          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 bg-green-500 rounded-full"></div>
              <span class="font-medium">前台服务</span>
            </div>
            <span class="text-sm text-gray-500">运行中 - 端口 3000</span>
          </div>

          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span class="font-medium">数据库</span>
            </div>
            <span class="text-sm text-gray-500">使用内存存储</span>
          </div>
        </div>
      </div>
    </div>
  );
}
