/**
 * init 生成的纯 API 路由模板（handler 直接放在 routes/ 下，不强制 routes/api/）
 */

import { $tr } from "../helpers.ts";
import type { ExampleLevel } from "../types.ts";

/** routes/hello.ts —— 最小 API 示例 */
export function getApiHelloTs(): string {
  const helloMsg = $tr("init.template.apiHelloMessage");
  const createdMsg = $tr("init.template.apiCreatedMessage");
  return `/**
 * ${$tr("init.template.apiHelloComment")}
 * GET/POST /hello
 */

import type { ApiContext } from "@dreamer/dweb";
import { json } from "@dreamer/router";

/**
 * GET /hello
 */
export function GET(_ctx: ApiContext) {
  return json({ message: ${JSON.stringify(helloMsg)} });
}

/**
 * POST /hello
 * 文件路由 API 的唯一参数为 ApiContext（可用 ctx.body / ctx.req）
 */
export async function POST(ctx: ApiContext) {
  const body = (ctx.body as Record<string, unknown> | undefined) ??
    await ctx.req.json().catch(() => ({}));
  return json({ message: ${JSON.stringify(createdMsg)}, data: body });
}
`;
}

/** routes/users/index.ts —— 列表示例（with-about 粒度） */
export function getApiUsersIndexTs(): string {
  return `/**
 * ${$tr("init.template.apiUsersComment")}
 * GET /users
 */

import type { ApiContext } from "@dreamer/dweb";
import { json } from "@dreamer/router";

const users = [
  { id: "1", name: "Alice" },
  { id: "2", name: "Bob" },
];

/**
 * GET /users
 */
export function GET(_ctx: ApiContext) {
  return json({ users });
}
`;
}

/** routes/users/[id].ts —— 详情示例（with-about 粒度） */
export function getApiUsersByIdTs(): string {
  return `/**
 * ${$tr("init.template.apiUserByIdComment")}
 * GET /users/:id
 */

import type { ApiContext } from "@dreamer/dweb";
import { json } from "@dreamer/router";

const users: Record<string, { id: string; name: string }> = {
  "1": { id: "1", name: "Alice" },
  "2": { id: "2", name: "Bob" },
};

/**
 * GET /users/:id
 */
export function GET(ctx: ApiContext) {
  const id = ctx.params?.id ?? "";
  const user = users[id];
  if (!user) {
    return json({ error: "not_found", id }, 404);
  }
  return json({ user });
}
`;
}

/** 按示例粒度返回 API 路由文件列表（相对 routes/） */
export function listApiRouteFiles(
  exampleLevel: ExampleLevel,
): Array<{ relativePath: string; content: string }> {
  const files = [
    { relativePath: "hello.ts", content: getApiHelloTs() },
  ];
  if (exampleLevel === "with-about") {
    files.push(
      { relativePath: "users/index.ts", content: getApiUsersIndexTs() },
      { relativePath: "users/[id].ts", content: getApiUsersByIdTs() },
    );
  }
  return files;
}
