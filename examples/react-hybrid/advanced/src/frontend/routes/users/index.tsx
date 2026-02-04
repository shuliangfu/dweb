/**
 * 用户列表
 */

import { getAllUsers } from "@common/services/mod.ts";

export default function UsersList() {
  const users = getAllUsers();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">用户列表</h1>
      <div className="grid gap-4">
        {users.map((user) => (
          <a
            key={user.id}
            href={`/users/${user.id}`}
            className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            {user.avatar && (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-12 h-12 rounded-full"
              />
            )}
            <div>
              <h3 className="font-semibold">{user.name}</h3>
              <p className="text-gray-600 text-sm">{user.email}</p>
            </div>
            <span className="ml-auto text-primary-600">查看 →</span>
          </a>
        ))}
      </div>
    </div>
  );
}
