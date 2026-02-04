/**
 * 用户详情
 */

import { getUserById } from "@common/services/mod.ts";

interface UserProps {
  params: { id: string };
}

export default function UserDetail({ params }: UserProps) {
  const user = getUserById(params.id);

  if (!user) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold text-red-500">用户不存在</h1>
        <a href="/users" className="mt-4 inline-block text-primary-600">
          返回列表
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">用户详情</h1>
      <div className="bg-white rounded-xl p-8 shadow-sm">
        <div className="flex items-center gap-6">
          {user.avatar && (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-20 h-20 rounded-full"
            />
          )}
          <div>
            <h2 className="text-xl font-semibold">{user.name}</h2>
            <p className="text-gray-600">{user.email}</p>
            <span className="inline-block mt-2 px-3 py-1 rounded-full bg-indigo-500 text-white text-sm">
              {user.role}
            </span>
          </div>
        </div>
      </div>
      <a href="/users" className="text-primary-600 hover:text-primary-700">
        ← 返回列表
      </a>
    </div>
  );
}
