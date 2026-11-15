/**
 * 升级提示客户端模块的导入说明符。
 *
 * 生成的 `_client.dep.tsx` 会在浏览器里被 esbuild 打包。
 * 本地开发用文件系统路径即可；从 JSR 加载时 `import.meta.url` 是
 * `https://jsr.io/...`，若原样写进入口，esbuild 会把它当外部导入留下，
 * 浏览器去拉源文件拿到 HTML，触发 MIME 报错。
 * 这种远程情况把源码物化到应用源码目录，再按本地文件打包。
 */
import {
  DWEB_APP_VERSION_STORAGE_KEY,
  DWEB_VERSION_PATH,
  DWEB_VERSION_STREAM_PATH,
} from "../utils/constants.ts";
import { fromFileUrl } from "../utils/version.ts";
import {
  ensureDir,
  exists,
  join,
  readTextFile,
  writeTextFile,
} from "../core/runtime-adapter.ts";
import denoConfig from "../../deno.json" with { type: "json" };

/** 物化目录名（与 `_client.dep.tsx` 同级，不提交） */
export const UPGRADE_PROMPT_MATERIALIZE_DIR = "_upgrade-prompt";

/**
 * 从本包 deno.json 的 imports 取出说明符。
 * 优先用完整 key，没有再由包根说明符拼接子路径。
 */
export function specifierFromPackageImports(
  imports: Record<string, string>,
  key: string,
): string | undefined {
  const exact = imports[key];
  if (exact) return exact;
  const slash = key.lastIndexOf("/");
  if (slash <= 0) return undefined;
  const root = imports[key.slice(0, slash)];
  if (!root) return undefined;
  return root.endsWith("/")
    ? `${root}${key.slice(slash + 1)}`
    : `${root}${key.slice(slash)}`;
}

/**
 * 物化文件里的 storage 客户端说明符。
 * 取自本包 deno.json 的 `@dreamer/storage/client`（或由 `@dreamer/storage` 拼接），
 * 不写死版本，也不依赖应用是否配置了 import map。
 */
export const UPGRADE_PROMPT_STORAGE_CLIENT_SPECIFIER =
  specifierFromPackageImports(
    (denoConfig as { imports?: Record<string, string> }).imports ?? {},
    "@dreamer/storage/client",
  ) ?? "@dreamer/storage/client";

/** JSR 包作为后备说明符（物化失败时不会把 https URL 写进浏览器代码） */
export const UPGRADE_PROMPT_PACKAGE_SPECIFIER =
  "@dreamer/dweb/upgrade-prompt-client";

/**
 * 把模块 URL 收成 esbuild 可打包的说明符。
 * `file://` 转为文件系统路径；`http(s):` 不得进入生成代码。
 */
export function upgradePromptClientSpecifierFromUrl(moduleUrl: string): string {
  const url = new URL(moduleUrl);
  if (url.protocol === "file:") {
    return fromFileUrl(url.href).replaceAll("\\", "/");
  }
  return UPGRADE_PROMPT_PACKAGE_SPECIFIER;
}

/** 当前运行中的升级提示客户端模块说明符（未物化） */
export function upgradePromptClientSpecifier(): string {
  return upgradePromptClientSpecifierFromUrl(
    new URL("./upgrade-prompt-client.ts", import.meta.url).href,
  );
}

/** 防御：生成入口前再次去掉 file:// 与远程 URL */
export function toBundledUpgradePromptSpecifier(specifier: string): string {
  const trimmed = specifier.trim();
  if (trimmed.startsWith("file:")) {
    return fromFileUrl(trimmed).replaceAll("\\", "/");
  }
  if (trimmed.startsWith("http:") || trimmed.startsWith("https:")) {
    return UPGRADE_PROMPT_PACKAGE_SPECIFIER;
  }
  return trimmed;
}

/** 物化用的精简常量，值与 `src/utils/constants.ts` 保持一致 */
export function slimUpgradePromptConstantsSource(): string {
  return `export const DWEB_VERSION_PATH = ${JSON.stringify(DWEB_VERSION_PATH)};
export const DWEB_VERSION_STREAM_PATH = ${
    JSON.stringify(DWEB_VERSION_STREAM_PATH)
  };
export const DWEB_APP_VERSION_STORAGE_KEY = ${
    JSON.stringify(DWEB_APP_VERSION_STORAGE_KEY)
  };
`;
}

/** 把源码里的包/相对导入改成物化目录内可解析的说明符 */
export function rewriteMaterializedUpgradePromptClient(source: string): string {
  return source
    .replaceAll(
      'from "@dreamer/storage/client"',
      `from "${UPGRADE_PROMPT_STORAGE_CLIENT_SPECIFIER}"`,
    )
    .replaceAll(
      'from "../utils/constants.ts"',
      'from "./constants.ts"',
    )
    .replaceAll(
      'from "../utils/project-version.ts"',
      'from "./project-version.ts"',
    );
}

/** 读取与本模块相邻的源码。不用 `with { type: "text" }`，避免 esbuild 打包服务端时报错。 */
async function readSiblingSource(relativePath: string): Promise<string> {
  const url = new URL(relativePath, import.meta.url);
  if (url.protocol === "file:") {
    return await readTextFile(fromFileUrl(url.href).replaceAll("\\", "/"));
  }
  const response = await fetch(url.href);
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  if (
    !response.ok ||
    contentType.includes("text/html") ||
    /^\s*</.test(text)
  ) {
    throw new Error(`unable to read module source: ${url.href}`);
  }
  return text;
}

async function writeIfChanged(path: string, content: string): Promise<void> {
  if (await exists(path) && (await readTextFile(path)) === content) return;
  await writeTextFile(path, content);
}

/**
 * 把升级提示客户端及其依赖写到应用源码目录，返回可打包的本地文件路径。
 */
export async function materializeUpgradePromptClient(
  clientSrcDir: string,
): Promise<string> {
  const dir = join(clientSrcDir, UPGRADE_PROMPT_MATERIALIZE_DIR);
  await ensureDir(dir);
  await writeIfChanged(
    join(dir, "constants.ts"),
    slimUpgradePromptConstantsSource(),
  );
  await writeIfChanged(
    join(dir, "project-version.ts"),
    await readSiblingSource("../utils/project-version.ts"),
  );
  const clientPath = join(dir, "client.ts");
  await writeIfChanged(
    clientPath,
    rewriteMaterializedUpgradePromptClient(
      await readSiblingSource("./upgrade-prompt-client.ts"),
    ),
  );
  return clientPath.replaceAll("\\", "/");
}

/**
 * 供生成 `_client.dep.tsx` 使用的最终说明符。
 * 本地模块用文件系统路径；远程（JSR）则物化后再返回本地路径。
 */
export async function resolveUpgradePromptClientSpecifier(
  clientSrcDir: string,
): Promise<string> {
  const url = new URL("./upgrade-prompt-client.ts", import.meta.url);
  if (url.protocol === "file:") {
    return fromFileUrl(url.href).replaceAll("\\", "/");
  }
  try {
    return await materializeUpgradePromptClient(clientSrcDir);
  } catch {
    return UPGRADE_PROMPT_PACKAGE_SPECIFIER;
  }
}
