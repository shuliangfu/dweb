/**
 * 用户管理列表页
 * 路由: /admin/users
 */

import { getAllUsers } from "@common/services/mod.ts";
import type { User } from "@common/types/mod.ts";
import { formatRelativeTime } from "@common/utils/mod.ts";

/** 页面属性（由 load 注入；SSG 预渲染时可能无数据） */
interface UsersManagementProps {
  users?: User[];
}

/**
 * 服务端数据加载：在服务端获取用户列表，注入到组件
 */
export function load(): Promise<UsersManagementProps> {
  const users = getAllUsers();
  return Promise.resolve({ users });
}

/**
 * 用户管理页面（纯展示，数据由 load 注入）
 * SSG 预渲染时 load 可能未执行或无数据，需默认空数组避免 .map 报错
 */
export default function UsersManagement({
  users = [],
}: UsersManagementProps) {
  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">用户管理</h1>
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
          添加用户
        </button>
      </div>

      {/* 用户表格 */}
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr class="text-left text-sm text-gray-500">
              <th class="px-6 py-4 font-medium">用户</th>
              <th class="px-6 py-4 font-medium">邮箱</th>
              <th class="px-6 py-4 font-medium">角色</th>
              <th class="px-6 py-4 font-medium">创建时间</th>
              <th class="px-6 py-4 font-medium">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            {users.map((user) => (
              <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      class="w-10 h-10 rounded-full"
                    />
                    <span class="font-medium text-gray-900">{user.name}</span>
                  </div>
                </td>
                <td class="px-6 py-4 text-gray-500">{user.email}</td>
                <td class="px-6 py-4">
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
                <td class="px-6 py-4 text-gray-500 text-sm">
                  {formatRelativeTime(user.createdAt)}
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <a
                      href={`/users/${user.id}`}
                      class="p-2 text-gray-500 hover:text-primary-600 transition-colors"
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
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    </a>
                    <button
                      type="button"
                      class="p-2 text-gray-500 hover:text-primary-600 transition-colors"
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="p-2 text-gray-500 hover:text-red-600 transition-colors"
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
