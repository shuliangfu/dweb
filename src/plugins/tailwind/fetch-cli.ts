/**
 * Tailwind CLI 下载工具
 * 用于在编译时自动下载 Tailwind CLI 可执行文件
 */

import { exists } from "@std/fs/exists";
import * as path from "@std/path";

/**
 * 将版本号（v3 或 v4）映射到具体的 CLI 版本号
 * @param version Tailwind 版本（"v3" 或 "v4"）
 * @returns 具体的 CLI 版本号
 */
function getCliVersion(version: "v3" | "v4"): string {
  return version === "v3" ? "v3.4.19" : "v4.1.18";
}

/**
 * 显示下载进度条
 * @param loaded 已下载字节数
 * @param total 总字节数
 */
function showProgress(loaded: number, total: number): void {
  const percent = Math.round((loaded / total) * 100);
  const barLength = 30;
  const filled = Math.round((percent / 100) * barLength);
  const empty = barLength - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  const size = (loaded / 1024 / 1024).toFixed(2);
  const totalSize = (total / 1024 / 1024).toFixed(2);

  // 使用 \r 覆盖同一行
  Deno.stdout.writeSync(
    new TextEncoder().encode(
      `\r📥 下载中: [${bar}] ${percent}% (${size}MB / ${totalSize}MB)`,
    ),
  );
}

/**
 * 确保 Tailwind CLI 可执行文件存在
 * 如果不存在，则自动下载
 *
 * @param cliPath 自定义 CLI 路径（可选，如果提供则使用该路径）
 * @param version Tailwind 版本（"v3" 或 "v4"），用于确定下载的 CLI 版本
 * @returns CLI 可执行文件的完整路径
 *
 * @example
 * ```ts
 * const cliPath = await ensureTailwindCli(undefined, "v4");
 * // 返回: ./bin/tailwindcss (或 ./bin/tailwindcss.exe)
 * ```
 */
export async function ensureTailwindCli(
  cliPath?: string,
  version: "v3" | "v4" = "v4",
): Promise<string> {
  // 如果提供了自定义路径，直接使用
  if (cliPath) {
    const absolutePath = path.isAbsolute(cliPath)
      ? cliPath
      : path.resolve(Deno.cwd(), cliPath);

    // 检查文件是否存在
    if (await exists(absolutePath)) {
      return absolutePath;
    }

    throw new Error(
      `Tailwind CLI 路径不存在: ${absolutePath}。请检查路径是否正确，或移除 cliPath 选项以自动下载。`,
    );
  }

  // 默认路径：项目根目录下的 bin 目录
  // 文件名根据版本区分：v3 -> tailwindcss-v3, v4 -> tailwindcss-v4
  const binDir = path.resolve(Deno.cwd(), "bin");
  const baseName = `tailwindcss-${version}`;
  const exeName = Deno.build.os === "windows" ? `${baseName}.exe` : baseName;
  const targetPath = path.join(binDir, exeName);

  // 1. 检查是否已存在
  if (await exists(targetPath)) {
    return targetPath;
  }

  // 2. 获取具体的 CLI 版本号
  const cliVersion = getCliVersion(version);

  // 3. 构造下载 URL（根据操作系统和架构）
  const os = Deno.build.os === "darwin" ? "macos" : Deno.build.os;
  const arch = Deno.build.arch === "aarch64" ? "arm64" : "x64";
  const url =
    `https://github.com/tailwindlabs/tailwindcss/releases/download/${cliVersion}/tailwindcss-${os}-${arch}${
      Deno.build.os === "windows" ? ".exe" : ""
    }`;

  console.log(`📥 正在下载 Tailwind CLI ${version} (${cliVersion})...`);
  console.log(`   目标路径: ${targetPath}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `下载失败: HTTP ${response.status} ${response.statusText}`,
      );
    }

    // 获取文件大小（用于显示进度）
    const contentLength = response.headers.get("content-length");
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    // 4. 创建 bin 目录（如果不存在）
    await Deno.mkdir(binDir, { recursive: true });

    // 5. 下载并写入文件（带进度条）
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("无法读取响应流");
    }

    const chunks: Uint8Array[] = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      loaded += value.length;

      // 显示进度条
      if (total > 0) {
        showProgress(loaded, total);
      } else {
        // 如果不知道总大小，显示已下载的大小
        const size = (loaded / 1024 / 1024).toFixed(2);
        Deno.stdout.writeSync(
          new TextEncoder().encode(`\r📥 下载中: ${size}MB...`),
        );
      }
    }

    // 换行，清除进度条
    console.log("");

    // 合并所有 chunks 并写入文件
    const fileData = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      fileData.set(chunk, offset);
      offset += chunk.length;
    }

    await Deno.writeFile(targetPath, fileData, { mode: 0o755 });

    console.log(`✅ Tailwind CLI 下载完成: ${targetPath}`);

    return targetPath;
  } catch (error) {
    console.error(`❌ Tailwind CLI 下载失败:`, error);
    throw new Error(
      `无法下载 Tailwind CLI: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
