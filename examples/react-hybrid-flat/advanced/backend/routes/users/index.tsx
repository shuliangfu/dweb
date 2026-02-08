/**
 * 用户列表
 */

import { getAllUsers } from "@common/services/mod.ts";

export default function UsersList() {
  const users = getAllUsers();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
              <th className="p-4">用户</th>
              <th className="p-4">邮箱</th>
              <th className="p-4">角色</th>
              <th className="p-4">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {user.avatar && (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <span className="font-medium">{user.name}</span>
                  </div>
                </td>
                <td className="p-4 text-gray-500">{user.email}</td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      user.role === "admin"
                        ? "bg-purple-100 text-purple-700"
                        : user.role === "user"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {user.role === "admin"
                      ? "管理员"
                      : user.role === "user"
                      ? "用户"
                      : "访客"}
                  </span>
                </td>
                <td className="p-4">
                  <a
                    href={`/users/${user.id}`}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    查看
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
