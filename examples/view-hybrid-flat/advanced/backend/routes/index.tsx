/**
 * 后台管理仪表盘
 * 路由: /admin
 */

import { getAllUsers } from "@common/services/mod.ts";
import type { User } from "@common/types/mod.ts";

/** 仪表盘统计 */
interface DashboardStats {
  totalUsers: number;
  admins: number;
  activeToday: number;
}

/** 仪表盘页面属性（由 load 注入） */
interface DashboardProps {
  users: User[];
  stats: DashboardStats;
}

/**
 * 服务端数据加载：在服务端获取用户列表并计算统计，注入到组件
 */
export function load(): Promise<DashboardProps> {
  const users = getAllUsers();
  const stats: DashboardStats = {
    totalUsers: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    activeToday: Math.floor(Math.random() * users.length) + 1,
  };
  return Promise.resolve({ users, stats });
}

/**
 * 仪表盘页面（纯展示，数据由 load 注入）
 */
export default function Dashboard({ users, stats }: DashboardProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">仪表盘 333</h1>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
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
              <p className="text-sm text-gray-500">总用户数</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalUsers}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-purple-600"
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
              <p className="text-sm text-gray-500">管理员数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.admins}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
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
              <p className="text-sm text-gray-500">今日活跃</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.activeToday}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 最近用户 */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">最近用户</h2>
        </div>
        <div className="p-6">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500">
                <th className="pb-4">用户</th>
                <th className="pb-4">邮箱</th>
                <th className="pb-4">角色</th>
                <th className="pb-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr>
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="py-4 text-gray-500">{user.email}</td>
                  <td className="py-4">
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
                  <td className="py-4">
                    <a
                      href={`/users/${user.id}`}
                      className="text-indigo-600 hover:text-indigo-700"
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
