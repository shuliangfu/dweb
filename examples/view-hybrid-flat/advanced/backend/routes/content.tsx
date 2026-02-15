/**
 * 内容管理页面
 * 路由: /content
 */

/** 内容项 */
interface ContentItem {
  id: number;
  title: string;
  type: string;
  status: string;
  updatedAt: string;
}

/** 页面属性（由 load 注入） */
interface ContentProps {
  contents: ContentItem[];
}

/**
 * 服务端数据加载：在服务端准备内容列表，注入到组件
 */
export function load(): Promise<ContentProps> {
  const contents: ContentItem[] = [
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
  return Promise.resolve({ contents });
}

/**
 * 内容管理页面（纯展示，数据由 load 注入）
 */
export default function Content({ contents }: ContentProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">内容管理</h1>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <svg
            className="w-5 h-5"
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

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-left text-sm text-gray-500">
              <th className="px-6 py-4 font-medium">标题</th>
              <th className="px-6 py-4 font-medium">类型</th>
              <th className="px-6 py-4 font-medium">状态</th>
              <th className="px-6 py-4 font-medium">更新时间</th>
              <th className="px-6 py-4 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contents.map((item) => (
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">
                  {item.title}
                </td>
                <td className="px-6 py-4 text-gray-500">{item.type}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      item.status === "已发布"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500 text-sm">
                  {item.updatedAt}
                </td>
                <td className="px-6 py-4">
                  <a
                    href={`/content/${item.id}`}
                    className="text-indigo-600 hover:text-indigo-700"
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
