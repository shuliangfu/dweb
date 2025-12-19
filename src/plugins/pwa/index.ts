/**
 * PWA 插件
 * 生成 manifest.json 和 Service Worker
 */

import type { Plugin, AppLike, Request, Response, BuildConfig } from '../../types/index.ts';
import type { PWAPluginOptions, PWAManifestConfig, ServiceWorkerConfig } from './types.ts';
import * as path from '@std/path';

/**
 * 生成 Service Worker 代码
 */
function generateServiceWorker(config: ServiceWorkerConfig): string {
  const cacheName = `dweb-pwa-cache-${Date.now()}`;
  const precache = config.precache || [];
  const runtimeCache = config.runtimeCache || [];
  const offlinePage = config.offlinePage;
  
  return `// DWeb PWA Service Worker
// 自动生成，请勿手动编辑

const CACHE_NAME = '${cacheName}';
const PRECACHE = ${JSON.stringify(precache, null, 2)};

// 安装 Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE);
    })
  );
  self.skipWaiting();
});

// 激活 Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 拦截请求
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // 跳过非 GET 请求
  if (event.request.method !== 'GET') {
    return;
  }
  
  // 跳过跨域请求
  if (url.origin !== location.origin) {
    return;
  }
  
  // 检查运行时缓存规则
  const runtimeRule = ${JSON.stringify(runtimeCache)}.find((rule) => {
    if (typeof rule.urlPattern === 'string') {
      return url.pathname.match(new RegExp(rule.urlPattern));
    } else {
      return rule.urlPattern.test(url.pathname);
    }
  });
  
  const strategy = runtimeRule?.handler || '${config.cacheStrategy || 'network-first'}';
  
  event.respondWith(handleRequest(event.request, strategy, runtimeRule?.options));
});

async function handleRequest(request, strategy, options) {
  const cache = await caches.open(CACHE_NAME);
  
  switch (strategy) {
    case 'cache-first':
      const cached = await cache.match(request);
      if (cached) {
        return cached;
      }
      try {
        const response = await fetch(request);
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        ${offlinePage ? `return cache.match('${offlinePage}') || new Response('Offline', { status: 503 });` : `return new Response('Offline', { status: 503 });`}
      }
      
    case 'network-first':
      try {
        const response = await fetch(request);
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        const cached = await cache.match(request);
        if (cached) {
          return cached;
        }
        ${offlinePage ? `return cache.match('${offlinePage}') || new Response('Offline', { status: 503 });` : `return new Response('Offline', { status: 503 });`}
      }
      
    case 'stale-while-revalidate':
      const cached = await cache.match(request);
      const fetchPromise = fetch(request).then((response) => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      });
      return cached || fetchPromise;
      
    case 'network-only':
      return fetch(request);
      
    case 'cache-only':
      return cache.match(request) || new Response('Not Found', { status: 404 });
      
    default:
      return fetch(request);
  }
}
`;
}

/**
 * 注入 PWA 链接到 HTML
 */
function injectPWALinks(html: string, manifestPath: string, swPath?: string): string {
  let result = html;
  
  // 注入 manifest 链接
  const manifestLink = `<link rel="manifest" href="${manifestPath}" />`;
  if (result.includes('</head>')) {
    result = result.replace('</head>', `    ${manifestLink}\n</head>`);
  }
  
  // 注入 theme-color meta
  // 注意：theme-color 应该从 manifest 中获取，这里简化处理
  const themeColorMeta = '<meta name="theme-color" content="#000000" />';
  if (result.includes('</head>')) {
    result = result.replace('</head>', `    ${themeColorMeta}\n</head>`);
  }
  
  // 注入 Service Worker 注册代码
  if (swPath) {
    const swScript = `<script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('${swPath}')
            .then((registration) => {
              console.log('Service Worker 注册成功:', registration.scope);
            })
            .catch((error) => {
              console.error('Service Worker 注册失败:', error);
            });
        });
      }
    </script>`;
    
    if (result.includes('</body>')) {
      result = result.replace('</body>', `    ${swScript}\n</body>`);
    } else if (result.includes('</html>')) {
      result = result.replace('</html>', `    ${swScript}\n</html>`);
    }
  }
  
  return result;
}

/**
 * 创建 PWA 插件
 */
export function pwa(options: PWAPluginOptions): Plugin {
  if (!options.manifest) {
    throw new Error('PWA 插件需要 manifest 配置');
  }
  
  return {
    name: 'pwa',
    config: options as unknown as Record<string, unknown>,
    
    /**
     * 请求处理钩子 - 注入 PWA 链接
     */
    async onRequest(req: Request, res: Response) {
      // 只处理 HTML 响应
      if (!res.body || typeof res.body !== 'string') {
        return;
      }
      
      const contentType = res.headers.get('Content-Type') || '';
      if (!contentType.includes('text/html')) {
        return;
      }
      
      if (options.injectLinks !== false) {
        try {
          const manifestPath = options.manifestOutputPath || '/manifest.json';
          const swPath = options.serviceWorker !== false 
            ? (options.serviceWorker?.swPath || options.swOutputPath || '/sw.js')
            : undefined;
          
          const html = res.body as string;
          const newHtml = injectPWALinks(html, manifestPath, swPath);
          res.body = newHtml;
        } catch (error) {
          console.error('[PWA Plugin] 注入 PWA 链接时出错:', error);
        }
      }
    },
    
    /**
     * 构建时钩子 - 生成 manifest.json 和 Service Worker
     */
    async onBuild(buildConfig: BuildConfig) {
      const outDir = buildConfig.outDir || 'dist';
      const manifestOutputPath = options.manifestOutputPath || 'manifest.json';
      const swOutputPath = options.swOutputPath || 'sw.js';
      
      console.log('📱 [PWA Plugin] 开始生成 PWA 文件...');
      
      try {
        // 生成 manifest.json
        const manifestPath = path.join(outDir, manifestOutputPath);
        await Deno.mkdir(path.dirname(manifestPath), { recursive: true });
        
        // 确保 manifest 包含必需的字段
        const manifest: PWAManifestConfig = {
          short_name: options.manifest.short_name || options.manifest.name,
          start_url: options.manifest.start_url || '/',
          display: options.manifest.display || 'standalone',
          theme_color: options.manifest.theme_color || '#000000',
          background_color: options.manifest.background_color || '#ffffff',
          ...options.manifest,
          // name 必须在最后，确保使用用户提供的值
          name: options.manifest.name,
        };
        
        await Deno.writeTextFile(manifestPath, JSON.stringify(manifest, null, 2));
        console.log(`✅ [PWA Plugin] 生成 manifest.json: ${manifestPath}`);
        
        // 生成 Service Worker
        if (options.serviceWorker !== false) {
          const swConfig = options.serviceWorker || {};
          const swCode = generateServiceWorker(swConfig);
          const swPath = path.join(outDir, swOutputPath);
          await Deno.writeTextFile(swPath, swCode);
          console.log(`✅ [PWA Plugin] 生成 Service Worker: ${swPath}`);
        }
      } catch (error) {
        console.error('❌ [PWA Plugin] 生成 PWA 文件时出错:', error);
      }
    },
  };
}

// 导出类型
export type { PWAPluginOptions, PWAManifestConfig, ServiceWorkerConfig, ManifestIcon, ManifestShortcut, ManifestRelatedApplication } from './types.ts';

