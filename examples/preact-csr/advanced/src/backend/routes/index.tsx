/**
 * 后台管理仪表盘
 * 路由: /admin
 */

import { getAllUsers } from "@common/services/mod.ts";

/**
 * 仪表盘页面
 */
export default function Dashboard() {
  const users = getAllUsers();
  const stats = {
    totalUsers: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    activeToday: Math.floor(Math.random() * users.length) + 1,
  };

  return (
    <div class="space-y-6">
      <h1 class="text-2xl font-bold text-gray-900">仪表盘 333</h1>

      {/* 统计卡片 */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white rounded-xl p-6 shadow-sm">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                class="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <div>
              <p class="text-sm text-gray-500">总用户数</p>
              <p class="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl p-6 shadow-sm">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg
                class="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <p class="text-sm text-gray-500">管理员数</p>
              <p class="text-2xl font-bold text-gray-900">{stats.admins}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl p-6 shadow-sm">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg
                class="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
            <div>
              <p class="text-sm text-gray-500">今日活跃</p>
              <p class="text-2xl font-bold text-gray-900">
                {stats.activeToday}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 最近用户 */}
      <div class="bg-white rounded-xl shadow-sm">
        <div class="p-6 border-b border-gray-100">
          <h2 class="text-lg font-semibold text-gray-900">最近用户</h2>
        </div>
        <div class="p-6">
          <table class="w-full">
            <thead>
              <tr class="text-left text-sm text-gray-500">
                <th class="pb-4">用户</th>
                <th class="pb-4">邮箱</th>
                <th class="pb-4">角色</th>
                <th class="pb-4">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              {users.map((user) => (
                <tr>
                  <td class="py-4">
                    <div class="flex items-center gap-3">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        class="w-8 h-8 rounded-full"
                      />
                      <span class="font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td class="py-4 text-gray-500">{user.email}</td>
                  <td class="py-4">
                    <span
                      class={`px-2 py-1 text-xs rounded-full ${
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
                  <td class="py-4">
                    <a
                      href={`/users/${user.id}`}
                      class="text-primary-600 hover:text-primary-700"
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
    </div>
  );
}
