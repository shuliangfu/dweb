/**
 * 关于页面
 * 路由: /about
 */

import type { LoadContext } from "@dreamer/dweb";

/** 关于页元数据（方法），用于按上下文生成 <title> / <meta> */
export const metadata = (
  _context: { url: string; params: Record<string, string> },
) => ({
  title: "关于 - Dweb Basic",
  description: "关于本示例项目",
});

/** 关于页 load 注入的数据，用于复现和验证 HMR 是否保留 load() 数据。 */
export interface AboutLoadData {
  /** 页面 load 标记，HMR 后应继续正常显示。 */
  pageLoadMarker: string;
  /** 当前请求路径，验证 load(ctx) 可以拿到服务端上下文 URL。 */
  currentPath: string;
  /** 服务端执行 load() 的时间，方便观察 HMR 是否重新拉取数据。 */
  loadedAt: string;
}

/** 关于页组件属性。 */
interface AboutProps {
  /** dweb 通过 load(ctx) 注入的页面数据。 */
  data?: AboutLoadData;
}

/**
 * 加载关于页初始数据。
 *
 * @param ctx dweb 提供的 load 上下文，包含当前 URL、参数、查询和服务容器。
 * @returns 关于页用于首屏、客户端导航和 HMR 验证的数据。
 */
export function load(ctx: LoadContext): AboutLoadData {
  return {
    pageLoadMarker: "about",
    currentPath: ctx.url,
    loadedAt: new Date().toISOString(),
  };
}

/**
 * 关于页面
 * @returns 关于页面内容
 */
export default function About({ data }: AboutProps) {
  return (
    <div class="py-5">
      <h1 class="mb-8 text-3xl font-bold">关于我们</h1>

      <section class="rounded-lg bg-white p-8 shadow-md">
        <div class="mb-6 rounded-md border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-800">
          <p class="font-semibold">load() 注入数据</p>
          <p data-testid="about-load-marker">
            标记：{data?.pageLoadMarker ?? "missing"}
          </p>
          <p>路径：{data?.currentPath ?? "missing"}</p>
          <p>加载时间：{data?.loadedAt ?? "missing"}</p>
        </div>

        <p class="mb-6">
          这是一个使用 <strong>@dreamer/dweb</strong> 框架和{" "}
          <strong>View</strong> 构建的示例项目。
        </p>

        <h2 class="mb-4 mt-6 text-xl font-semibold text-indigo-600">技术栈</h2>
        <ul class="ml-5 list-disc space-y-2">
          <li>
            <strong>@dreamer/dweb</strong> - 全栈 Web 框架
          </li>
          <li>
            <strong>View</strong> - 轻量级响应式视图引擎
          </li>
          <li>
            <strong>Deno</strong> - 现代 JavaScript/TypeScript 运行时
          </li>
          <li>
            <strong>TypeScript</strong> - 类型安全的 JavaScript
          </li>
        </ul>

        <h2 class="mb-4 mt-6 text-xl font-semibold text-indigo-600">
          项目结构
        </h2>
        <pre class="overflow-x-auto rounded-md bg-gray-100 p-4 text-sm">{`
my-app/
├── src/
│   ├── routes/          # 文件路由
│   │   ├── _app.tsx    # 应用根组件
│   │   ├── _layout.tsx # 布局组件
│   │   ├── _404.tsx    # 404 错误页面
│   │   ├── _error.tsx  # 错误页面
│   │   ├── index.tsx   # / 路由
│   │   ├── about.tsx   # /about 路由
│   │   └── user/
│   │       └── [id].tsx # /user/:id 路由
│   ├── main.ts         # 服务端入口
│   └── config/         # 配置文件
└── deno.json
        `}</pre>
      </section>
    </div>
  );
}
