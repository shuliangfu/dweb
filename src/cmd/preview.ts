/**
 * dweb preview 命令
 *
 * 职责：
 * - 本地预览构建结果（静态文件服务）
 * - 需先执行 build，再运行 preview
 *
 * 运行方式：
 * - dweb preview
 * - dweb preview -p 4173
 */

import { error, info, success } from "@dreamer/console";
import { cwd, join, readFile, serve, stat } from "@dreamer/runtime-adapter";
import type { ParsedOptions } from "../feature/command.ts";

/**
 * 根据请求路径获取静态文件路径
 */
function getFilePath(distDir: string, pathname: string): string {
  let filePath = pathname === "/" ? "/index.html" : pathname;
  if (filePath.endsWith("/")) {
    filePath += "index.html";
  }
  return join(distDir, filePath.replace(/^\//, ""));
}

/**
 * preview 命令主入口
 *
 * @param _args 命令行参数（未使用）
 * @param options 解析后的选项，可含 port
 */
export async function main(
  _args: string[],
  options: ParsedOptions,
): Promise<void> {
  const projectRoot = cwd();
  const distDir = join(projectRoot, "dist");
  const port = Number(options.port) || 4173;

  try {
    await stat(distDir);
  } catch {
    error("dist 目录不存在，请先执行 dweb build");
    return;
  }

  info(`正在启动预览服务器 http://localhost:${port}`);
  success("按 Ctrl+C 停止");

  serve(
    {
      port,
      host: "127.0.0.1",
      onListen: () => {
        info(`预览服务器已启动: http://localhost:${port}`);
      },
    },
    async (req: Request) => {
      const url = new URL(req.url);
      const filePath = getFilePath(distDir, url.pathname);

      try {
        const content = await readFile(filePath);
        const ext = filePath.split(".").pop() ?? "";
        const mimeTypes: Record<string, string> = {
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
        };
        const contentType = mimeTypes[ext] ?? "application/octet-stream";
        return new Response(content as BodyInit, {
          headers: { "Content-Type": contentType },
        });
      } catch {
        // 尝试 index.html（SPA 路由）
        try {
          const indexPath = join(distDir, "index.html");
          const content = await readFile(indexPath);
          return new Response(content as BodyInit, {
            headers: { "Content-Type": "text/html" },
          });
        } catch {
          return new Response("Not Found", { status: 404 });
        }
      }
    },
  );
}
