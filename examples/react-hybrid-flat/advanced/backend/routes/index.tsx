/**
 * 后台仪表盘
 */

import { getAllUsers } from "@common/services/mod.ts";

export default function Dashboard() {
  const users = getAllUsers();
  const stats = {
    totalUsers: users.length,
    admins: users.filter((u) => u.role === "admin").length,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-sm text-gray-500">总用户数</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-sm text-gray-500">管理员数</p>
          <p className="text-2xl font-bold text-gray-900">{stats.admins}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">最近用户</h2>
        <ul className="space-y-2">
          {users.map((user) => (
            <li key={user.id} className="flex items-center gap-3">
              <span className="font-medium">{user.name}</span>
              <span className="text-gray-500">{user.email}</span>
              <a
                href={`/users/${user.id}`}
                className="text-primary-600 hover:text-primary-700 text-sm"
              >
                查看
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
