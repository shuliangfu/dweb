/**
 * 项目创建工具
 * 用于快速创建新的 DWeb 项目
 */

import * as path from '@std/path';
import { ensureDir } from '@std/fs/ensure_dir';

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
      const denoJsonPath = path.join(searchDir, 'deno.json');
      try {
        const denoJsonContent = await Deno.readTextFile(denoJsonPath);
        const denoJson = JSON.parse(denoJsonContent);
        // 验证是否是框架的 deno.json（检查 name 字段）
        if (denoJson.name === '@dreamer/dweb' && denoJson.version) {
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
      const denoJsonPath = path.join(Deno.cwd(), 'deno.json');
      const denoJsonContent = await Deno.readTextFile(denoJsonPath);
      const denoJson = JSON.parse(denoJsonContent);
      if (denoJson.name === '@dreamer/dweb' && denoJson.version) {
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
  const renderMode = await select(
    '\n请选择渲染模式:',
    ['SSR (服务端渲染)', 'CSR (客户端渲染)', 'Hybrid (混合渲染)'],
    2 // 默认选择第三个（Hybrid）
  );
  const renderModeValue = renderMode === 'SSR (服务端渲染)' ? 'ssr' 
    : renderMode === 'CSR (客户端渲染)' ? 'csr' 
    : 'hybrid';
  
  console.log(`\n📦 正在创建项目: ${projectName}`);
  console.log(`📁 项目目录: ${projectDir}`);
  if (isMultiApp) {
    console.log(`📦 应用列表: ${appNames.join(', ')}`);
  }
  console.log(`🎨 Tailwind CSS: ${tailwindVersion}`);
  console.log(`🎭 渲染模式: ${renderMode}\n`);

  // 创建项目目录
  await ensureDir(projectDir);

  // 创建子目录
  await ensureDir(path.join(projectDir, 'routes'));
  await ensureDir(path.join(projectDir, 'assets'));

  // 生成配置文件
  await generateConfigFile(projectDir, projectName, isMultiApp, appNames, useTailwindV4, renderModeValue);
  
  // 生成 deno.json
  await generateDenoJson(projectDir, useTailwindV4, isMultiApp, appNames);
  
  // 生成示例路由和组件
  await generateExampleRoutes(projectDir, isMultiApp, appNames);
  
  // 生成静态文件
  await generateStaticFiles(projectDir, isMultiApp, appNames, useTailwindV4);
  
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
  renderMode: string
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
        host: 'localhost'
      },
      routes: {
        dir: '${appName}/routes',
        ignore: ['**/*.test.ts', '**/*.test.tsx']
      },
      static: {
        dir: '${appName}/assets'
      },
      plugins: [
        tailwind({
          version: '${useTailwindV4 ? 'v4' : 'v3'}',
          cssPath: '${appName}/assets/style.css',
          optimize: true,
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
        outDir: 'dist/${appName}'
      },
    }`;
    }).join(',\n');
    
    configContent = `/**
 * DWeb 框架配置文件
 * 项目: ${projectName}
 * 模式: 多应用模式
 */

import { tailwind, cors, type DWebConfig } from '@dreamer/dweb';

const config: DWebConfig = {
  // Cookie 配置（全局）
  cookie: {
    secret: 'your-secret-key-here-change-in-production'
  },
  
  // Session 配置（全局）
  session: {
    secret: 'your-session-secret-here-change-in-production',
    store: 'memory',
    maxAge: 3600000, // 1小时
    secure: false,
    httpOnly: true
  },
  
  // 开发配置（全局）
  dev: {
    // open: true,
    hmrPort: 24678,
    reloadDelay: 300
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

import { tailwind, cors, type AppConfig } from '@dreamer/dweb';


const config: AppConfig = {
  name: '${projectName}',
  renderMode: '${renderMode}', // 'ssr' | 'csr' | 'hybrid'
  
  // 服务器配置
  server: {
    port: 3000,
    host: 'localhost'
  },
  
  // 路由配置
  routes: {
    dir: 'routes',
    ignore: ['**/*.test.ts', '**/*.test.tsx']
  },
  
  // 静态资源目录，默认为 'assets'
  // static: { dir: 'assets' },
  
  // Cookie 配置
  cookie: {
    secret: 'your-secret-key-here-change-in-production'
  },
  
  // Session 配置
  session: {
    secret: 'your-session-secret-here-change-in-production',
    store: 'memory',
    maxAge: 3600000, // 1小时
    secure: false,
    httpOnly: true
  },
  
  // 插件配置
  plugins: [
    // Tailwind CSS ${useTailwindV4 ? 'v4' : 'v3'} 插件
    tailwind({
      version: '${useTailwindV4 ? 'v4' : 'v3'}',
      cssPath: 'assets/style.css', // 指定主 CSS 文件路径
      optimize: true, // 生产环境优化
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
  
  // 开发配置
  dev: {
    // open: true,
    hmrPort: 24678,
    reloadDelay: 300
  },
  
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
  "nodeModulesDir": "auto",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact"
  },
  "imports": {
    "@dreamer/dweb": "${frameworkUrl}",
    "@dreamer/dweb/cli": "${frameworkUrl.includes('jsr:') ? frameworkUrl.replace(/@([\^~]?[\d.]+)$/, '@$1/cli') : frameworkUrl.replace('/mod.ts', '/cli.ts')}",
    "preact": "https://esm.sh/preact@latest",
    "preact/hooks": "https://esm.sh/preact@latest/hooks",
    "preact/jsx-runtime": "https://esm.sh/preact@latest/jsx-runtime"${useTailwindV4 ? `,
    "tailwindcss": "npm:tailwindcss@^4.1.10",
    "@tailwindcss/postcss": "npm:@tailwindcss/postcss@^4.1.10"` : `,
    "tailwindcss": "npm:tailwindcss@^3.4.0",
    "autoprefixer": "npm:autoprefixer@^10.4.20",
    "postcss": "npm:postcss@^8.4.47"`}
  },
  "tasks": {
${isMultiApp ? [
  ...appNames.map(appName => `    "dev:${appName}": "deno run -A @dreamer/dweb/cli dev:${appName}"`),
  ...appNames.map(appName => `    "build:${appName}": "deno run -A @dreamer/dweb/cli build:${appName}"`),
  ...appNames.map(appName => `    "start:${appName}": "deno run -A @dreamer/dweb/cli start:${appName}"`)
].join(',\n') : `    "dev": "deno run -A @dreamer/dweb/cli dev",
    "build": "deno run -A @dreamer/dweb/cli build",
    "start": "deno run -A @dreamer/dweb/cli start"`}
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
  appNames: string[]
): Promise<void> {
  if (isMultiApp) {
    // 多应用模式：为每个应用生成路由和组件
    for (const appName of appNames) {
      const appRoutesDir = path.join(projectDir, appName, 'routes');
      const appComponentsDir = path.join(projectDir, appName, 'components');
      
      await ensureDir(appRoutesDir);
      await ensureDir(appComponentsDir);
      
      // 生成示例路由
      await generateRoutesForApp(appRoutesDir, appName);
      
      // 生成示例组件
      await generateComponentsForApp(appComponentsDir, appName);
      
      // 生成示例 API
      await generateApiForApp(appRoutesDir, appName);
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
    await generateRoutesForApp(routesDir, projectName);
    
    // 生成示例组件
    await generateComponentsForApp(componentsDir, projectName);
    
    // 生成示例 API
    await generateApiForApp(routesDir, projectName);
  }
}

/**
 * 为单个应用生成路由文件
 */
async function generateRoutesForApp(routesDir: string, appName: string): Promise<void> {

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
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>
        {/* 使用 dangerouslySetInnerHTML 插入已渲染的页面内容 */}
        <div id="root" dangerouslySetInnerHTML={{ __html: children }} />
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

/**
 * 根布局组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default async function RootLayout({ children }: { children: any }) {
  // 获取当前路径（在客户端运行时）
  let currentPath = '/';
  if (typeof globalThis !== 'undefined' && globalThis.location) {
    currentPath = globalThis.location.pathname;
  }

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
            <div className="flex space-x-4">
              <a
                href="/"
                className={\`px-3 py-2 rounded-md text-sm font-medium transition-colors \${
                  currentPath === '/' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }\`}
              >
                首页
              </a>
              <a
                href="/about"
                className={\`px-3 py-2 rounded-md text-sm font-medium transition-colors \${
                  currentPath === '/about' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }\`}
              >
                关于
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
  const indexContent = `/**
 * 首页
 * 展示应用的基本信息和快速开始指南
 */

import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Button from '../components/Button.tsx';
import type { PageProps, LoadContext } from '@dreamer/dweb';

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
    token: string | null;
    userId: string | null;
    timestamp: string;
  };

  const handleClick = () => {
    alert('按钮被点击了！');
  };

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

  // 获取 API 数据
  const fetchApiData = async () => {
    // 只设置 loading 状态，不清空现有数据，避免闪动
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/test/getData', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(\`请求失败: \${response.status}\`);
      }
      const result = await response.json();
      if (result.success && result.data) {
        // 接收到新数据后再替换，避免闪动
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

  // 组件挂载时自动获取数据
  useEffect(() => {
    fetchApiData();
  }, []);

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
      <div className="bg-linear-to-r from-indigo-600 to-purple-600 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            {pageData.message}
          </h1>
          <p className="text-xl text-indigo-100 max-w-3xl mx-auto mb-8">
            基于 Deno + Preact + Tailwind CSS 的现代化全栈 Web 框架
          </p>
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
            <Button href="/about" variant="primary" className="bg-white text-indigo-600 hover:bg-gray-50">
              了解更多
            </Button>
            <Button onClick={handleClick} variant="primary" className="bg-white text-indigo-600 hover:bg-gray-50">
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
              这是一个使用 Preact Hooks (useState + useEffect) 获取 API 数据的示例
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

import { h } from 'preact';

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
      <div className="bg-linear-to-r from-blue-600 to-indigo-600 py-16">
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

import { h } from 'preact';
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
 * 为单个应用生成组件文件
 */
async function generateComponentsForApp(componentsDir: string, _appName: string): Promise<void> {
  // 生成示例组件 Button.tsx（美化后的按钮组件）
  const buttonContent = `/**
 * 按钮组件
 * 提供多种样式的按钮
 */

import { h } from 'preact';
import type { ComponentChildren, JSX } from 'preact';

/**
 * 按钮组件属性
 */
export interface ButtonProps {
  /** 按钮文本 */
  children: ComponentChildren;
  /** 按钮链接（如果提供，则渲染为 a 标签） */
  href?: string;
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
      <a href={href} className={combinedClasses}>
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
async function generateApiForApp(routesDir: string, _appName: string): Promise<void> {
  const apiDir = path.join(routesDir, 'api');
  await ensureDir(apiDir);
  
  // 生成示例 API test.ts
  const apiContent = `/**
 * 示例 API 路由
 * 通过 URL 路径指定方法名，支持驼峰格式和短横线格式
 * 例如：POST /api/test/getUser 或 POST /api/test/get-user
 */

import type { Request } from '@dreamer/dweb';

/**
 * 测试方法
 * 访问方式：POST /api/test/test
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
 * 访问方式：POST /api/test/getUser?id=123 或 POST /api/test/get-user?id=123
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
 * 访问方式：POST /api/test/createData 或 POST /api/test/create-data
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
 * 访问方式：POST /api/test/getData 或 POST /api/test/get-data
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

  await Deno.writeTextFile(path.join(apiDir, 'test.ts'), apiContent);
  console.log(`✅ 已创建: ${apiDir}/test.ts`);
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
  const commonButtonContent = `import { h } from 'preact';

/**
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
      
      // 生成 style.css
      const styleContent = useTailwindV4
        ? `/* Tailwind CSS v4 */
@import "tailwindcss";
`
        : `/* Tailwind CSS v3 */
@tailwind base;
@tailwind components;
@tailwind utilities;
`;

      await Deno.writeTextFile(path.join(appAssetsDir, 'style.css'), styleContent);
      console.log(`✅ 已创建: ${appName}/assets/style.css`);
      
      // 为每个应用创建 routes 目录
      const appRoutesDir = path.join(projectDir, appName, 'routes');
      await ensureDir(appRoutesDir);
    }
  } else {
    // 单应用模式：在项目根目录创建
  const assetsDir = path.join(projectDir, 'assets');
    await ensureDir(assetsDir);

    // 生成 style.css
    const styleContent = useTailwindV4
      ? `/* Tailwind CSS v4 */
@import "tailwindcss";
`
      : `/* Tailwind CSS v3 */
@tailwind base;
@tailwind components;
@tailwind utilities;
`;

  await Deno.writeTextFile(path.join(assetsDir, 'style.css'), styleContent);
  console.log(`✅ 已创建: assets/style.css`);
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

