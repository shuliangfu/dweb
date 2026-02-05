/**
 * dweb 代码生成命令
 *
 * 职责：
 * - 根据类型和名称生成 route 页面、api 接口、model 模型、service 服务
 * - 使用 runtime-adapter 保证 Deno/Bun 兼容
 * - 支持 useSrc 检测及多应用 --app 选项
 *
 * model 多应用规则：有 common 目录则放 common/models，无 common 则放应用 models（无则创建）
 *
 * 运行方式：
 * - dweb-cli generate -t service -n User
 * - dweb-cli g -t route -n about
 * - dweb-cli g -t api -n users
 * - dweb-cli g -t model -n User -a frontend  # 多应用：有 common 放 common/models
 * - dweb-cli g -t route -n about -a frontend  # 多应用时指定应用
 */

import { error, info, success } from "@dreamer/console";
import {
  cwd,
  dirname,
  ensureDir,
  exists,
  join,
  stat,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { kebabCase, pascalCase } from "@dreamer/utils/string";
import type { ParsedOptions } from "../feature/command.ts";
import {
  DwebErrorCode,
  isDwebError,
  throwDwebError,
} from "../utils/errors.ts";
import { getProjectInfo } from "../utils/project.ts";

/**
 * 生成命令选项
 */
export interface GenerateOptions {
  /** 生成类型：route 页面、api 接口、model 模型、service 服务（支持简写 r, a, m, s） */
  type: string;
  /** 名称 */
  name: string;
  /** 应用名（多应用时指定，如 backend、frontend） */
  app?: string;
}

/**
 * 检测项目是否使用 src 目录
 * 优先检查 src/routes 或 src/main.ts 是否存在
 */
async function detectUseSrc(projectRoot: string): Promise<boolean> {
  const srcRoutes = join(projectRoot, "src", "routes");
  const srcMain = join(projectRoot, "src", "main.ts");
  const rootRoutes = join(projectRoot, "routes");
  if (await exists(srcRoutes) || await exists(srcMain)) {
    return true;
  }
  if (await exists(rootRoutes)) {
    return false;
  }
  return true;
}

/**
 * 检测 common 目录是否存在
 *
 * @param projectRoot 项目根目录
 * @param useSrc 是否使用 src 目录
 * @returns common 目录是否存在
 */
async function detectCommonExists(
  projectRoot: string,
  useSrc: boolean,
): Promise<boolean> {
  const commonPath = useSrc
    ? join(projectRoot, "src", "common")
    : join(projectRoot, "common");
  return await exists(commonPath);
}

/**
 * 获取生成目标的基础路径（含 src 或应用目录）
 */
async function getGenerateBasePath(
  projectRoot: string,
  app?: string,
): Promise<string> {
  const useSrc = await detectUseSrc(projectRoot);
  const prefix = useSrc ? "src" : "";
  if (app) {
    return join(projectRoot, prefix, app);
  }
  return join(projectRoot, prefix);
}

/**
 * 获取 model 类型在多应用模式下的基础路径
 *
 * 规则：有 common 则放在 common/models；无 common 则放在应用下的 models（无则创建）
 *
 * @param projectRoot 项目根目录
 * @param app 应用名（多应用时指定）
 * @param projectInfo 项目信息
 * @returns model 的基础路径
 */
async function getModelBasePathForMultiApp(
  projectRoot: string,
  app: string | undefined,
  projectInfo: { mode: string; appNames: string[] } | null,
): Promise<string> {
  const useSrc = await detectUseSrc(projectRoot);
  const prefix = useSrc ? "src" : "";

  // 多应用模式下
  if (projectInfo?.mode === "multi") {
    const hasCommon = await detectCommonExists(projectRoot, useSrc);
    if (hasCommon) {
      return join(projectRoot, prefix, "common");
    }
    // 无 common：使用应用目录（指定了 app 用 app，否则用第一个应用）
    const targetApp = app ?? projectInfo.appNames[0];
    return join(projectRoot, prefix, targetApp);
  }

  // 单应用：使用默认逻辑
  return getGenerateBasePath(projectRoot, app);
}

/**
 * 根据类型和名称生成代码内容
 *
 * 使用 @dreamer/utils 的 pascalCase、kebabCase 规范化 name：
 * - pascalCase：类名、接口名、组件名（如 UserOrdersService）
 * - kebabCase：文件路径、URL 路径（如 user-orders.ts、/api/user-orders）
 *
 * @param basePath 基础路径（项目根下的 src 或 src/appName 或 appName）
 * @param type 生成类型
 * @param name 名称（支持 user_orders、user-orders、UserOrders 等格式）
 * @returns { targetPath, content } 目标路径和文件内容
 */
function getGenerateContent(
  basePath: string,
  type: string,
  name: string,
): { targetPath: string; content: string } {
  const typeLower = type.toLowerCase();
  const namePascal = pascalCase(name);
  const nameKebab = kebabCase(name);

  switch (typeLower) {
    case "service":
    case "s": {
      const targetPath = join(basePath, "services", `${nameKebab}.ts`);
      const content = `/**
 * ${namePascal} 服务
 */

export class ${namePascal}Service {
  /**
   * 示例方法
   */
  async example(): Promise<string> {
    return "Hello from ${namePascal}Service";
  }
}
`;
      return { targetPath, content };
    }
    case "api":
    case "a": {
      const targetPath = join(basePath, "routes", "api", `${nameKebab}.ts`);
      const content = `/**
 * ${namePascal} API 接口
 * 使用 Web 标准 Request/Response，与 @dreamer/router 的 apiMode: "restful" 兼容
 */

import { json } from "@dreamer/router";

/**
 * GET /api/${nameKebab}
 */
export async function GET(_request: Request) {
  return json({ message: "Hello from ${namePascal} API" });
}

/**
 * POST /api/${nameKebab}
 */
export async function POST(request: Request) {
  const body = await request.json();
  return json({ message: "Created", data: body });
}
`;
      return { targetPath, content };
    }
    case "model":
    case "m": {
      const targetPath = join(basePath, "models", `${nameKebab}.ts`);
      const content = `/**
 * ${namePascal} 数据模型
 */

// TODO: 实现数据模型
export interface ${namePascal} {
  id: string;
  // 添加其他字段
}

export class ${namePascal}Model {
  // TODO: 实现模型方法
}
`;
      return { targetPath, content };
    }
    case "route":
    case "r": {
      const targetPath = join(basePath, "routes", `${nameKebab}.tsx`);
      const content = `/**
 * ${namePascal} 路由页面
 */

export default function ${namePascal}Page() {
  return (
    <div>
      <h1>${namePascal}</h1>
      <p>这是 ${namePascal} 页面</p>
    </div>
  );
}
`;
      return { targetPath, content };
    }
    default: {
      throwDwebError(DwebErrorCode.GENERATE_TYPE_UNSUPPORTED, { type });
    }
  }
}

/**
 * 生成命令主入口
 *
 * @param _args 命令行参数（未使用）
 * @param options 解析后的选项，需包含 type、name，可选 app
 */
export async function main(
  _args: string[],
  options: ParsedOptions,
): Promise<void> {
  const type = options.type as string;
  const name = options.name as string;
  const app = options.app as string | undefined;

  if (!type || !name) {
    error($t("generate.needTypeAndName"));
    error($t("generate.exampleGenerate"));
    return;
  }

  const projectRoot = cwd();
  const projectInfo = await getProjectInfo(projectRoot);

  if (
    app && projectInfo?.mode === "multi" && !projectInfo.appNames.includes(app)
  ) {
    error($t("common.appNotFound", { app }));
    error($t("common.availableApps", { apps: projectInfo.appNames.join(", ") }));
    return;
  }

  info(
    app
      ? $t("generate.generatingWithApp", { type, name, app })
      : $t("generate.generating", { type, name }),
  );

  try {
    const typeLower = type.toLowerCase();
    const isModel = typeLower === "model" || typeLower === "m";

    // model 类型在多应用模式下：有 common 放 common/models，无 common 放应用 models（无则创建）
    const basePath = isModel && projectInfo
      ? await getModelBasePathForMultiApp(projectRoot, app, projectInfo)
      : await getGenerateBasePath(projectRoot, app);

    const { targetPath, content } = getGenerateContent(basePath, type, name);

    // 确保目录存在（含 models，无则创建）
    await ensureDir(dirname(targetPath));

    // 检查文件是否已存在
    try {
      await stat(targetPath);
      error($t("generate.fileExists", { path: targetPath }));
      return;
    } catch {
      // 文件不存在，可以创建
    }

    // 写入文件
    await writeTextFile(targetPath, content);

    success($t("generate.generateComplete", { type, name }));
    info($t("generate.filePath", { path: targetPath }));
  } catch (err) {
    if (isDwebError(err) && err.code === DwebErrorCode.GENERATE_TYPE_UNSUPPORTED) {
      error(err.message);
      error($t("generate.supportedTypes"));
    } else {
      error(
        $t("generate.generateFailed", {
          type,
          message: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }
}
