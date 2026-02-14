/**
 * 日志管理页面
 * 路由: /logs
 */

/**
 * 日志管理页面
 */
export default function Logs() {
  const mockLogs = [
    {
      id: 1,
      level: "info",
      message: "用户登录成功",
      time: "2024-01-15 10:23:45",
      source: "auth",
    },
    {
      id: 2,
      level: "warn",
      message: "API 请求超时",
      time: "2024-01-15 10:22:12",
      source: "api",
    },
    {
      id: 3,
      level: "error",
      message: "数据库连接失败",
      time: "2024-01-15 10:20:01",
      source: "db",
    },
    {
      id: 4,
      level: "info",
      message: "缓存已刷新",
      time: "2024-01-15 10:18:33",
      source: "cache",
    },
  ];

  const levelColors: Record<string, string> = {
    info: "bg-blue-100 text-blue-700",
    warn: "bg-yellow-100 text-yellow-700",
    error: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">日志管理</h1>

      <div className="flex gap-4">
        <select className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">全部级别</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
        </select>
        <input
          type="text"
          placeholder="搜索日志..."
          className="flex-1 max-w-md px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-left text-sm text-gray-500">
              <th className="px-6 py-4 font-medium">级别</th>
              <th className="px-6 py-4 font-medium">消息</th>
              <th className="px-6 py-4 font-medium">来源</th>
              <th className="px-6 py-4 font-medium">时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mockLogs.map((log) => (
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      levelColors[log.level] || "bg-gray-100"
                    }`}
                  >
                    {log.level}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-900">{log.message}</td>
                <td className="px-6 py-4 text-gray-500">{log.source}</td>
                <td className="px-6 py-4 text-gray-500 text-sm">{log.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
