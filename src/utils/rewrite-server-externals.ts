/**
 * 将生产 `dist/server.js` 中的协议 external 改写为裸包名，
 * 使 Deno／Bun／Node 都能按项目 import map／package.json 解析。
 *
 * 背景：`@dreamer/esbuild` 服务端构建在 Deno 下把 `jsr:`／`npm:` 标为 external；
 * 在 Bun 下部分传递依赖会留下 `@jsr/scope__name`。Deno 能跑 `jsr:`，但 Bun／Node 不能：
 * - Bun：`Cannot find module '@jsr/dreamer__…'`（node_modules 只有 `@dreamer/…` 链接）
 * - Node：`ERR_UNSUPPORTED_ESM_URL_SCHEME`（protocol `jsr:`）
 *
 * 项目 deno.json／package.json 已声明 `@dreamer/…`，改成裸名三端均可解析。
 */

/** `@jsr/scope__name(/subpath)?` → `@scope/name(/subpath)?` */
const JSR_NPM_CANONICAL = /(["'])@jsr\/([A-Za-z0-9_.-]+)(\/[^"']*)?\1/g;

/** `jsr:@scope/name@version(/subpath)?` → `@scope/name(/subpath)?`（无版本） */
const JSR_PROTOCOL = /(["'])jsr:([^"']+)\1/g;

/**
 * `npm:pkg@version(/sub)?`／`npm:@scope/pkg@version(/sub)?` → 裸名。
 * 跳过含空白的字符串（i18n 文案里偶发 `npm:` 前缀）。
 */
const NPM_PROTOCOL = /(["'])npm:([^"']+)\1/g;

/**
 * 从 `jsr:`／`npm:` 协议体中拆出包名与可选子路径（去掉版本段）。
 *
 * @param body - 协议后的部分，如 `@dreamer/view@^3.0.4/jsx-runtime`
 * @returns 裸 specifier，无法识别时返回 `undefined`
 */
function stripProtocolVersion(body: string): string | undefined {
  // 允许 `@scope/name` 或 `name`，后接可选 `@version`，再接可选 `/subpath`
  const m = body.match(/^((?:@[^@/]+\/)?[^@/]+)(?:@[^/]+)?(\/.*)?$/);
  if (!m) return undefined;
  return `${m[1]}${m[2] ?? ""}`;
}

/**
 * 改写服务端产物中的协议／`@jsr/` external 为裸包名。
 *
 * @param content - `dist/server.js` 原文
 * @returns 改写后的源码（无匹配时原样返回）
 */
export function rewriteServerExternalSpecifiers(content: string): string {
  let out = content.replace(JSR_NPM_CANONICAL, (full, q, name, sub) => {
    const subpath = typeof sub === "string" ? sub : "";
    if (name.includes("__")) {
      const [scope, ...rest] = name.split("__");
      return `${q}@${scope}/${rest.join("__")}${subpath}${q}`;
    }
    // 非 scope__name 形态（少见），保持 @jsr/ 以免误伤
    return full;
  });

  out = out.replace(JSR_PROTOCOL, (full, q, body) => {
    // 跳过非 import 场景的说明文案（含空白）
    if (typeof body !== "string" || /\s/.test(body)) return full;
    const bare = stripProtocolVersion(body);
    if (!bare) return full;
    return `${q}${bare}${q}`;
  });

  out = out.replace(NPM_PROTOCOL, (full, q, body) => {
    if (typeof body !== "string" || /\s/.test(body)) return full;
    // 排除像 `npm:-Imports…` 这类非包名
    if (!/^(@[^@/]+\/)?[A-Za-z0-9_.-]+(@[^/]+)?(\/.*)?$/.test(body)) {
      return full;
    }
    const bare = stripProtocolVersion(body);
    if (!bare) return full;
    return `${q}${bare}${q}`;
  });

  return out;
}
