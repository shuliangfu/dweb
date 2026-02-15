/**
 * 用户详情/编辑页面
 * 路由: /admin/users/:id
 */

import { getUserById } from "@common/services/mod.ts";
import type { User } from "@common/types/mod.ts";
import { formatDate } from "@common/utils/mod.ts";

/** 页面属性（由 load 注入） */
interface UserDetailProps {
  params: { id: string };
  user?: User | null;
  error?: string;
}

/**
 * 服务端数据加载：在服务端根据 id 获取用户，注入到组件
 */
export function load(
  { params }: { params: { id: string } },
): Promise<Partial<UserDetailProps>> {
  const user = getUserById(params.id);
  if (user) return Promise.resolve({ user });
  return Promise.resolve({ error: "用户不存在" });
}

/**
 * 用户详情页面（纯展示，数据由 load 注入）
 */
export default function UserDetail({ params, user, error }: UserDetailProps) {
  if (error || !user) {
    return (
      <div class="text-center py-12">
        <h1 class="text-2xl font-bold text-gray-900 mb-4">用户不存在</h1>
        <p class="text-gray-500 mb-6">用户 ID: {params.id} 不存在</p>
        <a href="/admin/users" class="text-primary-600 hover:text-primary-700">
          ← 返回用户列表
        </a>
      </div>
    );
  }

  return (
    <div class="space-y-6">
      {/* 面包屑 */}
      <nav class="text-sm text-gray-500">
        <a href="/admin" class="hover:text-primary-600">仪表盘</a>
        <span class="mx-2">/</span>
        <a href="/admin/users" class="hover:text-primary-600">用户管理</a>
        <span class="mx-2">/</span>
        <span class="text-gray-900">{user.name}</span>
      </nav>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 用户信息卡片 */}
        <div class="bg-white rounded-xl shadow-sm p-6">
          <div class="text-center">
            <img
              src={user.avatar}
              alt={user.name}
              class="w-24 h-24 rounded-full mx-auto mb-4"
            />
            <h2 class="text-xl font-bold text-gray-900">{user.name}</h2>
            <p class="text-gray-500">{user.email}</p>
            <span
              class={`inline-block mt-3 px-3 py-1 text-sm rounded-full ${
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
          </div>

          <div class="mt-6 pt-6 border-t border-gray-100">
            <dl class="space-y-4">
              <div>
                <dt class="text-sm text-gray-500">用户 ID</dt>
                <dd class="font-mono text-gray-900">{user.id}</dd>
              </div>
              <div>
                <dt class="text-sm text-gray-500">创建时间</dt>
                <dd class="text-gray-900">{formatDate(user.createdAt)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* 编辑表单 */}
        <div class="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-6">编辑用户</h3>

          <form class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  用户名
                </label>
                <input
                  type="text"
                  value={user.name}
                  class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  邮箱
                </label>
                <input
                  type="email"
                  value={user.email}
                  class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                角色
              </label>
              <select class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="admin" selected={user.role === "admin"}>
                  管理员
                </option>
                <option value="user" selected={user.role === "user"}>
                  用户
                </option>
                <option value="guest" selected={user.role === "guest"}>
                  访客
                </option>
              </select>
            </div>

            <div class="flex items-center gap-4 pt-4">
              <button
                type="submit"
                class="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                保存更改
              </button>
              <a
                href="/admin/users"
                class="px-6 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
