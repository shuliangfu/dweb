/**
 * 用户详情页面
 * 使用 Tailwind CSS v4 样式
 */

import { commonConfig } from "@common/config/main.ts";
import type { User } from "@common/types/mod.ts";
import { formatDate } from "@common/utils/mod.ts";

/** 页面属性 */
interface UserDetailProps {
  params: { id: string };
  user?: User;
  error?: string;
}

/**
 * 服务端数据加载
 */
export async function load(
  { params }: { params: { id: string } },
): Promise<Partial<UserDetailProps>> {
  try {
    const response = await fetch(
      `http://localhost:${commonConfig.backendPort}/api/users/${params.id}`,
    );
    const data = await response.json();

    if (data.success) {
      return { user: data.data };
    }
    return { error: data.error || "获取用户失败" };
  } catch (_error) {
    return { error: "无法连接到后端服务" };
  }
}

/**
 * 用户详情页面
 */
export default function UserDetail({ params, user, error }: UserDetailProps) {
  if (error) {
    return (
      <div class="max-w-2xl mx-auto">
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p class="text-red-600">{error}</p>
          <a
            href="/users"
            class="inline-block mt-4 text-primary-600 hover:text-primary-700"
          >
            ← 返回用户列表
          </a>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div class="max-w-2xl mx-auto">
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p class="text-yellow-600">用户 {params.id} 不存在</p>
          <a
            href="/users"
            class="inline-block mt-4 text-primary-600 hover:text-primary-700"
          >
            ← 返回用户列表
          </a>
        </div>
      </div>
    );
  }

  return (
    <div class="max-w-2xl mx-auto space-y-6">
      {/* 返回链接 */}
      <a
        href="/users"
        class="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
        返回用户列表
      </a>

      {/* 用户卡片 */}
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* 头部背景 */}
        <div class="h-32 bg-linear-to-br from-primary-500 to-primary-700">
        </div>

        {/* 用户信息 */}
        <div class="px-6 pb-6">
          {/* 头像 */}
          <div class="-mt-16 mb-4">
            <img
              src={user.avatar}
              alt={user.name}
              class="w-32 h-32 rounded-full border-4 border-white bg-gray-100"
            />
          </div>

          {/* 基本信息 */}
          <div class="space-y-4">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">{user.name}</h1>
              <p class="text-gray-500">{user.email}</p>
            </div>

            <div class="flex items-center gap-3">
              <span
                class={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
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
              <span class="text-sm text-gray-500">
                加入于 {formatDate(user.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div class="flex gap-3">
        <button
          type="button"
          class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
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
          编辑用户
        </button>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
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
          删除
        </button>
      </div>

      {/* 快速导航 */}
      <div class="bg-gray-50 rounded-lg p-4">
        <h3 class="text-sm font-medium text-gray-700 mb-3">查看其他用户</h3>
        <div class="flex flex-wrap gap-2">
          {["1", "2", "3"].map((id) => (
            <a
              href={`/users/${id}`}
              class={`px-3 py-1 rounded-lg text-sm ${
                id === params.id
                  ? "bg-primary-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-primary-300"
              }`}
            >
              用户 {id}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
