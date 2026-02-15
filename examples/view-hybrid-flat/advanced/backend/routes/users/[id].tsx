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
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">用户不存在</h1>
        <p className="text-gray-500 mb-6">用户 ID: {params.id} 不存在</p>
        <a
          href="/admin/users"
          className="text-indigo-600 hover:text-indigo-700"
        >
          ← 返回用户列表
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 面包屑 */}
      <nav className="text-sm text-gray-500">
        <a href="/admin" className="hover:text-indigo-600">仪表盘</a>
        <span className="mx-2">/</span>
        <a href="/admin/users" className="hover:text-indigo-600">用户管理</a>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{user.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 用户信息卡片 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-center">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-24 h-24 rounded-full mx-auto mb-4"
            />
            <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-gray-500">{user.email}</p>
            <span
              className={`inline-block mt-3 px-3 py-1 text-sm rounded-full ${
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

          <div className="mt-6 pt-6 border-t border-gray-100">
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-gray-500">用户 ID</dt>
                <dd className="font-mono text-gray-900">{user.id}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">创建时间</dt>
                <dd className="text-gray-900">{formatDate(user.createdAt)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* 编辑表单 */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">编辑用户</h3>

          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  用户名
                </label>
                <input
                  type="text"
                  value={user.name}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  邮箱
                </label>
                <input
                  type="email"
                  value={user.email}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                角色
              </label>
              <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
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

            <div className="flex items-center gap-4 pt-4">
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                保存更改
              </button>
              <a
                href="/admin/users"
                className="px-6 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
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
