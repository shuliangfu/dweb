/**
 * 用户列表页面
 * 使用 Tailwind CSS v4 样式
 */

import { commonConfig } from "@common/config/main.ts";
import type { User } from "@common/types/mod.ts";
import { formatRelativeTime } from "@common/utils/mod.ts";

/** 页面属性 */
interface UsersPageProps {
  users?: User[];
  error?: string;
}

/**
 * 服务端数据加载
 */
export async function load(): Promise<UsersPageProps> {
  try {
    const response = await fetch(
      `http://localhost:${commonConfig.backendPort}/api/users`,
    );
    const data = await response.json();

    if (data.success) {
      return { users: data.data };
    }
    return { error: data.error || "获取用户列表失败" };
  } catch (_error) {
    return { error: "无法连接到后端服务" };
  }
}

/**
 * 用户列表页面
 */
export default function UsersPage({ users = [], error }: UsersPageProps) {
  if (error) {
    return (
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p class="text-red-600">{error}</p>
        <p class="text-sm text-red-500 mt-2">
          请确保后端服务已启动 (端口 {commonConfig.backendPort})
        </p>
      </div>
    );
  }

  return (
    <div class="space-y-6">
      {/* 页面标题 */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">用户管理</h1>
          <p class="text-gray-600 mt-1">管理系统中的所有用户</p>
        </div>
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

      {/* 用户卡片网格 */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <a
            href={`/users/${user.id}`}
            class="block bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-200 transition-all"
          >
            <div class="flex items-start gap-4">
              {/* 头像 */}
              <img
                src={user.avatar}
                alt={user.name}
                class="w-14 h-14 rounded-full bg-gray-100"
              />
              {/* 信息 */}
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-gray-900 truncate">
                  {user.name}
                </h3>
                <p class="text-sm text-gray-500 truncate">{user.email}</p>
                <div class="flex items-center gap-2 mt-2">
                  <span
                    class={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
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
                  <span class="text-xs text-gray-400">
                    {formatRelativeTime(user.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* 空状态 */}
      {users.length === 0 && (
        <div class="text-center py-12">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <svg
              class="w-8 h-8 text-gray-400"
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
          <p class="text-gray-600">暂无用户</p>
        </div>
      )}
    </div>
  );
}
