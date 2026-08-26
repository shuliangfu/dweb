/**
 * dweb 代码生成命令
 *
 * 职责：
 * - 根据类型和名称生成 route 页面、api 接口、model 模型、service 服务、console 命令
 * - 使用 runtime-adapter 保证 Deno/Bun 兼容
 * - 支持 useSrc 检测及多应用 --app 选项
 * - 按目标 app 的 kind 给出路径/警告（api 平铺 routes/；console 生成 CLI 动作）
 *
 * model 多应用规则：有 common 目录则放 common/models，无 common 则放应用 models（无则创建）
 *
 * 运行方式：
 * - dweb-cli generate -t service -n User
 * - dweb-cli g -t route -n about
 * - dweb-cli g -t api -n users
 * - dweb-cli g -t console -n hello/world
 * - dweb-cli g -t model -n User -a frontend
 * - dweb-cli g -t route -n about -a frontend
 */

import { error, info, success, warning } from "@dreamer/console";
import { $tr } from "../utils/i18n.ts";
import {
  cwd,
  dirname,
  ensureDir,
  exists,
  join,
  readTextFile,
  stat,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { kebabCase, pascalCase } from "@dreamer/utils/string";
import type { ParsedOptions } from "../feature/command.ts";
import type { AppKind } from "../types/app.ts";
import { DwebErrorCode, isDwebError, throwDwebError } from "../utils/errors.ts";
import { getProjectInfo } from "../utils/project.ts";
import { resolveConsoleRoot } from "../utils/console-root.ts";

/**
 * 生成命令选项
 */
export interface GenerateOptions {
  /** 生成类型：route / api / model / service / console（简写 r, a, m, s, c） */
  type: string;
  /** 名称 */
  name: string;
  /** 应用名（多应用时指定，如 backend、frontend、console） */
  app?: string;
}

/** 从 config/main.ts 文本猜测 kind */
export function detectKindFromConfigText(text: string): AppKind | null {
  const m = text.match(/\bkind:\s*["'](web|api|console)["']/);
  return (m?.[1] as AppKind | undefined) ?? null;
}

async function detectAppKind(basePath: string): Promise<AppKind | null> {
  const configPath = join(basePath, "config", "main.ts");
  if (!(await exists(configPath))) return null;
  try {
    return detectKindFromConfigText(await readTextFile(configPath));
  } catch {
    return null;
  }
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
/**
 * @param opts.apiFlat kind=api 时 handler 平铺在 routes/，不强制 routes/api/
 */
function getGenerateContent(
  basePath: string,
  type: string,
  name: string,
  opts: { apiFlat?: boolean } = {},
): { targetPath: string; content: string } {
  const typeLower = type.toLowerCase();
  const namePascal = pascalCase(name.replace(/\//g, "-"));
  const nameKebab = kebabCase(name.replace(/\//g, "-"));

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
      // kind=api：平铺 routes/<name>.ts；web：沿用 routes/api/<name>.ts
      const targetPath = opts.apiFlat
        ? join(basePath, "routes", `${nameKebab}.ts`)
        : join(basePath, "routes", "api", `${nameKebab}.ts`);
      const urlPath = opts.apiFlat ? `/${nameKebab}` : `/api/${nameKebab}`;
      const helloMsg = $tr("generate.templateApiHelloMessage", {
        name: namePascal,
      });
      const createdMsg = $tr("generate.templateApiCreatedMessage");
      const apiComment1 = $tr("generate.templateApiCommentLine1", {
        name: namePascal,
      });
      const apiComment2 = $tr("generate.templateApiCommentLine2");
      const content = `/**
 * ${apiComment1}
 * ${apiComment2}
 */

import type { ApiContext } from "@dreamer/dweb";
import { json } from "@dreamer/router";

/**
 * GET ${urlPath}
 */
export async function GET(_ctx: ApiContext) {
  return json({ message: ${JSON.stringify(helloMsg)} });
}

/**
 * POST ${urlPath}
 */
export async function POST(ctx: ApiContext) {
  const body = (ctx.body as Record<string, unknown> | undefined) ??
    await ctx.req.json().catch(() => ({}));
  return json({ message: ${JSON.stringify(createdMsg)}, data: body });
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

// 预留接口：根据业务补充字段，可集成 @dreamer/database Model
export interface ${namePascal} {
  id: string;
  // 添加其他字段
}

// 预留接口：实现 CRUD 等模型方法
export class ${namePascal}Model {
  // 实现 create、findById、update、delete 等方法
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
    case "console":
    case "c": {
      // 支持 user/seed → routes/user/seed.ts；hello → routes/hello.ts
      const segments = name.replace(/^\/+|\/+$/g, "").split("/").filter(
        Boolean,
      );
      if (segments.length === 0) {
        throwDwebError(DwebErrorCode.GENERATE_TYPE_UNSUPPORTED, { type });
      }
      const fileSegments = segments.map((s) => kebabCase(s));
      const targetPath = join(basePath, "routes", ...fileSegments) + ".ts";
      const routeName = fileSegments.join("/");
      const content = `/**
 * Console 命令: ${routeName}
 *
 * 用法:
 *   dweb-cli run ${routeName}
 */

import type { ConsoleContext } from "@dreamer/dweb";

export const meta = {
  description: "${namePascal} console command",
  actions: {
    run: { description: "Run ${routeName}" },
  },
};

/** 默认动作（dweb-cli run ${routeName}） */
export async function run(ctx: ConsoleContext): Promise<void> {
  ctx.log.info("console command: ${routeName}");
  // ctx.args / ctx.options — 来自 dweb-cli run ${routeName} -- --flag
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
  let app = options.app as string | undefined;

  if (!type || !name) {
    error($tr("generate.needTypeAndName"));
    error($tr("generate.exampleGenerate"));
    return;
  }

  const projectRoot = cwd();
  const projectInfo = await getProjectInfo(projectRoot);
  const typeLower = type.toLowerCase();
  const isConsoleType = typeLower === "console" || typeLower === "c";
  const isRouteType = typeLower === "route" || typeLower === "r";
  const isApiType = typeLower === "api" || typeLower === "a";

  // console 生成：多应用默认落到 console 根
  if (isConsoleType && projectInfo?.mode === "multi" && !app) {
    try {
      const consoleRoot = await resolveConsoleRoot(projectRoot);
      const useSrc = await detectUseSrc(projectRoot);
      const prefix = useSrc ? join(projectRoot, "src") : projectRoot;
      app = consoleRoot === prefix
        ? undefined
        : consoleRoot.replace(prefix + "/", "").replace(prefix + "\\", "");
      if (!app && consoleRoot !== prefix) {
        app = "console";
      }
      if (app) {
        info($tr("generate.consoleDefaultApp", { app }));
      }
    } catch {
      warning($tr("generate.consoleRootMissing"));
    }
  }

  if (
    app && projectInfo?.mode === "multi" && !projectInfo.appNames.includes(app)
  ) {
    // console 不在 deno tasks 的 appNames 里时仍允许 -a console
    if (!(isConsoleType && app === "console")) {
      error($tr("common.appNotFound", { app }));
      error(
        $tr("common.availableApps", { apps: projectInfo.appNames.join(", ") }),
      );
      return;
    }
  }

  info(
    app
      ? $tr("generate.generatingWithApp", { type, name, app })
      : $tr("generate.generating", { type, name }),
  );

  try {
    const isModel = typeLower === "model" || typeLower === "m";

    // model 类型在多应用模式下：有 common 放 common/models，无 common 放应用 models（无则创建）
    const basePath = isModel && projectInfo
      ? await getModelBasePathForMultiApp(projectRoot, app, projectInfo)
      : isConsoleType && projectInfo?.mode === "multi"
      ? await resolveConsoleRoot(projectRoot, { app: app ?? "console" })
      : await getGenerateBasePath(projectRoot, app);

    const kind = await detectAppKind(basePath);

    // kind 与生成类型交叉警告
    if (kind === "console" && (isRouteType || isApiType)) {
      warning($tr("generate.warnRouteOnConsole", { type }));
    }
    if (kind === "api" && isRouteType) {
      warning($tr("generate.warnPageOnApi"));
    }
    if (kind === "web" && isConsoleType) {
      warning($tr("generate.warnConsoleOnWeb"));
    }
    if (
      (kind === "api" || kind === "web") && isConsoleType &&
      projectInfo?.mode === "single"
    ) {
      warning($tr("generate.warnConsoleOnHttpApp"));
    }

    const { targetPath, content } = getGenerateContent(basePath, type, name, {
      apiFlat: kind === "api",
    });

    // 确保目录存在（含 models，无则创建）
    await ensureDir(dirname(targetPath));

    // 检查文件是否已存在
    try {
      await stat(targetPath);
      error($tr("generate.fileExists", { path: targetPath }));
      return;
    } catch {
      // 文件不存在，可以创建
    }

    // 写入文件
    await writeTextFile(targetPath, content);

    success($tr("generate.generateComplete", { type, name }));
    info($tr("generate.filePath", { path: targetPath }));
    if (isConsoleType) {
      const routeHint = name.replace(/^\/+|\/+$/g, "").split("/").filter(
        Boolean,
      ).map((s) => kebabCase(s)).join("/");
      info($tr("generate.consoleRunHint", { route: routeHint }));
    }
  } catch (err) {
    if (
      isDwebError(err) && err.code === DwebErrorCode.GENERATE_TYPE_UNSUPPORTED
    ) {
      error(err.message);
      error($tr("generate.supportedTypes"));
    } else {
      error(
        $tr("generate.generateFailed", {
          type,
          message: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }
}
