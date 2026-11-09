/**
 * init 生成的 API 路由模板
 * - kind:"api"：handler 在 routes/ 根下（无 /api 前缀）
 * - web 应用内 api：写在 routes/api/ 下（URL 带 /api）
 * - apiMode:"action"：导出方法名（index／create／update／remove／view…）
 * - apiMode:"restful"：导出 GET／POST／PUT／DELETE（现行 restful 模板）
 */

import { $tr } from "../helpers.ts";
import type { ApiMode, ExampleLevel } from "../types.ts";

function prefixPath(prefix: string, relativePath: string): string {
  if (!prefix) return relativePath;
  return `${prefix.replace(/\/?$/, "/")}${relativePath}`;
}

/** ---------- restful（现行模板） ---------- */

/** routes/index.ts —— restful 最小 API 示例 */
export function getApiIndexTsRestful(): string {
  const helloMsg = $tr("init.template.apiHelloMessage");
  const createdMsg = $tr("init.template.apiCreatedMessage");
  return `/**
 * ${$tr("init.template.apiHelloComment")}
 * GET/POST /
 */

import type { ApiContext } from "@dreamer/dweb";
import { json } from "@dreamer/router";

/**
 * GET /
 */
export function GET(_ctx: ApiContext) {
  return json({ message: ${JSON.stringify(helloMsg)} });
}

/**
 * POST /
 * 文件路由 API 的唯一参数为 ApiContext（可用 ctx.body / ctx.req）
 */
export async function POST(ctx: ApiContext) {
  const body = (ctx.body as Record<string, unknown> | undefined) ??
    await ctx.req.json().catch(() => ({}));
  return json({ message: ${JSON.stringify(createdMsg)}, data: body });
}
`;
}

/** routes/users/index.ts —— restful 列表示例 */
export function getApiUsersIndexTsRestful(): string {
  return `/**
 * ${$tr("init.template.apiUsersComment")}
 * GET /users · POST /users
 */

import type { ApiContext } from "@dreamer/dweb";
import { json } from "@dreamer/router";

let users = [
  { id: "1", name: "Alice" },
  { id: "2", name: "Bob" },
];
let seq = users.length;

/**
 * GET /users
 */
export function GET(_ctx: ApiContext) {
  return json({ users });
}

/**
 * POST /users — create（单条）；批量可传数组
 */
export async function POST(ctx: ApiContext) {
  const body = (ctx.body as Record<string, unknown> | unknown[] | undefined) ??
    await ctx.req.json().catch(() => ({}));
  const rows = Array.isArray(body) ? body : [body];
  const created = rows.map((row) => {
    seq += 1;
    const item = {
      id: String(seq),
      name: String((row as Record<string, unknown>)?.name ?? ""),
    };
    users = [item, ...users];
    return item;
  });
  return json(
    created.length === 1 ? { user: created[0] } : { users: created },
    201,
  );
}
`;
}

/** routes/users/[id].ts —— restful 详情／更新／删除 */
export function getApiUsersByIdTsRestful(): string {
  return `/**
 * ${$tr("init.template.apiUserByIdComment")}
 * GET/PUT/DELETE /users/:id
 */

import type { ApiContext } from "@dreamer/dweb";
import { json } from "@dreamer/router";

let users: Record<string, { id: string; name: string }> = {
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

/**
 * PUT /users/:id
 */
export async function PUT(ctx: ApiContext) {
  const id = ctx.params?.id ?? "";
  if (!users[id]) {
    return json({ error: "not_found", id }, 404);
  }
  const body = (ctx.body as Record<string, unknown> | undefined) ??
    await ctx.req.json().catch(() => ({}));
  users[id] = {
    id,
    name: String(body.name ?? users[id].name),
  };
  return json({ user: users[id] });
}

/**
 * DELETE /users/:id
 */
export function DELETE(ctx: ApiContext) {
  const id = ctx.params?.id ?? "";
  if (!users[id]) {
    return json({ error: "not_found", id }, 404);
  }
  delete users[id];
  return json({ ok: true, id });
}
`;
}

/** routes/users/import.ts —— restful 导入 */
export function getApiUsersImportTsRestful(): string {
  return `/**
 * POST /users/import — restful importRows
 */

import type { ApiContext } from "@dreamer/dweb";
import { json } from "@dreamer/router";

/**
 * POST /users/import
 * body: { rows: Record<string, unknown>[] }
 */
export async function POST(ctx: ApiContext) {
  const body = (ctx.body as { rows?: unknown[] } | undefined) ??
    await ctx.req.json().catch(() => ({} as { rows?: unknown[] }));
  const rows = Array.isArray(body.rows) ? body.rows : [];
  return json({ created: rows.length, failed: 0, rows });
}
`;
}

/** ---------- action（方法式） ---------- */

/** routes/index.ts —— action：index／create */
export function getApiIndexTsAction(): string {
  const helloMsg = $tr("init.template.apiHelloMessage");
  const createdMsg = $tr("init.template.apiCreatedMessage");
  return `/**
 * ${$tr("init.template.apiHelloComment")}
 * apiMode:"action" — 导出方法名；/ → index，/create → create
 */

import type { ApiContext } from "@dreamer/dweb";
import { json } from "@dreamer/router";

/** GET/POST /（无方法段时回落 index） */
export function index(_ctx: ApiContext) {
  return json({ message: ${JSON.stringify(helloMsg)} });
}

/** POST //create */
export async function create(ctx: ApiContext) {
  const body = (ctx.body as Record<string, unknown> | undefined) ??
    await ctx.req.json().catch(() => ({}));
  return json({ message: ${JSON.stringify(createdMsg)}, data: body });
}
`;
}

