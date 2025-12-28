/**
 * Tailwind CLI 下载工具
 * 用于在编译时自动下载 Tailwind CLI 可执行文件
 */

import { exists } from "@std/fs/exists";
import * as path from "@std/path";

/**
 * 确保 Tailwind CLI 可执行文件存在
 * 如果不存在，则自动下载
 *
 * @param cliPath 自定义 CLI 路径（可选，如果提供则使用该路径）
 * @param version Tailwind CLI 版本，默认为 "v4.0.0"
 * @returns CLI 可执行文件的完整路径
 *
 * @example
 * ```ts
 * const cliPath = await ensureTailwindCli();
 * // 返回: ./bin/tailwindcss (或 ./bin/tailwindcss.exe)
 * ```
 */
export async function ensureTailwindCli(
  cliPath?: string,
  version: string = "v4.0.0",
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
  const binDir = path.resolve(Deno.cwd(), "bin");
  const exeName = Deno.build.os === "windows"
    ? "tailwindcss.exe"
    : "tailwindcss";
  const targetPath = path.join(binDir, exeName);

  // 1. 检查是否已存在
  if (await exists(targetPath)) {
    return targetPath;
  }

  // 2. 构造下载 URL（根据操作系统和架构）
  const os = Deno.build.os === "darwin" ? "macos" : Deno.build.os;
  const arch = Deno.build.arch === "aarch64" ? "arm64" : "x64";
  const url =
    `https://github.com/tailwindlabs/tailwindcss/releases/download/${version}/tailwindcss-${os}-${arch}${
      Deno.build.os === "windows" ? ".exe" : ""
    }`;

  console.log(`📥 正在下载 Tailwind CLI (${version})...`);
  console.log(`   目标路径: ${targetPath}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `下载失败: HTTP ${response.status} ${response.statusText}`,
      );
    }

    // 3. 创建 bin 目录（如果不存在）
    await Deno.mkdir(binDir, { recursive: true });

    // 4. 下载并写入文件
    const fileData = new Uint8Array(await response.arrayBuffer());
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
