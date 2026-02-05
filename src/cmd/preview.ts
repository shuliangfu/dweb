/**
 * dweb preview 命令
 *
 * 职责：
 * - 本地预览构建结果（静态文件服务）
 * - 需先执行 build，再运行 preview
 * - 支持 dist/、dist/client/、dist/{app}/client/ 等构建输出结构
 *
 * 运行方式：
 * - dweb preview
 * - dweb preview -p 4173
 * - dweb preview -a frontend  # 多应用时指定应用
 */

import { error, info, success } from "@dreamer/console";
import {
  cwd,
  exists,
  join,
  readFile,
  serve,
  stat,
} from "@dreamer/runtime-adapter";
import type { ParsedOptions } from "../feature/command.ts";
import { getProjectInfo } from "../utils/project.ts";
import { loadProjectConfig } from "../utils/config-loader.ts";

/** MIME 类型映射 */
const MIME_TYPES: Record<string, string> = {
  html: "text/html",
  js: "application/javascript",
  css: "text/css",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  map: "application/json",
};

/**
 * 解析静态资源根目录
 * 优先级：dist/client > dist/{app}/client > dist
 */
async function resolveStaticRoot(
  distDir: string,
  app?: string,
): Promise<string> {
  if (app) {
    const appClient = join(distDir, app, "client");
    if (await exists(appClient)) {
      return appClient;
    }
  }
  const distClient = join(distDir, "client");
  if (await exists(distClient)) {
    return distClient;
  }
  return distDir;
}

/**
 * 根据请求路径获取静态文件路径
 */
function getFilePath(staticRoot: string, pathname: string): string {
  let filePath = pathname === "/" ? "/index.html" : pathname;
  if (filePath.endsWith("/")) {
    filePath += "index.html";
  }
  return join(staticRoot, filePath.replace(/^\//, ""));
}

/**
 * 尝试多个路径读取 index.html（SPA 回退）
 */
async function tryReadIndex(staticRoot: string): Promise<Uint8Array | null> {
  const candidates = [
    join(staticRoot, "index.html"),
    join(staticRoot, "..", "index.html"),
  ];
  for (const p of candidates) {
    try {
      return (await readFile(p)) as Uint8Array;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * preview 命令主入口
 *
 * @param _args 命令行参数（未使用）
 * @param options 解析后的选项，可含 port、app
 */
export async function main(
  _args: string[],
  options: ParsedOptions,
): Promise<void> {
  const projectRoot = cwd();
  const distDir = join(projectRoot, "dist");
  const app = options.app as string | undefined;

  // 端口优先级：选项 -p > 配置 build.previewPort > 默认 4173
  let port = Number(options.port);
  if (!port || isNaN(port)) {
    try {
      const config = await loadProjectConfig(projectRoot, app);
      const buildConfig = config.build as { previewPort?: number } | undefined;
      port = buildConfig?.previewPort ?? 4173;
    } catch {
      port = 4173;
    }
  }
  if (!port || isNaN(port)) {
    port = 4173;
  }

  try {
    await stat(distDir);
  } catch {
    error($t("preview.distNotExists"));
    return;
  }

  const projectInfo = await getProjectInfo(projectRoot);
  if (
    app && projectInfo?.mode === "multi" && !projectInfo.appNames.includes(app)
  ) {
    error($t("common.appNotFound", { app }));
    error($t("common.availableApps", {
      apps: projectInfo?.appNames.join(", ") ?? "",
    }));
    return;
  }

  const staticRoot = await resolveStaticRoot(distDir, app);
  info($t("preview.staticDir", { path: staticRoot }));
  info($t("preview.starting", { port: String(port) }));
  success($t("preview.pressCtrlC"));

  serve(
    {
      port,
      host: "127.0.0.1",
      onListen: () => {
        info($t("preview.started", { port: String(port) }));
      },
    },
    async (req: Request) => {
      const url = new URL(req.url);
      const filePath = getFilePath(staticRoot, url.pathname);

      try {
        const content = await readFile(filePath);
        const ext = filePath.split(".").pop() ?? "";
        const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
        return new Response(content as BodyInit, {
          headers: { "Content-Type": contentType },
        });
      } catch {
        const indexContent = await tryReadIndex(staticRoot);
        if (indexContent) {
          return new Response(indexContent as BodyInit, {
            headers: { "Content-Type": "text/html" },
          });
        }
        return new Response("Not Found", { status: 404 });
      }
    },
  );
}