/**
 * routes/users/index.ts —— action：基础 CRUD 同文件
 * createApiDataSource action：GET 根／POST …/create｜update｜remove；
 * importRows → create 且 body { rows }
 */
export function getApiUsersIndexTsAction(): string {
  return `/**
 * ${$tr("init.template.apiUsersComment")}
 * apiMode:"action" — index／create／update／remove 同文件
 */

import type { ApiContext } from "@dreamer/dweb";
import { json } from "@dreamer/router";

let users = [
  { id: "1", name: "Alice" },
  { id: "2", name: "Bob" },
];
let seq = users.length;

function createOne(values: Record<string, unknown>) {
  seq += 1;
  const user = {
    id: String(seq),
    name: String(values.name ?? ""),
  };
  users = [user, ...users];
  return user;
}

/** GET /users · /users/index */
export function index(_ctx: ApiContext) {
  return json({ users });
}

/**
 * POST /users/create
 * 单条对象；批量 importRows 传 { rows: [...] }（不单独 /import）
 */
export async function create(ctx: ApiContext) {
  const body = (ctx.body as Record<string, unknown> | undefined) ??
    await ctx.req.json().catch(() => ({}));
  if (Array.isArray(body.rows)) {
    const created = body.rows.map((row) =>
      createOne((row ?? {}) as Record<string, unknown>)
    );
    return json({ created: created.length, failed: 0, users: created }, 201);
  }
  return json({ user: createOne(body) }, 201);
}

/** POST /users/update — body 含 id */
export async function update(ctx: ApiContext) {
  const body = (ctx.body as Record<string, unknown> | undefined) ??
    await ctx.req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) {
    return json({ error: "not_found", id }, 404);
  }
  users[idx] = {
    id,
    name: String(body.name ?? users[idx].name),
  };
  return json({ user: users[idx] });
}

/** POST /users/remove — body { ids: string[] } */
export async function remove(ctx: ApiContext) {
  const body = (ctx.body as { ids?: unknown } | undefined) ??
    await ctx.req.json().catch(() => ({} as { ids?: unknown }));
  const ids = Array.isArray(body.ids)
    ? body.ids.map((id) => String(id))
    : [];
  let removed = 0;
  const failed: string[] = [];
  for (const id of ids) {
    const before = users.length;
    users = users.filter((u) => u.id !== id);
    if (users.length < before) removed += 1;
    else failed.push(id);
  }
  return json({ removed, failed });
}
`;
}

/** routes/users/[id]/view.ts —— action view */
export function getApiUsersViewTsAction(): string {
  return `/**
 * ${$tr("init.template.apiUserByIdComment")}
 * apiMode:"action" — GET /users/:id/view
 */

import type { ApiContext } from "@dreamer/dweb";
import { json } from "@dreamer/router";

const users: Record<string, { id: string; name: string }> = {
  "1": { id: "1", name: "Alice" },
  "2": { id: "2", name: "Bob" },
};

/** Action \`view\` */
export function view(ctx: ApiContext) {
  const id = ctx.params?.id ?? "";
  const user = users[id];
  if (!user) {
    return json({ error: "not_found", id }, 404);
  }
  return json({ user });
}
`;
}

/** 兼容旧名：默认 restful index（测试／外部若直接引用） */
export function getApiHelloTs(): string {
  return getApiIndexTsRestful();
}
export function getApiIndexTs(): string {
  return getApiIndexTsRestful();
}
export function getApiUsersIndexTs(): string {
  return getApiUsersIndexTsRestful();
}
export function getApiUsersByIdTs(): string {
  return getApiUsersByIdTsRestful();
}

export interface ListApiRouteFilesOptions {
  /** 路径前缀，web 应用内 api 传 "api" */
  pathPrefix?: string;
}

/** 按 apiMode＋示例粒度返回 API 路由文件列表（相对 routes/） */
export function listApiRouteFiles(
  exampleLevel: ExampleLevel,
  apiMode: ApiMode = "action",
  options: ListApiRouteFilesOptions = {},
): Array<{ relativePath: string; content: string }> {
  const prefix = options.pathPrefix?.replace(/^\/+|\/+$/g, "") ?? "";
  const files: Array<{ relativePath: string; content: string }> = [];

  if (apiMode === "restful") {
    files.push({
      relativePath: prefixPath(prefix, "index.ts"),
      content: getApiIndexTsRestful(),
    });
    if (exampleLevel === "with-about") {
      files.push(
        {
          relativePath: prefixPath(prefix, "users/index.ts"),
          content: getApiUsersIndexTsRestful(),
        },
        {
          relativePath: prefixPath(prefix, "users/[id].ts"),
          content: getApiUsersByIdTsRestful(),
        },
        {
          relativePath: prefixPath(prefix, "users/import.ts"),
          content: getApiUsersImportTsRestful(),
        },
      );
    }
    return files;
  }

  // action（默认）
  files.push({
    relativePath: prefixPath(prefix, "index.ts"),
    content: getApiIndexTsAction(),
  });
  if (exampleLevel === "with-about") {
    files.push(
      {
        relativePath: prefixPath(prefix, "users/index.ts"),
        content: getApiUsersIndexTsAction(),
      },
      {
        relativePath: prefixPath(prefix, "users/[id]/view.ts"),
        content: getApiUsersViewTsAction(),
      },
    );
  }
  return files;
}

/** web 应用内 api：routes/api/** */
export function listWebInAppApiRouteFiles(
  exampleLevel: ExampleLevel,
  apiMode: ApiMode = "action",
): Array<{ relativePath: string; content: string }> {
  return listApiRouteFiles(exampleLevel, apiMode, { pathPrefix: "api" });
}
