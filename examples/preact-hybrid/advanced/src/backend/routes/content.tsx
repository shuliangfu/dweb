/**
 * 内容管理页面
 * 路由: /content
 */

/**
 * 内容管理页面
 */
export default function Content() {
  const mockContents = [
    {
      id: 1,
      title: "首页 Banner",
      type: "banner",
      status: "已发布",
      updatedAt: "2 小时前",
    },
    {
      id: 2,
      title: "关于我们",
      type: "page",
      status: "草稿",
      updatedAt: "1 天前",
    },
    {
      id: 3,
      title: "产品介绍",
      type: "article",
      status: "已发布",
      updatedAt: "3 天前",
    },
  ];

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">内容管理</h1>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          新建内容
        </button>
      </div>

      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr class="text-left text-sm text-gray-500">
              <th class="px-6 py-4 font-medium">标题</th>
              <th class="px-6 py-4 font-medium">类型</th>
              <th class="px-6 py-4 font-medium">状态</th>
              <th class="px-6 py-4 font-medium">更新时间</th>
              <th class="px-6 py-4 font-medium">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            {mockContents.map((item) => (
              <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 font-medium text-gray-900">
                  {item.title}
                </td>
                <td class="px-6 py-4 text-gray-500">{item.type}</td>
                <td class="px-6 py-4">
                  <span
                    class={`px-2 py-1 text-xs rounded-full ${
                      item.status === "已发布"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td class="px-6 py-4 text-gray-500 text-sm">
                  {item.updatedAt}
                </td>
                <td class="px-6 py-4">
                  <a
                    href={`/content/${item.id}`}
                    class="text-primary-600 hover:text-primary-700"
                  >
                    编辑
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
