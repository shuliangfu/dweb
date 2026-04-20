/**
 * 用户详情页面
 * 动态路由: /user/:id
 */

import type { LoadContext } from "@dreamer/dweb";

/** 用户页面属性 */
interface UserProps {
  /** 路由参数 */
  params: {
    id: string;
  };
}

/** 模拟用户数据 */
const users: Record<string, { name: string; email: string; role: string }> = {
  "1": { name: "张三", email: "zhangsan@example.com", role: "管理员" },
  "2": { name: "李四", email: "lisi@example.com", role: "用户" },
  "3": { name: "王五", email: "wangwu@example.com", role: "访客" },
};

/**
 * 用户详情页元数据（随路由 id 变化，与其他页面区分）
 */
export const metadata = (ctx: LoadContext) => ({
  title: `用户 ${ctx.params.id ?? "?"} - Dweb Basic`,
  description: `用户详情 id=${ctx.params.id ?? ""}`,
});

/**
 * 用户详情页面
 * @param props - 组件属性
 * @returns 用户详情内容
 */
export default function User({ params }: UserProps) {
  const user = users[params.id];

  if (!user) {
    return (
      <div className="py-16 px-5 text-center">
        <h1 className="mb-4 text-2xl font-bold text-red-500">用户不存在</h1>
        <p className="mb-4">用户 ID: {params.id} 不存在</p>
        <a
          href="/"
          className="mt-5 inline-block rounded-md bg-blue-600 px-5 py-2.5 text-white no-underline hover:bg-blue-700"
        >
          返回首页
        </a>
      </div>
    );
  }

  return (
    <div className="py-5">
      <h1 className="mb-8 text-3xl font-bold">用户详情</h1>

      <div className="flex items-center gap-6 rounded-xl bg-white p-8 shadow-md">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-3xl font-bold text-white">
          {user.name.charAt(0)}
        </div>
        <div>
          <h2 className="mb-2 text-2xl font-semibold">{user.name}</h2>
          <p className="mb-2.5 text-gray-600">{user.email}</p>
          <span className="inline-block rounded-full bg-indigo-500 px-3 py-1 text-sm text-white">
            {user.role}
          </span>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <a
          href="/user/1"
          className="rounded-md bg-gray-100 px-5 py-2.5 text-gray-800 no-underline transition-colors hover:bg-gray-200"
        >
          用户 1
        </a>
        <a
          href="/user/2"
          className="rounded-md bg-gray-100 px-5 py-2.5 text-gray-800 no-underline transition-colors hover:bg-gray-200"
        >
          用户 2
        </a>
        <a
          href="/user/3"
          className="rounded-md bg-gray-100 px-5 py-2.5 text-gray-800 no-underline transition-colors hover:bg-gray-200"
        >
          用户 3
        </a>
        <a
          href="/user/999"
          className="rounded-md bg-gray-100 px-5 py-2.5 text-gray-800 no-underline transition-colors hover:bg-gray-200"
        >
          不存在的用户
        </a>
      </div>
    </div>
  );
}
