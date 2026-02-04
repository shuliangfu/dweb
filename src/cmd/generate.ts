/**
 * dweb 代码生成命令
 *
 * 职责：
 * - 根据类型和名称生成 route 页面、api 接口、model 模型、service 服务
 * - 使用 runtime-adapter 保证 Deno/Bun 兼容
 *
 * 运行方式：
 * - dweb-cli generate -t service -n User
 * - dweb-cli g -t route -n about
 * - dweb-cli g -t api -n users
 */

import { error, info, success } from "@dreamer/console";
import {
  cwd,
  dirname,
  join,
  mkdir,
  stat,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import type { ParsedOptions } from "../feature/command.ts";

/**
 * 生成命令选项
 */
export interface GenerateOptions {
  /** 生成类型：route 页面、api 接口、model 模型、service 服务（支持简写 r, a, m, s） */
  type: string;
  /** 名称 */
  name: string;
}

/**
 * 根据类型和名称生成代码内容
 *
 * @param type 生成类型
 * @param name 名称
 * @returns { targetPath, content } 目标路径和文件内容
 */
function getGenerateContent(
  type: string,
  name: string,
): { targetPath: string; content: string } {
  const currentDir = cwd();
  const typeLower = type.toLowerCase();

  switch (typeLower) {
    case "service":
    case "s": {
      const targetPath = join(currentDir, "src", "services", `${name}.ts`);
      const content = `/**
 * ${name} 服务
 */

export class ${name}Service {
  /**
   * 示例方法
   */
  async example(): Promise<string> {
    return "Hello from ${name}Service";
  }
}
`;
      return { targetPath, content };
    }
    case "api":
    case "a": {
      const targetPath = join(currentDir, "src", "routes", "api", `${name}.ts`);
      const content = `/**
 * ${name} API 接口
 */

import type { Request, Response } from "@dreamer/server";

/**
 * GET /api/${name}
 */
export async function GET(req: Request, res: Response) {
  return res.json({ message: "Hello from ${name} API" });
}

/**
 * POST /api/${name}
 */
export async function POST(req: Request, res: Response) {
  const body = await req.json();
  return res.json({ message: "Created", data: body });
}
`;
      return { targetPath, content };
    }
    case "model":
    case "m": {
      const targetPath = join(currentDir, "src", "models", `${name}.ts`);
      const content = `/**
 * ${name} 数据模型
 */

// TODO: 实现数据模型
export interface ${name} {
  id: string;
  // 添加其他字段
}

export class ${name}Model {
  // TODO: 实现模型方法
}
`;
      return { targetPath, content };
    }
    case "route":
    case "r": {
      const targetPath = join(currentDir, "src", "routes", `${name}.tsx`);
      const content = `/**
 * ${name} 路由页面
 */

export default function ${name}Page() {
  return (
    <div>
      <h1>${name}</h1>
      <p>这是 ${name} 页面</p>
    </div>
  );
}
`;
      return { targetPath, content };
    }
    default: {
      throw new Error(`不支持的生成类型: ${type}`);
    }
  }
}

/**
 * 生成命令主入口
 *
 * @param _args 命令行参数（未使用）
 * @param options 解析后的选项，需包含 type、name
 */
export async function main(
  _args: string[],
  options: ParsedOptions,
): Promise<void> {
  const type = options.type as string;
  const name = options.name as string;

  if (!type || !name) {
    error("请指定 --type 和 --name 参数");
    error("示例: dweb-cli generate -t service -n User");
    return;
  }

  info(`正在生成 ${type}: ${name}`);

  try {
    const { targetPath, content } = getGenerateContent(type, name);

    // 确保目录存在
    await mkdir(dirname(targetPath), { recursive: true });

    // 检查文件是否已存在
    try {
      await stat(targetPath);
      error(`文件已存在: ${targetPath}`);
      return;
    } catch {
      // 文件不存在，可以创建
    }

    // 写入文件
    await writeTextFile(targetPath, content);

    success(`${type} ${name} 生成完成！`);
    info(`文件路径: ${targetPath}`);
  } catch (err) {
    if (err instanceof Error && err.message.includes("不支持的生成类型")) {
      error(err.message);
      error("支持的类型: route, api, model, service（或简写 r, a, m, s）");
    } else {
      error(
        `生成 ${type} 失败: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
