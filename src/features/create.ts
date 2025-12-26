/**
 * 项目创建工具
 * 用于快速创建新的 DWeb 项目
 */

import * as path from '@std/path';
import { ensureDir } from '@std/fs/ensure_dir';
import { readDenoJson } from '../utils/file.ts';

/**
 * 从框架的 deno.json 读取版本号
 * 优先从框架自身的位置读取，而不是从用户项目目录
 * 支持从 JSR 导入时正确获取版本号
 */
async function getFrameworkVersion(): Promise<string> {
  try {
    // 使用 import.meta.url 获取当前文件的位置
    const currentFileUrl = new URL(import.meta.url);
    
    let currentDir: string;
    
    // 处理不同的协议
    if (currentFileUrl.protocol === 'file:') {
      // 本地文件系统路径
      // 在 Windows 上，pathname 可能以 / 开头，需要处理
      let filePath = currentFileUrl.pathname;
      // 移除开头的 /（如果有），在 Windows 上这会导致路径错误
      if (Deno.build.os === 'windows' && filePath.startsWith('/')) {
        filePath = filePath.substring(1);
      }
      currentDir = path.dirname(filePath);
    } else if (currentFileUrl.protocol === 'https:' || currentFileUrl.protocol === 'http:') {
      // 从 JSR 或其他 HTTP 源导入
      
      // 方法1: 优先匹配 JSR 格式：/@scope/package/版本号/
      // JSR URL 格式：https://jsr.io/@dreamer/dweb/1.0.5/src/features/create.ts
      // 路径格式：/@dreamer/dweb/1.0.5/src/features/create.ts
      const jsrMatch = currentFileUrl.pathname.match(/\/@[\w-]+\/[\w-]+\/([\d.]+)\//);
      if (jsrMatch && jsrMatch[1]) {
        return jsrMatch[1];
      }
      
      // 方法2: 匹配路径中的版本号格式 /版本号/（备用方案）
      // 例如：/1.0.5/src/features/create.ts
      const versionMatch = currentFileUrl.pathname.match(/\/([\d.]+)\//);
      if (versionMatch && versionMatch[1]) {
        // 验证版本号格式（至少包含一个点，如 1.0.5）
        if (versionMatch[1].includes('.')) {
          return versionMatch[1];
        }
      }
      
      // 方法3: 匹配包含 @ 符号的格式（如 @1.0.5 或 @^1.0.5）
      // 例如：https://deno.land/x/dreamer_dweb@1.0.2/src/features/create.ts
      const atMatch = currentFileUrl.pathname.match(/@([\^~]?)([\d.]+)\//);
      if (atMatch && atMatch[2]) {
        return atMatch[2];
      }
      
      // 方法4: 从完整 href 中匹配
      const hrefMatch = currentFileUrl.href.match(/@dreamer\/dweb@?([\^~]?)([\d.]+)/);
      if (hrefMatch && hrefMatch[2]) {
        return hrefMatch[2];
      }
      
      // 如果都匹配不到，使用默认版本
      return '1.0.0';
    } else {
      // 其他协议，使用默认版本
      return '1.0.0';
    }
    
    // 从当前文件位置向上查找框架的 deno.json
    // create.ts 位于 src/features/，deno.json 在项目根目录（向上 2 层）
    let searchDir = currentDir;
    const maxDepth = 5; // 最多向上查找 5 层目录
    
    for (let i = 0; i < maxDepth; i++) {
      try {
        const denoJson = await readDenoJson(searchDir);
        // 验证是否是框架的 deno.json（检查 name 字段）
        if (denoJson && denoJson.name === '@dreamer/dweb' && denoJson.version) {
          return denoJson.version;
        }
      } catch (_error) {
        // 文件不存在或读取失败，继续向上查找
      }
      
      // 向上查找父目录
      const parentDir = path.dirname(searchDir);
      if (parentDir === searchDir) {
        // 已到达根目录，停止查找
        break;
      }
      searchDir = parentDir;
    }
    
    // 方法2: 如果找不到，尝试从当前工作目录读取（向后兼容，仅用于开发环境）
    // 注意：这仅在开发框架时有用，从 JSR 导入时不应依赖此方法
    try {
      const denoJson = await readDenoJson();
      if (denoJson && denoJson.name === '@dreamer/dweb' && denoJson.version) {
        return denoJson.version;
      }
    } catch (_error) {
      // 忽略错误
    }
    
    // 如果都找不到，返回默认版本
    return '1.0.0';
  } catch (_error) {
    // 如果读取失败，返回默认版本
    return '1.0.0';
  }
}

/**
 * DWeb 框架的 JSR 包 URL（用于生成项目模板中的导入路径）
 * 用户可以在创建项目时指定，或使用默认值
 */
let frameworkUrl = '';

/**
 * 设置框架 URL（用于从 JSR 或其他源导入）
 */
export function setFrameworkUrl(url: string): void {
  frameworkUrl = url;
}

/**
 * 获取框架 URL
 * 如果未设置，则从 deno.json 读取版本号并构建 JSR URL
 */
export async function getFrameworkUrl(): Promise<string> {
  if (!frameworkUrl) {
    const version = await getFrameworkVersion();
    frameworkUrl = `jsr:@dreamer/dweb@^${version}`;
  }
  return frameworkUrl;
}

/**
 * 项目模板配置
 */
interface ProjectTemplate {
  name: string;
  description: string;
}

/**
 * 交互式输入提示
 */
async function prompt(question: string): Promise<string> {
  const buf = new Uint8Array(1024);
  await Deno.stdout.write(new TextEncoder().encode(question));
  const n = await Deno.stdin.read(buf);
  if (n === null) {
    throw new Error('无法读取输入');
  }
  return new TextDecoder().decode(buf.subarray(0, n)).trim();
}

/**
 * 选择提示（从多个选项中选择）
 * @param question 问题描述
 * @param options 选项列表
 * @param defaultIndex 默认选项索引（从 0 开始，如果用户直接回车则使用此选项）
 * @returns 选中的选项
 */
async function select(question: string, options: string[], defaultIndex: number = 0): Promise<string> {
  console.log(question);
  options.forEach((option, index) => {
    const defaultMark = index === defaultIndex ? ' (默认)' : '';
    console.log(`  ${index + 1}. ${option}${defaultMark}`);
  });
  const defaultPrompt = defaultIndex >= 0 ? ` [默认: ${defaultIndex + 1}]` : '';
  const answer = await prompt(`请选择 (1-${options.length})${defaultPrompt}: `);
  
  // 如果用户直接回车，使用默认值
  if (!answer || answer.trim() === '') {
    return options[defaultIndex];
  }
  
  const index = parseInt(answer) - 1;
  if (index >= 0 && index < options.length) {
    return options[index];
  }
  throw new Error(`无效的选择: ${answer}`);
}

/**
 * 交互式菜单选择（支持上下键导航）
 * @param message 提示信息
 * @param options 选项列表
 * @param defaultValue 默认选项索引
 * @returns 选中的选项索引
 */
async function interactiveSelect(
  message: string,
  options: string[],
  defaultValue = 0
): Promise<number> {
  const encoder = new TextEncoder();
  let selectedIndex = defaultValue;

  // 显示菜单
  const renderMenu = () => {
    // 清除屏幕并移动光标到顶部
    Deno.stdout.writeSync(encoder.encode("\x1b[2J\x1b[H"));
    
    // 显示标题
    console.log(`${message}\n`);
    
    // 显示选项
    options.forEach((option, index) => {
      if (index === selectedIndex) {
        // 选中的选项：高亮显示
        console.log(`  ▶ ${option}`);
      } else {
        // 未选中的选项：普通显示
        console.log(`    ${option}`);
      }
    });
    
    console.log(`\n使用 ↑↓ 键选择，Enter 确认`);
  };

  // 尝试使用原始模式
  try {
    // 隐藏光标
    Deno.stdout.writeSync(encoder.encode("\x1b[?25l"));
    
    // 启用原始模式
    const stdin = Deno.stdin;
    const isRaw = Deno.stdin.setRaw !== undefined;
    
    if (isRaw) {
      Deno.stdin.setRaw(true, { cbreak: true });
    }
    
    renderMenu();

    while (true) {
      const buf = new Uint8Array(10);
      const n = await stdin.read(buf);
      
      if (n === null || n === 0) {
        continue;
      }

      const bytes = buf.subarray(0, n);
      
      // 处理方向键（ANSI 转义序列）
      // 上箭头: \x1b[A 或 \x1bOA
      // 下箭头: \x1b[B 或 \x1bOB
      if (bytes[0] === 0x1b && bytes[1] === 0x5b) {
        if (bytes[2] === 0x41) {
          // 上箭头
          selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : options.length - 1;
          renderMenu();
        } else if (bytes[2] === 0x42) {
          // 下箭头
          selectedIndex = selectedIndex < options.length - 1 ? selectedIndex + 1 : 0;
          renderMenu();
        }
      } else if (bytes[0] === 0x0d || bytes[0] === 0x0a) {
        // Enter 键
        break;
      } else if (bytes[0] === 0x1b || bytes[0] === 0x03) {
        // Esc 或 Ctrl+C
        // 恢复终端
        Deno.stdout.writeSync(encoder.encode("\x1b[?25h"));
        if (isRaw) {
          Deno.stdin.setRaw(false);
        }
        Deno.exit(0);
      }
    }
    
    // 恢复终端
    Deno.stdout.writeSync(encoder.encode("\x1b[?25h"));
    if (isRaw) {
      Deno.stdin.setRaw(false);
    }
    
    // 清屏
    Deno.stdout.writeSync(encoder.encode("\x1b[2J\x1b[H"));
    
    return selectedIndex;
  } catch (_err) {
    // 如果原始模式不支持，回退到普通选择
    console.log(message);
    options.forEach((option, index) => {
      const defaultMark = index === defaultValue ? ' (默认)' : '';
      console.log(`  ${index + 1}. ${option}${defaultMark}`);
    });
    const defaultPrompt = defaultValue >= 0 ? ` [默认: ${defaultValue + 1}]` : '';
    const answer = await prompt(`请选择 (1-${options.length})${defaultPrompt}: `);
    
    if (!answer || answer.trim() === '') {
      return defaultValue;
    }
    
    const index = parseInt(answer) - 1;
    if (index >= 0 && index < options.length) {
      return index;
    }
    return defaultValue;
  }
}

/**
 * 创建新项目（交互式）
 * @param projectName 项目名称（可选，如果提供则跳过交互式输入）
 * @param targetDir 目标目录（可选，默认为当前目录下的项目名称）
 * @param frameworkUrl 框架库的 URL（可选，用于从 GitHub 导入）
 */
export async function createApp(
  projectName?: string,
  targetDir?: string,
  frameworkUrlOverride?: string
): Promise<void> {
  // 如果提供了框架 URL，使用它
  if (frameworkUrlOverride) {
    setFrameworkUrl(frameworkUrlOverride);
  } else if (!frameworkUrl) {
    // 如果没有设置框架 URL，从 deno.json 读取版本号并构建 JSR URL
    const version = await getFrameworkVersion();
    const url = `jsr:@dreamer/dweb@^${version}`;
    setFrameworkUrl(url);
  }
  
  // 交互式输入项目名称（如果未提供）
  if (!projectName || projectName.trim() === '') {
    console.log('\n📦 创建新 DWeb 项目\n');
    projectName = await prompt('请输入项目名称: ');
  if (!projectName || projectName.trim() === '') {
    throw new Error('项目名称不能为空');
    }
  }

  // 验证项目名称（只允许字母、数字、连字符和下划线）
  if (!/^[a-zA-Z0-9_-]+$/.test(projectName)) {
    throw new Error('项目名称只能包含字母、数字、连字符和下划线');
  }

  const projectDir = targetDir || path.join(Deno.cwd(), projectName);

  // 检查目录是否已存在
  try {
    const stat = await Deno.stat(projectDir);
    if (stat.isDirectory) {
      throw new Error(`目录 ${projectDir} 已存在`);
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      // 目录不存在，可以继续
    } else {
      throw error;
    }
  }

  // 交互式选择：单应用还是多应用（默认单应用）
  const appMode = await select(
    '\n请选择应用模式:',
    ['单应用模式', '多应用模式'],
    0 // 默认选择第一个（单应用模式）
  );
  const isMultiApp = appMode === '多应用模式';
  
  // 如果是多应用模式，先收集应用名称
  const appNames: string[] = [];
  if (isMultiApp) {
    console.log('\n📝 请输入应用名称（至少一个，输入空行结束）:');
    let appName = '';
    let index = 1;
    while (true) {
      appName = await prompt(`应用 ${index} 名称: `);
      if (!appName || appName.trim() === '') {
        if (appNames.length === 0) {
          console.log('❌ 至少需要输入一个应用名称');
          continue;
        }
        break;
      }
      // 验证应用名称
      if (!/^[a-zA-Z0-9_-]+$/.test(appName)) {
        console.log('❌ 应用名称只能包含字母、数字、连字符和下划线');
        continue;
      }
      appNames.push(appName.trim());
      index++;
    }
  }
  
  // 交互式选择：Tailwind CSS 版本（默认 V4）
  const tailwindVersion = await select(
    '\n请选择 Tailwind CSS 版本:',
    ['V4 (推荐)', 'V3'],
    0 // 默认选择第一个（V4）
  );
  const useTailwindV4 = tailwindVersion === 'V4 (推荐)';
  
  // 交互式选择：渲染模式（默认 hybrid）
  const renderModeIndex = await interactiveSelect(
    '\n请选择渲染模式:',
    ['SSR (服务端渲染)', 'CSR (客户端渲染)', 'Hybrid (混合渲染)'],
    2 // 默认选择第三个（Hybrid）
  );
  const renderMode = ['SSR (服务端渲染)', 'CSR (客户端渲染)', 'Hybrid (混合渲染)'][renderModeIndex];
  const renderModeValue = renderMode === 'SSR (服务端渲染)' ? 'ssr' 
    : renderMode === 'CSR (客户端渲染)' ? 'csr' 
    : 'hybrid';
  
  // 交互式选择：API 路由模式（默认 method）
  const apiModeIndex = await interactiveSelect(
    '\n请选择 API 路由模式:',
    ['Method (方法路由，默认使用中划线格式，例如 /api/users/get-user)', 'REST (RESTful API，基于 HTTP 方法，例如 GET /api/users)'],
    0 // 默认选择第一个（Method）
  );
  const apiMode = apiModeIndex === 0 ? 'method' : 'rest';
  const apiModeDisplay = apiModeIndex === 0 ? 'Method (方法路由)' : 'REST (RESTful API)';
  
  console.log(`\n📦 正在创建项目: ${projectName}`);
  console.log(`📁 项目目录: ${projectDir}`);
  if (isMultiApp) {
    console.log(`📦 应用列表: ${appNames.join(', ')}`);
  }
  console.log(`🎨 Tailwind CSS: ${tailwindVersion}`);
  console.log(`🎭 渲染模式: ${renderMode}`);
  console.log(`🔌 API 模式: ${apiModeDisplay}\n`);

  // 创建项目目录
  await ensureDir(projectDir);

  // 创建子目录（仅单应用模式在根目录创建）
  if (!isMultiApp) {
  await ensureDir(path.join(projectDir, 'routes'));
  await ensureDir(path.join(projectDir, 'assets'));
  }

  // 生成配置文件
  await generateConfigFile(projectDir, projectName, isMultiApp, appNames, useTailwindV4, renderModeValue, apiMode);
  
  // 生成 deno.json
  await generateDenoJson(projectDir, useTailwindV4, isMultiApp, appNames);
  
  // 生成示例路由和组件
  await generateExampleRoutes(projectDir, isMultiApp, appNames, apiMode, useTailwindV4);
  
  // 生成 stores 目录和示例
  await generateStores(projectDir, isMultiApp, appNames);
  
  // 生成静态文件
  await generateStaticFiles(projectDir, isMultiApp, appNames, useTailwindV4);
  
  // 生成 main.ts
  await generateMainTs(projectDir, isMultiApp, appNames);
  
  // 生成 README
  await generateREADME(projectDir, projectName);
  
  // 生成 .gitignore
  await generateGitignore(projectDir);

  console.log(`✅ 项目创建成功！`);
  console.log(`\n📝 下一步：`);
  console.log(`  cd ${projectName}`);
  console.log(`  deno task dev`);
  console.log(`\n💡 提示：`);
  console.log(`  项目已配置为从 JSR 导入 DWeb 框架`);
  console.log(`  如需修改框架 URL，请编辑 dweb.config.ts 和 deno.json`);
}

/**
 * 生成 dweb.config.ts 文件
 */
async function generateConfigFile(
  projectDir: string,
  projectName: string,
  isMultiApp: boolean,
  appNames: string[],
  useTailwindV4: boolean,
  renderMode: string,
  apiMode: string
): Promise<void> {
  // 根据模式生成不同的配置
  let configContent: string;
  
  if (isMultiApp) {
    // 多应用模式配置
    const appsConfig = appNames.map((appName, index) => {
      const port = 3000 + index;
      return `    {
      name: '${appName}',
      renderMode: '${renderMode}', // 'ssr' | 'csr' | 'hybrid'
      server: {
        port: ${port},
        host: '127.0.0.1'
      },
      routes: {
        dir: '${appName}/routes',
        ignore: ['**/*.test.ts', '**/*.test.tsx'],
        // API 路由模式：'method'（方法路由，默认使用中划线格式，例如 /api/users/get-user）或 'rest'（RESTful API，基于 HTTP 方法，例如 GET /api/users）
        apiMode: '${apiMode}'
      },
      // 静态资源目录，默认为 'assets', prefix 为 /assets
      // static: {
      //   dir: '${appName}/assets',
      //   prefix: '/assets'
      // },
      plugins: [
        tailwind({
          version: '${useTailwindV4 ? 'v4' : 'v3'}',
          cssPath: '${appName}/assets/tailwind.css',
          optimize: true,
        }),
        // Store 状态管理插件（自动收集 stores 目录中的初始状态）
        store({
          persist: true, // 启用持久化，状态会保存到 localStorage
          storageKey: 'dweb-store',
        }),
      ],
      middleware: [
        cors({
          origin: '*',
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization'],
        }),
      ],
      // 构建配置
      build: {
        outDir: 'dist'
      },
    }`;
    }).join(',\n');
    
    configContent = `/**
 * DWeb 框架配置文件
 * 项目: ${projectName}
 * 模式: 多应用模式
 */

import { tailwind, cors, store, type DWebConfig } from '@dreamer/dweb';

const config: DWebConfig = {
  // 开发配置（全局，也可以在每个应用中配置）
  dev: {
    // open: true,
    hmrPort: 24678,
    reloadDelay: 300
  },
  
  // Cookie 配置（全局）
  cookie: {
    secret: 'your-secret-key-here'
  },
  
  // Session 配置（全局）
  session: {
    secret: 'your-secret-key-here',
    store: 'memory',
    maxAge: 3600, // 1小时（单位：秒）
    secure: false,
    httpOnly: true
  },
  
  // 应用列表
  apps: [
${appsConfig}
  ]
};

export default config;
`;
  } else {
    // 单应用模式配置
    configContent = `/**
 * DWeb 框架配置文件
 * 项目: ${projectName}
 * 模式: 单应用模式
 */

import { tailwind, cors, store, type AppConfig } from '@dreamer/dweb';


const config: AppConfig = {
  name: '${projectName}',
  renderMode: '${renderMode}', // 'ssr' | 'csr' | 'hybrid'
  
  // 服务器配置
  server: {
    port: 3000,
    host: '127.0.0.1'
  },
  
  // 路由配置
  routes: {
    dir: 'routes',
    ignore: ['**/*.test.ts', '**/*.test.tsx'],
    // API 路由模式：'method'（方法路由，默认使用中划线格式，例如 /api/users/get-user）或 'rest'（RESTful API，基于 HTTP 方法，例如 GET /api/users）
    apiMode: '${apiMode}'
  },
  
  // 静态资源目录，默认为 'assets', prefix 为 /assets
  // static: {
  //   dir: 'assets',
  //   prefix: '/assets'
  // },
  
  // 开发配置
  dev: {
    // open: true,
    hmrPort: 24678,
    reloadDelay: 300
  },
  
  // Cookie 配置
  cookie: {
    secret: 'your-secret-key-here'
  },
  
  // Session 配置
  session: {
    secret: 'your-secret-key-here',
    store: 'memory',
    maxAge: 3600, // 1小时（单位：秒）
    secure: false,
    httpOnly: true
  },
  
  // 插件配置
  plugins: [
    // Tailwind CSS ${useTailwindV4 ? 'v4' : 'v3'} 插件
    tailwind({
      version: '${useTailwindV4 ? 'v4' : 'v3'}',
      cssPath: 'assets/tailwind.css', // 指定主 CSS 文件路径
      optimize: true, // 生产环境优化
    }),
    // Store 状态管理插件（自动收集 stores 目录中的初始状态）
    store({
      persist: true, // 启用持久化，状态会保存到 localStorage
      storageKey: 'dweb-store',
    }),
  ],
  
  // 中间件配置
  middleware: [
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  ],
  
  // 构建配置
  build: {
    outDir: 'dist'
  }
};

export default config;
`;
  }

  const configPath = path.join(projectDir, 'dweb.config.ts');
  await Deno.writeTextFile(configPath, configContent);
  console.log(`✅ 已创建: dweb.config.ts`);
}

/**
 * 生成 deno.json 文件
 */
async function generateDenoJson(
  projectDir: string, 
  useTailwindV4: boolean,
  isMultiApp: boolean = false,
  appNames: string[] = []
): Promise<void> {
  const frameworkUrl = await getFrameworkUrl();
  
  const denoJsonContent = `{
  "version": "1.0.0",
  "description": "A DWeb framework project",
  "tasks": {
${isMultiApp ? [
  ...appNames.map(appName => `    "dev:${appName}": "deno run -A @dreamer/dweb/cli dev:${appName}"`),
  ...appNames.map(appName => `    "build:${appName}": "deno run -A @dreamer/dweb/cli build:${appName}"`),
  ...appNames.map(appName => `    "start:${appName}": "deno run -A @dreamer/dweb/cli start:${appName}"`)
].join(',\n') : `    "dev": "deno run -A @dreamer/dweb/cli dev",
    "build": "deno run -A @dreamer/dweb/cli build",
    "start": "deno run -A @dreamer/dweb/cli start"`}
  },
  "imports": {
    "@dreamer/dweb": "${frameworkUrl}",
    "preact": "https://esm.sh/preact@10.28.0",
    "preact/": "https://esm.sh/preact@10.28.0/",
    "preact/signals": "https://esm.sh/@preact/signals@1.2.2?external=preact"${useTailwindV4 ? `,
    "tailwindcss": "npm:tailwindcss@^4.1.10",
    "@tailwindcss/postcss": "npm:@tailwindcss/postcss@^4.1.10"` : `,
    "tailwindcss": "npm:tailwindcss@^3.4.0",
    "autoprefixer": "npm:autoprefixer@^10.4.20",
    "postcss": "npm:postcss@^8.4.47"`}
  },
  "nodeModulesDir": "auto",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact"
  }
}
`;

  const denoJsonPath = path.join(projectDir, 'deno.json');
  await Deno.writeTextFile(denoJsonPath, denoJsonContent);
  console.log(`✅ 已创建: deno.json`);
}

/**
 * 生成示例路由文件、组件和 API
 */
async function generateExampleRoutes(
  projectDir: string,
  isMultiApp: boolean,
  appNames: string[],
  apiMode: string,
  useTailwindV4: boolean
): Promise<void> {
  if (isMultiApp) {
    // 多应用模式：为每个应用生成路由和组件
    for (const appName of appNames) {
      const appRoutesDir = path.join(projectDir, appName, 'routes');
      const appComponentsDir = path.join(projectDir, appName, 'components');
      
      await ensureDir(appRoutesDir);
      await ensureDir(appComponentsDir);
      
    // 生成示例路由
    await generateRoutesForApp(appRoutesDir, appName, apiMode, useTailwindV4);
    
    // 生成示例组件
    await generateComponentsForApp(appComponentsDir, appName);
    
    // 生成示例 API
    await generateApiForApp(appRoutesDir, appName, apiMode);
    }
    
    // 为多应用项目创建 common 目录结构
    await generateCommonDirectory(projectDir);
  } else {
    // 单应用模式：在项目根目录生成
  const routesDir = path.join(projectDir, 'routes');
    const componentsDir = path.join(projectDir, 'components');
    
    await ensureDir(routesDir);
    await ensureDir(componentsDir);
    
    // 获取项目名称（从目录路径提取）
    const projectName = path.basename(projectDir);
    
    // 生成示例路由
    await generateRoutesForApp(routesDir, projectName, apiMode, useTailwindV4);
    
    // 生成示例组件
    await generateComponentsForApp(componentsDir, projectName);
    
    // 生成示例 API
    await generateApiForApp(routesDir, projectName, apiMode);
  }
}

/**
 * 为单个应用生成路由文件
 */
async function generateRoutesForApp(routesDir: string, appName: string, apiMode: string, useTailwindV4: boolean): Promise<void> {
  // 获取框架版本号
  const frameworkVersion = await getFrameworkVersion();

  // 生成 _app.tsx（根应用组件，框架必需）
  const appContent = `/**
 * 根应用组件
 * 这是框架必需的固定文件，用于包裹所有页面
 * 包含 HTML 文档结构（DOCTYPE、head、body 等）
 *
 * 注意：此文件是框架特定的，必须存在于 routes 目录下
 */

/**
 * 应用组件属性
 */
export interface AppProps {
  /** 页面内容（已渲染的 HTML） */
  children: string;
}

/**
 * 根应用组件
 * 提供完整的 HTML 文档结构
 * 注意：HMR 客户端脚本由框架在解析时自动注入
 */
export default function App({ children }: AppProps) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${appName}</title>
      </head>
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
`;

  await Deno.writeTextFile(path.join(routesDir, '_app.tsx'), appContent);
  console.log(`✅ 已创建: ${routesDir}/_app.tsx`);

  // 生成 _layout.tsx（根布局组件）
  const layoutContent = `/**
 * 根布局组件
 * 提供网站的整体布局结构
 * 注意：HTML 文档结构由 _app.tsx 提供
 */

import { useState, useEffect } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

/**
 * 根布局组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function RootLayout({ children }: { children: ComponentChildren }) {
  // 在客户端使用 state 跟踪当前路径
  const [currentPath, setCurrentPath] = useState<string>(() => {
    // 初始化：使用 window.location.pathname（客户端）
    if (typeof globalThis !== 'undefined' && globalThis.window) {
      return globalThis.window.location.pathname;
    }
    return '/';
  });

  // 监听 URL 地址变化
  useEffect(() => {
    if (typeof globalThis === 'undefined' || !globalThis.window) {
      return;
    }

    // 更新当前路径
    const updatePath = () => {
      setCurrentPath(globalThis.window.location.pathname);
    };

    // 初始化时设置当前路径
    updatePath();

    // 监听 popstate 事件（浏览器前进/后退）
    globalThis.window.addEventListener('popstate', updatePath);
    
    // 监听 routechange 事件（客户端路由导航时触发）
    // 从事件详情中获取路径，确保立即更新
    const handleRouteChange = (event) => {
      const customEvent = event;
      if (customEvent.detail?.path) {
        setCurrentPath(customEvent.detail.path);
      } else {
        // 如果没有路径详情，回退到从 location 获取
        updatePath();
      }
    };
    globalThis.window.addEventListener('routechange', handleRouteChange);

    return () => {
      globalThis.window.removeEventListener('popstate', updatePath);
      globalThis.window.removeEventListener('routechange', handleRouteChange);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 导航栏 */}
      <nav className="bg-white shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <a href="/" className="text-2xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                ${appName}
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/"
                className={\`px-3 py-2 rounded-md text-sm font-medium transition-colors \${
                  currentPath === '/' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-700 bg-gray-50 hover:bg-gray-100'
                }\`}
              >
                首页
              </a>
              <a
                href="/about"
                className={\`px-3 py-2 rounded-md text-sm font-medium transition-colors \${
                  currentPath === '/about' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-700 bg-gray-50 hover:bg-gray-100'
                }\`}
              >
                关于
              </a>
              <a
                href="https://github.com/shuliangfu/dweb"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 hover:text-gray-900 transition-colors"
                aria-label="GitHub"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
          </div>
        </nav>
      
      {/* 主内容区域 */}
      <main className="grow">
          {children}
        </main>
    </div>
  );
}
`;

  await Deno.writeTextFile(path.join(routesDir, '_layout.tsx'), layoutContent);
  console.log(`✅ 已创建: ${routesDir}/_layout.tsx`);

  // 生成 index.tsx（美化后的首页）
  // 根据 apiMode 生成不同的 API 调用代码
  const apiCallCode = apiMode === 'rest' 
    ? `      // RESTful 模式：使用 GET 方法获取列表
      const response = await fetch('/api/examples', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });`
    : `      // Method 模式：使用 POST 方法，通过 URL 路径指定方法名（中划线格式）
      const response = await fetch('/api/examples/get-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });`;
  
  const indexContent = `/**
 * 首页
 * 展示应用的基本信息和快速开始指南
 */

import { useState, useEffect } from 'preact/hooks';
import Button from '../components/Button.tsx';
import { exampleStore, type ExampleStoreState } from '../stores/example.ts';
import type { PageProps, LoadContext } from '@dreamer/dweb';

/**
 * 页面元数据（用于 SEO）
 * 支持对象或函数两种形式：
 * - 对象：静态元数据
 * - 函数：动态元数据（可以基于 params、query、data、cookies、session 等生成）
 * 
 * metadata 函数接收与 load 函数相同的完整参数（LoadContext），
 * 并额外提供 data 参数（load 函数返回的数据）
 * 
 * @example
 * // 对象形式（静态）
 * export const metadata = {
 *   title: "页面标题",
 *   description: "页面描述",
 * };
 * 
 * @example
 * // 函数形式（动态）
 * export function metadata({ params, query, data, cookies, session, db }) {
 *   return {
 *     title: \`\${data.name} - 详情页\`,
 *     description: data.description,
 *   };
 * }
 */
export function metadata({
  params: _params,
  query: _query,
  cookies: _cookies,
  session: _session,
  getCookie: _getCookie,
  getSession: _getSession,
  db: _db,
  lang: _lang,
  store: _store,
  data: _data,
}: LoadContext & { data: unknown }): {
  title: string;
  description: string;
  keywords: string;
  author: string;
} {
  return {
    title: '${appName} - 首页',
    description: '欢迎使用 ${appName}，基于 DWeb 框架构建的现代化 Web 应用',
    keywords: '${appName}, DWeb, Deno, Preact, Web 应用',
    author: '${appName}',
  };
}

/**
 * 加载页面数据（服务端执行）
 * @param context 包含 params、query、cookies、session 等的上下文对象
 * @returns 页面数据，会自动赋值到组件的 data 属性
 */
export const load = async ({
  params: _params,
  query: _query,
  cookies,
  session,
  getCookie,
  getSession,
}: LoadContext) => {
  // 示例：读取 Cookie
  const token = getCookie('token') || cookies.token;

  // 示例：读取 Session
  const currentSession = session || (await getSession());
  const userId = currentSession?.data?.userId;

  // 返回数据，这些数据会自动传递给页面组件的 data 属性
  return {
    message: '欢迎使用 DWeb 框架！',
    version: '${frameworkVersion}',
    token: token || null,
    userId: userId || null,
    timestamp: new Date().toISOString(),
  };
};

/**
 * 首页组件
 * @param props 页面属性，包含 params、query 和 data（load 函数返回的数据）
 * @returns JSX 元素
 */
export default function Home({ params: _params, query: _query, data }: PageProps) {
  // data 就是 load 函数返回的数据
  // 例如：data.message 就是 '欢迎使用 DWeb 框架！'
  const pageData = data as {
    message: string;
    version: string;
    token: string | null;
    userId: string | null;
    timestamp: string;
  };

  // Store 状态管理示例（使用 defineStore）
  const [storeState, setStoreState] = useState<ExampleStoreState>(exampleStore.$state);

  useEffect(() => {
    // 订阅 Store 状态变化
    const unsubscribe = exampleStore.$subscribe((newState: ExampleStoreState) => {
      setStoreState(newState);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // 计数器示例（使用 Preact Hooks）
  const [count, setCount] = useState(0);
  
  const handleIncrement = () => {
    setCount(count + 1);
  };
  
  const handleDecrement = () => {
    setCount(count - 1);
  };

  // API 数据获取示例（使用 Preact Hooks）
  const [apiData, setApiData] = useState<Array<{ id: number; name: string; description: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取 API 数据（手动触发，不自动请求）
  const fetchApiData = async () => {
    // 如果正在加载中，不重复请求
    if (loading) {
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
${apiCallCode}
      
      if (!response.ok) {
        throw new Error(\`请求失败: \${response.status}\`);
      }
      const result = await response.json();
      if (result.success && result.data) {
        setApiData(result.data);
      } else {
        throw new Error(result.message || '获取数据失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败');
      console.error('API 请求错误:', err);
    } finally {
      setLoading(false);
    }
  };

  // 特性列表
  const features = [
    {
      title: '文件系统路由',
      description: '基于文件系统的自动路由，只需在 routes 目录下创建文件即可',
      icon: '📁',
    },
    {
      title: '多种渲染模式',
      description: '支持 SSR、CSR 和 Hybrid 三种渲染模式，灵活选择',
      icon: '🎨',
    },
    {
      title: '热更新（HMR）',
      description: '开发时自动热更新，修改代码后立即看到效果',
      icon: '🔥',
    },
    {
      title: 'TypeScript 支持',
      description: '完整的 TypeScript 支持，提供类型安全和智能提示',
      icon: '📘',
    },
  ];

  return (
    <div className="space-y-0">
      {/* Hero 区域 */}
      <div className="${useTailwindV4 ? 'bg-linear-to-r' : 'bg-gradient-to-r'} from-indigo-600 to-purple-600 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            {pageData.message}
          </h1>
          <p className="text-xl text-indigo-100 max-w-3xl mx-auto mb-2">
            基于 Deno + Preact + Tailwind CSS 的现代化全栈 Web 框架
          </p>
          <div className="flex items-center justify-center gap-2 mb-8">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-sm text-indigo-200">
              当前版本：v{pageData.version}
            </span>
          </div>
          {/* 显示 load 函数返回的数据示例 */}
          {pageData.token && (
            <p className="text-sm text-indigo-200 mb-4">
              Token: {pageData.token.substring(0, 20)}...
            </p>
          )}
          {pageData.userId && (
            <p className="text-sm text-indigo-200 mb-4">
              用户 ID: {pageData.userId}
      </p>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button href="https://denoweb.dev/" target="_blank" variant="primary" className="bg-white text-indigo-600 hover:bg-gray-50">
              了解更多
            </Button>
            <Button href="https://denoweb.dev/docs" target="_blank" variant="primary" className="bg-white text-indigo-600 hover:bg-gray-50">
              开始使用
            </Button>
          </div>
        </div>
      </div>

      {/* 快速开始 */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">快速开始</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
              <p className="font-semibold text-blue-900 mb-4">开发指南：</p>
              <ul className="list-disc list-inside space-y-2 text-blue-800">
                <li>编辑 <code className="bg-blue-100 px-2 py-1 rounded text-sm">routes/index.tsx</code> 来修改首页</li>
                <li>在 <code className="bg-blue-100 px-2 py-1 rounded text-sm">routes/</code> 目录下创建新文件来添加路由</li>
                <li>在 <code className="bg-blue-100 px-2 py-1 rounded text-sm">components/</code> 目录下创建可复用组件</li>
                <li>在 <code className="bg-blue-100 px-2 py-1 rounded text-sm">assets/</code> 目录下放置静态资源</li>
        </ul>
            </div>
            {/* load 方法示例说明 */}
            <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
              <p className="font-semibold text-green-900 mb-2">load 方法示例：</p>
              <p className="text-green-800 text-sm mb-2">
                页面中的 <code className="bg-green-100 px-2 py-1 rounded text-xs">load</code> 函数在服务端执行，用于获取页面数据。
              </p>
              <p className="text-green-800 text-sm mb-2">
                load 函数返回的数据会自动传递给页面组件的 <code className="bg-green-100 px-2 py-1 rounded text-xs">data</code> 属性。
              </p>
              <p className="text-green-800 text-sm">
                当前页面数据加载时间: <code className="bg-green-100 px-2 py-1 rounded text-xs">{new Date(pageData.timestamp).toLocaleString('zh-CN')}</code>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 计数器示例 */}
      <div className="py-16 bg-indigo-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">交互示例</h2>
          <div className="bg-white p-8 rounded-lg shadow-md">
            <p className="text-center text-gray-600 mb-6">
              这是一个使用 Preact Hooks (useState) 实现的计数器示例
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleDecrement}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold text-lg"
              >
                -
              </button>
              <div className="px-8 py-4 bg-gray-100 rounded-lg min-w-[120px] text-center">
                <span className="text-3xl font-bold text-gray-900">{count}</span>
              </div>
              <button
                type="button"
                onClick={handleIncrement}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold text-lg"
              >
                +
              </button>
            </div>
            <p className="text-center text-sm text-gray-500 mt-4">
              点击 + 或 - 按钮来增加或减少计数
            </p>
          </div>
        </div>
      </div>

      {/* API 数据获取示例 */}
      <div className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">API 数据获取示例</h2>
          <div className="bg-gray-50 p-8 rounded-lg shadow-md">
            <p className="text-center text-gray-600 mb-6">
              这是一个使用 Preact Hooks (useState) 手动获取 API 数据的示例
            </p>
            
            {/* 刷新按钮放在头部 */}
            <div className="mb-6 text-center">
              <button
                type="button"
                onClick={fetchApiData}
                disabled={loading}
                className={\`px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold \${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }\`}
              >
                {loading ? '刷新中...' : '刷新数据'}
              </button>
            </div>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded">
                <p className="text-red-700 font-semibold">错误：</p>
                <p className="text-red-600">{error}</p>
                <button
                  type="button"
                  onClick={fetchApiData}
                  className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                >
                  重试
                </button>
              </div>
            )}
            
            {/* 只在初始加载且没有数据时显示加载提示 */}
            {loading && apiData.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">加载中...</p>
              </div>
            )}
            
            {/* 有数据时始终显示，刷新时不清空，避免闪动 */}
            {apiData.length > 0 && (
              <div className="space-y-4">
                {apiData.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all"
                  >
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{item.name}</h3>
                    <p className="text-gray-600 mb-2">{item.description}</p>
                    <p className="text-sm text-gray-500">
                      创建时间: {new Date(item.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                ))}
                {/* 刷新时在数据列表下方显示加载提示 */}
                {loading && (
                  <div className="text-center py-2">
                    <p className="text-sm text-gray-400">正在刷新...</p>
                  </div>
                )}
              </div>
            )}
            
            {!loading && !error && apiData.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">暂无数据</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Store 状态管理示例 */}
      <div className="py-16 bg-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Store 状态管理示例</h2>
          <div className="bg-white p-8 rounded-lg shadow-md">
            <p className="text-center text-gray-600 mb-6">
              这是一个使用 Store 插件进行状态管理的示例，状态会自动持久化到 localStorage
            </p>
            
            {/* Store 状态显示 */}
            <div className="mb-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-2">当前计数：</p>
                <p className="text-3xl font-bold text-indigo-600">{storeState.count}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-2">消息：</p>
                <p className="text-lg text-gray-900">{storeState.message || '暂无消息'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-2">项目列表：</p>
                <ul className="list-disc list-inside space-y-1">
                  {storeState.items.length > 0 ? (
                    storeState.items.map((item, index) => (
                      <li key={index} className="text-gray-700">{item}</li>
                    ))
                  ) : (
                    <li className="text-gray-400">暂无项目</li>
                  )}
                </ul>
              </div>
            </div>
            
            {/* Store 操作按钮 */}
            <div className="flex flex-wrap gap-3 justify-center mb-6">
              <button
                type="button"
                onClick={() => exampleStore.increment()}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => exampleStore.decrement()}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
              >
                -1
              </button>
              <button
                type="button"
                onClick={() => exampleStore.setMessage('Hello from Store!')}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
              >
                设置消息
              </button>
              <button
                type="button"
                onClick={() => exampleStore.addItem(\`项目 \${storeState.items.length + 1}\`)}
                className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-semibold"
              >
                添加项目
              </button>
              <button
                type="button"
                onClick={() => exampleStore.removeItem(storeState.items.length - 1)}
                disabled={storeState.items.length === 0}
                className={\`px-6 py-3 rounded-lg transition-colors font-semibold \${
                  storeState.items.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                }\`}
              >
                删除最后一项
              </button>
              <button
                type="button"
                onClick={() => exampleStore.$reset()}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
              >
                重置状态
              </button>
            </div>
            
            <p className="text-center text-sm text-gray-500">
              💡 提示：刷新页面后状态会保留（已启用持久化）
            </p>
          </div>
        </div>
      </div>

      {/* 特性展示 */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">核心特性</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
`;

  await Deno.writeTextFile(path.join(routesDir, 'index.tsx'), indexContent);
  console.log(`✅ 已创建: ${routesDir}/index.tsx`);

  // 生成 about.tsx（美化后的关于页面）
  const aboutContent = `/**
 * 关于页面
 * 介绍应用和框架的基本信息
 */

/**
 * 页面元数据（用于 SEO）
 * 支持对象或函数两种形式：
 * - 对象：静态元数据
 * - 函数：动态元数据（可以基于 params、query、data、cookies、session 等生成）
 * 
 * metadata 函数接收与 load 函数相同的完整参数（LoadContext），
 * 并额外提供 data 参数（load 函数返回的数据）
 */
export function metadata({
  params: _params,
  query: _query,
  cookies: _cookies,
  session: _session,
  getCookie: _getCookie,
  getSession: _getSession,
  db: _db,
  lang: _lang,
  store: _store,
  data: _data,
}: LoadContext & { data: unknown }): {
  title: string;
  description: string;
  keywords: string;
  author: string;
} {
  return {
    title: '关于 - ${appName}',
    description: '了解 ${appName} 应用和 DWeb 框架的技术栈与设计理念',
    keywords: '${appName}, DWeb, Deno, Preact, Tailwind CSS, 技术栈',
    author: '${appName}',
  };
}

/**
 * 关于页面组件
 * @returns JSX 元素
 */
export default function About() {
  // 技术栈信息
  const technologies = [
    {
      name: 'Deno',
      description: '现代 JavaScript/TypeScript 运行时，内置安全性和现代 Web API 支持',
      icon: '🦕',
    },
    {
      name: 'Preact',
      description: '轻量级 React 替代品，提供相同的 API 但体积更小、性能更好',
      icon: '⚛️',
    },
    {
      name: 'Tailwind CSS',
      description: '实用优先的 CSS 框架，快速构建现代化的用户界面',
      icon: '🎨',
    },
  ];

  return (
    <div className="space-y-0">
      {/* 页面标题 */}
      <div className="${useTailwindV4 ? 'bg-linear-to-r' : 'bg-gradient-to-r'} from-blue-600 to-indigo-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            关于
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            了解这个应用和 DWeb 框架
          </p>
        </div>
      </div>

      {/* 简介 */}
      <div className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">应用简介</h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              这是一个使用 DWeb 框架创建的示例应用。DWeb 是一个基于 Deno + Preact + Tailwind CSS 的现代化全栈 Web 框架。
      </p>
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              DWeb 提供了文件系统路由、多种渲染模式、中间件系统、插件系统等强大功能，
              让开发者能够快速构建现代化的 Web 应用。
            </p>
            <p className="text-gray-600 text-lg leading-relaxed">
              无论是构建简单的静态网站，还是复杂的全栈应用，DWeb 都能为您提供最佳的支持。
            </p>
          </div>
        </div>
      </div>

      {/* 技术栈 */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              技术栈
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              基于以下现代 Web 技术构建
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {technologies.map((tech, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center"
              >
                <div className="text-5xl mb-4">{tech.icon}</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{tech.name}</h3>
                <p className="text-gray-600 leading-relaxed">{tech.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 返回首页 */}
      <div className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <a
            href="/"
            className="inline-flex items-center px-6 py-3 text-lg font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all"
          >
            返回首页
          </a>
        </div>
      </div>
    </div>
  );
}
`;

  await Deno.writeTextFile(path.join(routesDir, 'about.tsx'), aboutContent);
  console.log(`✅ 已创建: ${routesDir}/about.tsx`);

  // 生成 _404.tsx（美化后的 404 页面）
  const notFoundContent = `/**
 * 404 页面
 * 当访问不存在的路由时显示
 */

import Button from '../components/Button.tsx';

/**
 * 404 页面组件
 * @returns JSX 元素
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-4">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-indigo-600 mb-4">404</h1>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            页面未找到
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-md mx-auto">
            抱歉，您访问的页面不存在。请检查 URL 是否正确，或返回首页继续浏览。
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button href="/" variant="primary">
            返回首页
          </Button>
          <Button href="/about" variant="outline">
            关于我们
          </Button>
        </div>
      </div>
    </div>
  );
}
`;

  await Deno.writeTextFile(path.join(routesDir, '_404.tsx'), notFoundContent);
  console.log(`✅ 已创建: ${routesDir}/_404.tsx`);
}

/**
 * 生成 stores 目录和示例文件
 */
async function generateStores(
  projectDir: string,
  isMultiApp: boolean,
  appNames: string[]
): Promise<void> {
  if (isMultiApp) {
    // 多应用模式：为每个应用生成 stores 目录
    for (const appName of appNames) {
      const appStoresDir = path.join(projectDir, appName, 'stores');
      await ensureDir(appStoresDir);
      await generateStoreExample(appStoresDir, appName);
    }
  } else {
    // 单应用模式：在项目根目录生成
    const storesDir = path.join(projectDir, 'stores');
    await ensureDir(storesDir);
    const projectName = path.basename(projectDir);
    await generateStoreExample(storesDir, projectName);
  }
}

/**
 * 生成示例 store 文件
 */
async function generateStoreExample(storesDir: string, _appName: string): Promise<void> {
  const storeContent = `/**
 * Example Store
 * 使用 defineStore 定义，声明式 API
 * 
 * Store 插件会自动收集此文件中的初始状态
 * 无需在配置文件中手动配置 initialState
 */

import { defineStore } from '@dreamer/dweb/client';

/**
 * Store 状态接口
 */
export interface ExampleStoreState extends Record<string, unknown> {
  count: number;
  message: string;
  items: string[];
}

/**
 * 定义 Example Store
 * 使用声明式 API，简洁易用
 * 直接导出，类型会自动推断
 */
export const exampleStore = defineStore('example', {
  state: (): ExampleStoreState => ({
    count: 0,
    message: '',
    items: [] as string[],
  }),
  actions: {
    // 在 actions 中，可以直接通过 this.xxx 访问和修改状态
    // defineStore 会自动处理状态更新，this 类型会自动推断，无需手动指定
    increment() {
      this.count++;
    },
    decrement() {
      this.count--;
    },
    setMessage(message: string) {
      this.message = message;
    },
    addItem(item: string) {
      this.items = [...this.items, item];
    },
    removeItem(index: number) {
      this.items = this.items.filter((_item: string, i: number) => i !== index);
    },
  },
});
`;

  await Deno.writeTextFile(path.join(storesDir, 'example.ts'), storeContent);
  console.log(`✅ 已创建: ${storesDir}/example.ts`);
}

/**
 * 为单个应用生成组件文件
 */
async function generateComponentsForApp(componentsDir: string, _appName: string): Promise<void> {
  // 生成示例组件 Button.tsx（美化后的按钮组件）
  const buttonContent = `/**
 * 按钮组件
 * 提供多种样式的按钮
 */

import type { ComponentChildren, JSX } from 'preact';

/**
 * 按钮组件属性
 */
export interface ButtonProps {
  /** 按钮文本 */
  children: ComponentChildren;
  /** 按钮链接（如果提供，则渲染为 a 标签） */
  href?: string;
  /** 链接目标（如 _blank） */
  target?: string;
  /** 按钮类型 */
  variant?: 'primary' | 'secondary' | 'outline';
  /** 点击事件处理函数（当没有 href 时使用） */
  onClick?: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 按钮组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function Button({
  children,
  href,
  target,
  variant = 'primary',
  onClick,
  className = ''
}: ButtonProps): JSX.Element {
  // 根据 variant 设置样式类
  const variantClasses = {
    primary: 'text-white bg-indigo-600 hover:bg-indigo-700',
    secondary: 'text-gray-700 bg-white hover:bg-gray-50 border border-gray-300',
    outline: 'text-indigo-600 bg-transparent border-2 border-indigo-600 hover:bg-indigo-50'
  };

  const baseClasses = 'inline-flex items-center px-6 py-3 text-base font-medium rounded-md transition-colors';

  // 如果 className 中包含了背景色或文字颜色，则完全使用 className，不添加 variant 的样式
  // 这样可以避免样式冲突，确保自定义样式生效
  const hasCustomBg = className.includes('bg-');
  const hasCustomText = className.includes('text-');
  
  // 构建最终的样式类
  let combinedClasses: string;
  if (hasCustomBg && hasCustomText) {
    // 如果同时有自定义背景和文字颜色，完全使用 className，不添加 variant 样式
    combinedClasses = \`\${baseClasses} \${className}\`.replace(/\s+/g, ' ').trim();
  } else if (hasCustomBg || hasCustomText) {
    // 如果只有其中一个，移除 variant 中对应的样式
    let finalVariantClasses = variantClasses[variant];
    if (hasCustomBg) {
      // 移除所有背景色相关的类（包括 hover:bg-*）
      finalVariantClasses = finalVariantClasses.replace(/\s*(?:hover:)?bg-[^\s]+/g, '').trim();
    }
    if (hasCustomText) {
      // 移除所有文字颜色相关的类（包括 hover:text-*）
      finalVariantClasses = finalVariantClasses.replace(/\s*(?:hover:)?text-[^\s]+/g, '').trim();
    }
    combinedClasses = \`\${baseClasses} \${finalVariantClasses} \${className}\`.replace(/\s+/g, ' ').trim();
  } else {
    // 没有自定义样式，使用 variant 的完整样式
    combinedClasses = \`\${baseClasses} \${variantClasses[variant]} \${className}\`.replace(/\s+/g, ' ').trim();
  }

  // 如果有 href，渲染为链接
  if (href) {
    return (
      <a href={href} target={target} className={combinedClasses}>
        {children}
      </a>
    );
  }

  // 否则渲染为按钮
  return (
    <button 
      type="button"
      onClick={onClick}
      className={combinedClasses}
    >
      {children}
    </button>
  );
}
`;

  await Deno.writeTextFile(path.join(componentsDir, 'Button.tsx'), buttonContent);
  console.log(`✅ 已创建: ${componentsDir}/Button.tsx`);
}

/**
 * 为单个应用生成 API 文件
 */
async function generateApiForApp(routesDir: string, _appName: string, apiMode: string): Promise<void> {
  const apiDir = path.join(routesDir, 'api');
  await ensureDir(apiDir);
  
  // 根据 apiMode 生成不同的 API 文件
  let apiContent: string;
  
  if (apiMode === 'rest') {
    // RESTful 模式：生成 RESTful API
    apiContent = `/**
 * 示例 RESTful API 路由
 * 基于 HTTP 方法和资源路径
 * 
 * 路由映射：
 * - GET /api/examples -> index (获取列表)
 * - GET /api/examples/:id -> show (获取单个)
 * - POST /api/examples -> create (创建)
 * - PUT /api/examples/:id -> update (更新)
 * - DELETE /api/examples/:id -> destroy (删除)
 */

import type { Request } from '@dreamer/dweb';

/**
 * 获取示例列表
 * 访问方式：GET /api/examples
 */
export function index(_req: Request) {
  return {
    success: true,
    message: '获取数据成功',
    data: [
      {
        id: 1,
        name: '示例项目 1',
        description: '这是第一个示例项目，展示了如何使用 DWeb 框架构建 Web 应用',
        createdAt: new Date(Date.now() - 86400000).toISOString() // 1天前
      },
      {
        id: 2,
        name: '示例项目 2',
        description: '这是第二个示例项目，演示了 API 接口的调用和数据展示',
        createdAt: new Date(Date.now() - 43200000).toISOString() // 12小时前
      },
      {
        id: 3,
        name: '示例项目 3',
        description: '这是第三个示例项目，展示了前端交互和状态管理的实现',
        createdAt: new Date().toISOString() // 现在
      }
    ],
    timestamp: new Date().toISOString()
  };
}

/**
 * 获取单个示例
 * 访问方式：GET /api/examples/:id
 */
export function show(req: Request) {
  const id = req.params.id || '1';
  
  return {
    success: true,
    data: {
      id,
      name: '示例项目 ' + id,
      description: '这是示例项目 ' + id + ' 的详细描述',
      createdAt: new Date().toISOString()
    }
  };
}

/**
 * 创建示例
 * 访问方式：POST /api/examples
 */
export function create(req: Request) {
  const body = req.body as { name?: string; description?: string };
  
  return {
    success: true,
    message: '创建成功',
    data: {
      id: Date.now(),
      name: body?.name || '未命名',
      description: body?.description || '',
      createdAt: new Date().toISOString()
    }
  };
}

/**
 * 更新示例
 * 访问方式：PUT /api/examples/:id
 */
export function update(req: Request) {
  const id = req.params.id || '1';
  const body = req.body as { name?: string; description?: string };
  
  return {
    success: true,
    message: '更新成功',
    data: {
      id,
      name: body?.name || '更新后的名称',
      description: body?.description || '更新后的描述',
      updatedAt: new Date().toISOString()
    }
  };
}

/**
 * 删除示例
 * 访问方式：DELETE /api/examples/:id
 */
export function destroy(req: Request) {
  const id = req.params.id || '1';
  
  return {
    success: true,
    message: '删除成功',
    deletedId: id,
    timestamp: new Date().toISOString()
  };
}
`;
  } else {
    // Method 模式：生成方法路由 API
    apiContent = `/**
 * 示例 API 路由（Method 模式）
 * 通过 URL 路径指定方法名，默认使用中划线格式
 * 例如：POST /api/examples/get-user 或 POST /api/examples/getUser
 */

import type { Request } from '@dreamer/dweb';

/**
 * 测试方法
 * 访问方式：POST /api/examples/test
 */
export function test(req: Request) {
  return {
    success: true,
    message: 'API 测试成功',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  };
}

/**
 * 获取用户信息
 * 访问方式：POST /api/examples/get-user?id=123
 */
export function getUser(req: Request) {
  const userId = req.query.id || '1';
  
  return {
    success: true,
    data: {
      id: userId,
      name: '测试用户',
      email: 'test@example.com',
      createdAt: new Date().toISOString()
    }
  };
}

/**
 * 创建数据
 * 访问方式：POST /api/examples/create-data
 */
export function createData(req: Request) {
  const body = req.body as { name?: string; description?: string };
  
  return {
    success: true,
    message: '创建成功',
    data: {
      id: Date.now(),
      name: body?.name || '未命名',
      description: body?.description || '',
      createdAt: new Date().toISOString()
    }
  };
}

/**
 * 获取示例数据列表
 * 访问方式：POST /api/examples/get-data
 */
export function getData(_req: Request) {
  return {
    success: true,
    message: '获取数据成功',
    data: [
      {
        id: 1,
        name: '示例项目 1',
        description: '这是第一个示例项目，展示了如何使用 DWeb 框架构建 Web 应用',
        createdAt: new Date(Date.now() - 86400000).toISOString() // 1天前
      },
      {
        id: 2,
        name: '示例项目 2',
        description: '这是第二个示例项目，演示了 API 接口的调用和数据展示',
        createdAt: new Date(Date.now() - 43200000).toISOString() // 12小时前
      },
      {
        id: 3,
        name: '示例项目 3',
        description: '这是第三个示例项目，展示了前端交互和状态管理的实现',
        createdAt: new Date().toISOString() // 现在
      }
    ],
    timestamp: new Date().toISOString()
  };
}
`;
  }

  await Deno.writeTextFile(path.join(apiDir, 'examples.ts'), apiContent);
  console.log(`✅ 已创建: ${apiDir}/examples.ts`);
}

/**
 * 为多应用项目生成 common 目录结构
 */
async function generateCommonDirectory(projectDir: string): Promise<void> {
  const commonDir = path.join(projectDir, 'common');
  await ensureDir(commonDir);
  
  // 创建子目录
  const subDirs = ['config', 'utils', 'components', 'models', 'hooks'];
  for (const subDir of subDirs) {
    await ensureDir(path.join(commonDir, subDir));
  }
  
  // 生成 config/index.ts
  const configContent = `/**
 * 公共配置文件
 * 用于存放多应用共享的配置
 */

export const commonConfig = {
  appName: 'DWeb Multi-App',
  version: '1.0.0',
  apiBaseUrl: typeof Deno !== 'undefined' && Deno.env.get('API_BASE_URL') || 'http://localhost:3000',
};

export default commonConfig;
`;
  await Deno.writeTextFile(path.join(commonDir, 'config', 'index.ts'), configContent);
  console.log(`✅ 已创建: common/config/index.ts`);
  
  // 生成 utils/index.ts
  const utilsContent = `/**
 * 公共工具函数
 * 用于存放多应用共享的工具函数
 */

/**
 * 格式化日期
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
`;
  await Deno.writeTextFile(path.join(commonDir, 'utils', 'index.ts'), utilsContent);
  console.log(`✅ 已创建: common/utils/index.ts`);
  
  // 生成 components/Button.tsx
  const commonButtonContent = `/**
 * 公共按钮组件
 * 可在多个应用中使用
 */
export default function CommonButton({ 
  children, 
  onClick,
  type = 'button',
  className = ''
}: { 
  children: preact.ComponentChildren;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={\`px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors \${className}\`}
    >
      {children}
    </button>
  );
}
`;
  await Deno.writeTextFile(path.join(commonDir, 'components', 'Button.tsx'), commonButtonContent);
  console.log(`✅ 已创建: common/components/Button.tsx`);
  
  // 生成 models/User.ts
  const userModelContent = `/**
 * 用户模型
 * 用于定义共享的数据模型
 */

export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export function createUser(data: Partial<User>): User {
  return {
    id: data.id || Date.now(),
    name: data.name || '',
    email: data.email || '',
    createdAt: data.createdAt || new Date().toISOString()
  };
}
`;
  await Deno.writeTextFile(path.join(commonDir, 'models', 'User.ts'), userModelContent);
  console.log(`✅ 已创建: common/models/User.ts`);
  
  // 生成 hooks/useCounter.ts
  const counterHookContent = `import { useState } from 'preact/hooks';

/**
 * 计数器 Hook
 * 可在多个应用中使用
 */
export function useCounter(initialValue: number = 0) {
  const [count, setCount] = useState(initialValue);
  
  const increment = () => setCount(count + 1);
  const decrement = () => setCount(count - 1);
  const reset = () => setCount(initialValue);
  
  return { count, increment, decrement, reset };
}
`;
  await Deno.writeTextFile(path.join(commonDir, 'hooks', 'useCounter.ts'), counterHookContent);
  console.log(`✅ 已创建: common/hooks/useCounter.ts`);
}

/**
 * 生成静态文件
 */
async function generateStaticFiles(
  projectDir: string,
  isMultiApp: boolean,
  appNames: string[],
  useTailwindV4: boolean
): Promise<void> {
  if (isMultiApp) {
    // 多应用模式：为每个应用创建目录和文件
    for (const appName of appNames) {
      const appAssetsDir = path.join(projectDir, appName, 'assets');
      await ensureDir(appAssetsDir);
      
      // 生成 tailwind.css
      const styleContent = useTailwindV4
        ? `/* Tailwind CSS v4 */
@layer theme, base, components, utilities;
@import "tailwindcss";
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css" layer(utilities);

/* MODIFIED: 配置 Tailwind CSS 扫描路径，确保 common 目录下的组件被扫描 */
/* @source 路径相对于项目根目录 */ 

@custom-variant dark (.dark &);
`
        : `/* Tailwind CSS v3 */
@tailwind base;
@tailwind components;
@tailwind utilities;
`;

      await Deno.writeTextFile(path.join(appAssetsDir, 'tailwind.css'), styleContent);
      console.log(`✅ 已创建: ${appName}/assets/tailwind.css`);
      
      // 为每个应用创建 routes 目录
      const appRoutesDir = path.join(projectDir, appName, 'routes');
      await ensureDir(appRoutesDir);
    }
    
    // Tailwind CSS v3 需要配置文件（多应用模式：所有应用共享一个配置文件）
    if (!useTailwindV4) {
      const contentPaths = appNames.flatMap(appName => [
        `    './${appName}/routes/**/*.{tsx,ts,jsx,js}'`,
        `    './${appName}/components/**/*.{tsx,ts,jsx,js}'`,
      ]);
      contentPaths.push(`    './common/**/*.{tsx,ts,jsx,js}'`);
      
      const tailwindConfigContent = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
${contentPaths.join(',\n')}
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
`;
      await Deno.writeTextFile(path.join(projectDir, 'tailwind.config.ts'), tailwindConfigContent);
      console.log(`✅ 已创建: tailwind.config.ts`);
    }
  } else {
    // 单应用模式：在项目根目录创建
  const assetsDir = path.join(projectDir, 'assets');
    await ensureDir(assetsDir);

    // 生成 tailwind.css
    const styleContent = useTailwindV4
      ? `/* Tailwind CSS v4 */
@layer theme, base, components, utilities;
@import "tailwindcss";
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css" layer(utilities);

/* MODIFIED: 配置 Tailwind CSS 扫描路径，确保 common 目录下的组件被扫描 */
/* @source 路径相对于项目根目录 */ 

@custom-variant dark (.dark &);
`
      : `/* Tailwind CSS v3 */
@tailwind base;
@tailwind components;
@tailwind utilities;
`;

  await Deno.writeTextFile(path.join(assetsDir, 'tailwind.css'), styleContent);
  console.log(`✅ 已创建: assets/tailwind.css`);
  
  // Tailwind CSS v3 需要配置文件
  if (!useTailwindV4) {
    const tailwindConfigContent = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './routes/**/*.{tsx,ts,jsx,js}',
    './components/**/*.{tsx,ts,jsx,js}',
    './common/**/*.{tsx,ts,jsx,js}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
`;
    await Deno.writeTextFile(path.join(projectDir, 'tailwind.config.ts'), tailwindConfigContent);
    console.log(`✅ 已创建: tailwind.config.ts`);
  }
  }
}

/**
 * 生成 README.md
 */
async function generateREADME(projectDir: string, projectName: string): Promise<void> {
  const readmeContent = `# ${projectName}

这是一个使用 DWeb 框架创建的项目。

## 快速开始

### 开发模式

\`\`\`bash
deno task dev
\`\`\`

访问 http://localhost:3000

### 构建

\`\`\`bash
deno task build
\`\`\`

### 生产模式

\`\`\`bash
deno task start
\`\`\`

## 项目结构

\`\`\`
${projectName}/
├── routes/          # 路由文件（自动路由）
├── assets/          # 静态资源
├── dweb.config.ts  # 配置文件
└── deno.json       # Deno 配置
\`\`\`

## 文档

更多信息请参考 DWeb 框架文档。
`;

  await Deno.writeTextFile(path.join(projectDir, 'README.md'), readmeContent);
  console.log(`✅ 已创建: README.md`);
}

/**
 * 生成 .gitignore 文件
 */
async function generateGitignore(projectDir: string): Promise<void> {
  const gitignoreContent = `# Deno 相关
.deno/
deno.lock
node_modules/
.npm/

# 构建输出
dist/
build/
*.tsbuildinfo

# 日志文件
*.log
logs/

# 环境变量文件
.env
.env.local
.env.*.local

# IDE 和编辑器
.vscode/
.idea/
*.swp
*.swo
*~

# 操作系统文件
.DS_Store
Thumbs.db
`;

  await Deno.writeTextFile(path.join(projectDir, '.gitignore'), gitignoreContent);
  console.log(`✅ 已创建: .gitignore`);
}

/**
 * 生成 main.ts 文件
 * @param projectDir 项目目录
 * @param isMultiApp 是否为多应用模式
 * @param appNames 应用名称列表（多应用模式时使用）
 */
async function generateMainTs(
  projectDir: string,
  isMultiApp: boolean,
  appNames: string[]
): Promise<void> {
  // main.ts 文件内容模板
  const mainTsContent = `/**
 * DWeb 框架应用配置文件
 * 用于创建应用实例并配置中间件和插件
 * 
 * 注意：此文件只用于配置，不直接启动服务
 * 服务启动通过 CLI 命令：deno task dev 或 deno task start
 */

import { createApp, cors, staticFiles } from '@dreamer/dweb';

// 创建应用实例
const app = createApp();

// 配置中间件
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 自定义静态资源配置（带访问前缀）
// 注意：框架也会自动添加一个不带 prefix 的 staticFiles 中间件
// 这样可以通过两种方式访问：
// - /assets/images/logo.png (通过这个配置)
// - /images/logo.png (通过框架自动添加的中间件)
// app.use(
//   staticFiles({
//     dir: 'assets',
//     prefix: '/assets', // 访问前缀，例如 /assets/images/logo.png
//     maxAge: 86400, // 缓存 1 天
//     index: ['index.html', 'index.htm'],
//     dotfiles: 'deny', // 禁止访问隐藏文件
//   })
// );

// app.use((req, res, next) => {
//   console.log('request', req.url);
//   next();
// });

// 可以添加更多中间件
// app.use(customMiddleware);

// 可以注册插件
// app.plugin(customPlugin);

// 导出应用实例
export default app;
`;

  if (isMultiApp) {
    // 多应用模式：为每个应用生成 main.ts
    for (const appName of appNames) {
      const appMainTsPath = path.join(projectDir, appName, 'main.ts');
      await Deno.writeTextFile(appMainTsPath, mainTsContent);
      console.log(`✅ 已创建: ${appName}/main.ts`);
    }
  } else {
    // 单应用模式：在项目根目录生成 main.ts
    const mainTsPath = path.join(projectDir, 'main.ts');
    await Deno.writeTextFile(mainTsPath, mainTsContent);
    console.log(`✅ 已创建: main.ts`);
  }
}

