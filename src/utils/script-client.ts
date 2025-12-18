/**
 * 客户端脚本工具函数
 * 用于生成客户端渲染脚本代码
 */

import { filePathToHttpUrl } from "./path.ts";

/**
 * 创建客户端 JS 脚本
 * @param routePath 路由路径（用于动态导入）
 * @param renderMode 渲染模式
 * @param props 页面 props
 * @param shouldHydrate 是否启用 hydration
 * @param layoutPath 布局文件路径（可选）
 * @returns 客户端脚本 HTML
 */
export function createClientScript(
  routePath: string,
  renderMode: "ssr" | "csr" | "hybrid",
  props: Record<string, unknown>,
  shouldHydrate: boolean = false,
  layoutPath?: string | null,
  basePath?: string,
): string {
  // 将文件路径转换为 HTTP URL
  const httpUrl = filePathToHttpUrl(routePath);
  // 转义路径中的特殊字符
  const escapedRoutePath = httpUrl.replace(/'/g, "\\'");
  const propsJson = JSON.stringify(props).replace(/</g, "\\u003c");

  // 如果有布局路径，转换为 HTTP URL
  let escapedLayoutPath = "null";
  if (layoutPath) {
    // layoutPath 已经是绝对路径，直接使用
    const layoutFileUrl = layoutPath.startsWith("file://")
      ? layoutPath
      : `file://${layoutPath}`;
    const layoutHttpUrl = filePathToHttpUrl(layoutFileUrl);
    escapedLayoutPath = `'${layoutHttpUrl.replace(/'/g, "\\'")}'`;
  }

  // CSR 模式：不再需要手动拦截链接
  // 如果使用 preact-router，它会自动处理链接点击
  // 如果不使用 preact-router，在 initClientSideNavigation 中处理
  const linkInterceptorScript = (renderMode === 'csr' || renderMode === 'hybrid') ? `
// CSR 链接拦截器（简化版）
(function() {
  if (window.__CSR_LINK_INTERCEPTOR_INITIALIZED__) return;
  window.__CSR_LINK_INTERCEPTOR_INITIALIZED__ = true;
  
  let navigateToFunc = null;
  
  const clickHandler = (event) => {
    const link = event.target?.closest?.('a');
    if (!link || link.tagName !== 'A') return;
    
    const href = link.getAttribute('href');
    if (!href || href === '#' || link.hasAttribute('download') || 
        link.target === '_blank' || link.target === '_parent' || link.target === '_top') {
      return;
    }
    
      try {
      const url = new URL(href, window.location.href);
      if (url.origin === window.location.origin) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        // 获取完整的路径（包括 search 和 hash）
        const fullPath = url.pathname + url.search + url.hash;
        
        if (navigateToFunc) {
          navigateToFunc(fullPath);
        } else {
          // 如果导航函数还没准备好，等待一下再重试
          // 避免在初始化完成前就刷新页面
          setTimeout(() => {
            if (navigateToFunc) {
              navigateToFunc(url.pathname + url.search + url.hash);
            } else {
              // 如果等待后还是没有，才回退到页面刷新
              window.location.href = href;
            }
          }, 100);
        }
      }
    } catch (e) {
      // URL 解析失败，允许默认行为
    }
  };
  
  // 注册事件监听器
  [window, document, document.documentElement, document.body].forEach(el => {
    if (el) el.addEventListener('click', clickHandler, { capture: true, passive: false });
  });
  
  // 处理前进/后退
  window.addEventListener('popstate', (e) => {
    if (navigateToFunc) {
      navigateToFunc(e.state?.path || window.location.pathname, true);
    }
  });
  
  window.__setCSRNavigateFunction = function(fn) {
    navigateToFunc = fn;
  };
})();
` : '';

  // CSR 模式客户端路由导航初始化函数（在模块中执行）
  // 参考用户之前的实现，使用类似 preact-router 的方式
  const clientRouterCode = (renderMode === 'csr' || renderMode === 'hybrid') ? `
// CSR 客户端路由导航初始化函数（简化版）
async function initClientSideNavigation(render, jsx) {
  if (window.__CSR_ROUTER_INITIALIZED__) return;
  window.__CSR_ROUTER_INITIALIZED__ = true;
  
  // 确保使用全局的 Preact 模块（与初始渲染使用相同的实例）
  // 等待全局模块加载完成
  if (!globalThis.__PREACT_MODULES__) {
    let waitCount = 0;
    while (!globalThis.__PREACT_MODULES__ && waitCount < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      waitCount++;
    }
  }
  
  // 必须使用全局模块，确保与初始渲染使用相同的 Preact 实例
  if (!globalThis.__PREACT_MODULES__) {
    throw new Error('Preact 模块未加载');
  }
  
  const { render: renderFunc, jsx: jsxFunc } = globalThis.__PREACT_MODULES__;
  
  if (typeof renderFunc !== 'function' || typeof jsxFunc !== 'function') {
    throw new Error('render 或 jsx 函数无效');
  }
  
  // 组件缓存
  const cache = new Map();
  
  // 加载页面数据（简化版：直接使用 Function 解析）
  async function loadPageData(pathname) {
    if (pathname === window.location.pathname && globalThis.__PAGE_DATA__) {
      return globalThis.__PAGE_DATA__;
    }
    
    const response = await fetch(pathname, {
      headers: { 'Accept': 'text/html' }
    });
    if (!response.ok) {
      console.error(\`页面数据请求失败: \${pathname}, 状态码: \${response.status}\`);
      throw new Error(\`请求失败: \${response.status}\`);
    }
    
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const script = Array.from(doc.querySelectorAll('script[type="module"]'))
      .find(s => s.textContent?.includes('__PAGE_DATA__'));
    
    if (!script) {
      console.error('未找到页面数据脚本，路径:', pathname);
      throw new Error('未找到页面数据脚本');
    }
    
    // 提取对象：找到 { 到匹配的 }
    const startIdx = script.textContent.indexOf('globalThis.__PAGE_DATA__');
    if (startIdx === -1) throw new Error('未找到 __PAGE_DATA__');
    
    const assignIdx = script.textContent.indexOf('=', startIdx);
    const braceStart = script.textContent.indexOf('{', assignIdx);
    if (braceStart === -1) throw new Error('未找到对象开始');
    
    // 括号匹配（考虑字符串中的括号）
    let count = 0;
    let braceEnd = braceStart;
    let inString = false;
    let stringChar = null;
    
    for (let i = braceStart; i < script.textContent.length; i++) {
      const char = script.textContent[i];
      const prevChar = i > 0 ? script.textContent[i - 1] : '';
      
      // 处理字符串
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && prevChar !== '\\\\') {
        inString = false;
        stringChar = null;
      }
      
      // 只在非字符串中计算括号
      if (!inString) {
        if (char === '{') count++;
        if (char === '}') {
          count--;
          if (count === 0) {
            braceEnd = i;
            break;
          }
        }
      }
    }
    
    if (count !== 0) throw new Error('括号不匹配');
    
    const objStr = script.textContent.substring(braceStart, braceEnd + 1);
    return new Function('return ' + objStr)();
  }
  
  // 加载并渲染路由
  async function navigateTo(path, replace = false) {
    // 获取 basePath（多应用模式使用）
    const basePath = globalThis.__PAGE_DATA__?.basePath || '/';
    
    // 如果 basePath 不是根路径，确保路径以 basePath 开头
    let normalizedPath = path;
    if (basePath !== '/') {
      const base = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
      // 如果路径不是以 basePath 开头，且不是绝对路径（以 / 开头但不是 basePath），则加上 basePath
      if (!normalizedPath.startsWith(base) && normalizedPath.startsWith('/')) {
        normalizedPath = base + normalizedPath;
      }
    }
    
    try {
      // 加载页面数据
      const pageData = await loadPageData(normalizedPath);
      
      // 加载组件
      let pageModule, layoutModule;
      try {
        [pageModule, layoutModule] = await Promise.all([
          import(pageData.route),
          pageData.layoutPath && pageData.layoutPath !== 'null' 
            ? import(pageData.layoutPath).catch(() => null)
            : Promise.resolve(null)
        ]);
      } catch (importError) {
        console.error('组件导入失败:', importError);
        throw new Error(\`组件导入失败: \${importError.message}\`);
      }
      
      const PageComponent = pageModule.default;
      if (!PageComponent) {
        console.error('页面组件未导出默认组件，路由:', pageData.route);
        throw new Error('页面组件未导出默认组件');
      }
      if (typeof PageComponent !== 'function') {
        console.error('页面组件不是函数，路由:', pageData.route);
        throw new Error('页面组件不是函数');
      }
      
      const LayoutComponent = layoutModule?.default || null;
      if (LayoutComponent && typeof LayoutComponent !== 'function') {
        LayoutComponent = null;
      }
      
      // 创建元素（支持异步组件）
      // 注意：如果 PageComponent 是 async function，直接调用它并等待 Promise
      // 如果组件是同步的，使用 jsx 函数调用
      let pageElement;
      try {
        // 先尝试直接调用组件（支持异步组件）
        const componentResult = PageComponent(pageData.props || {});
        // 如果返回 Promise，等待它
        if (componentResult instanceof Promise) {
          pageElement = await componentResult;
        } else {
          // 同步组件返回 JSX，但可能需要用 jsx 包装
          // 如果已经是有效的 Preact 元素，直接使用；否则用 jsx 包装
          pageElement = componentResult;
        }
      } catch (callError) {
        // 如果直接调用失败，尝试用 jsx 函数调用（同步组件）
        pageElement = jsxFunc(PageComponent, pageData.props || {});
        if (pageElement instanceof Promise) {
          pageElement = await pageElement;
        }
      }
      if (!pageElement) throw new Error('页面元素创建失败（返回 null）');
      
      // 创建最终元素（支持异步布局组件）
      let finalElement;
      if (LayoutComponent) {
        let layoutResult = jsxFunc(LayoutComponent, { children: pageElement });
        // 如果布局组件返回 Promise，等待它
        if (layoutResult instanceof Promise) {
          finalElement = await layoutResult;
        } else {
          finalElement = layoutResult;
        }
      } else {
        finalElement = pageElement;
      }
      
      if (!finalElement) throw new Error('最终元素创建失败（返回 null）');
      
      // 渲染（与初始渲染使用完全相同的方式）
      const container = document.getElementById('root');
      if (!container) throw new Error('未找到容器');
      
      // 检查目标页面的渲染模式
      const targetMode = pageModule.renderMode || pageData.renderMode || 'csr';
      
      // Preact 的 render 函数：如果要替换内容，需要先卸载之前的渲染
      try {
        // 如果容器有内容，先卸载
        if (container.children.length > 0 || container.textContent.trim() !== '') {
          renderFunc(null, container);
        }
        
        // 根据目标页面的渲染模式决定使用 render 还是 hydrate
        if (targetMode === 'hybrid') {
          // Hybrid 模式：尝试 hydration，如果失败则使用 render
          try {
            const { hydrate } = globalThis.__PREACT_MODULES__ || {};
            if (hydrate && typeof hydrate === 'function') {
              hydrate(finalElement, container);
            } else {
              renderFunc(finalElement, container);
            }
          } catch (hydrateError) {
            // hydration 失败，使用 render
            renderFunc(finalElement, container);
          }
        } else {
          // CSR 模式：直接使用 render
          renderFunc(finalElement, container);
        }
      } catch (renderError) {
        throw renderError;
      }
      
      // 等待一下，让 Preact 完成渲染（虽然 render 是同步的，但为了保险）
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // 检查渲染结果
      let hasContent = container.children.length > 0 || container.textContent.trim() !== '';
      
      // 如果渲染成功，立即更新历史记录（在验证之前更新，确保 URL 变化）
      if (hasContent) {
        // 更新历史记录（在渲染成功后立即更新，确保 URL 变化）
        // 使用 normalizedPath 而不是原始 path，确保 URL 正确
        if (replace) {
          window.history.replaceState({ path: normalizedPath }, '', normalizedPath);
        } else {
          window.history.pushState({ path: normalizedPath }, '', normalizedPath);
        }
        
        // 触发自定义事件，通知 Navbar 等组件路径已变化
        try {
          window.dispatchEvent(new CustomEvent('routechange', { 
            detail: { path: normalizedPath } 
          }));
          // 也触发 popstate 事件，确保兼容性
          window.dispatchEvent(new PopStateEvent('popstate', { state: { path: normalizedPath } }));
        } catch (_e) {
          // 静默处理事件触发错误
        }
      }
      
      // 如果容器为空，尝试重新渲染
      if (!hasContent) {
        // 重新从全局模块获取（确保使用最新的）
        const { render: renderRetry, jsx: jsxRetry } = globalThis.__PREACT_MODULES__;
        
        // 重新创建元素（支持异步组件）
        let pageElementRetry;
        try {
          // 先尝试直接调用组件（支持异步组件）
          const componentResultRetry = PageComponent(pageData.props || {});
          if (componentResultRetry instanceof Promise) {
            pageElementRetry = await componentResultRetry;
          } else {
            pageElementRetry = componentResultRetry;
          }
        } catch (callError) {
          // 如果直接调用失败，尝试用 jsx 函数调用（同步组件）
          pageElementRetry = jsxRetry(PageComponent, pageData.props || {});
          if (pageElementRetry instanceof Promise) {
            pageElementRetry = await pageElementRetry;
          }
        }
        // 重新创建最终元素（支持异步布局组件）
        let finalElementRetry;
        if (LayoutComponent) {
          try {
            // 先尝试直接调用布局组件（支持异步组件）
            const layoutResultRetry = LayoutComponent({ children: pageElementRetry });
            if (layoutResultRetry instanceof Promise) {
              finalElementRetry = await layoutResultRetry;
            } else {
              finalElementRetry = layoutResultRetry;
            }
          } catch (layoutCallError) {
            // 如果直接调用失败，尝试用 jsx 函数调用（同步组件）
            let layoutResultRetry = jsxRetry(LayoutComponent, { children: pageElementRetry });
            if (layoutResultRetry instanceof Promise) {
              finalElementRetry = await layoutResultRetry;
            } else {
              finalElementRetry = layoutResultRetry;
            }
          }
        } else {
          finalElementRetry = pageElementRetry;
        }
        
        // 清空容器并重新渲染
        container.innerHTML = '';
        renderRetry(finalElementRetry, container);
        
        // 再次检查
        if (container.children.length > 0 || container.textContent.trim() !== '') {
          hasContent = true;
          // 如果重新渲染成功，更新历史记录
          if (!replace) {
            // 只有在非 replace 模式下才更新（replace 模式已经在上面更新过了）
            window.history.pushState({ path: normalizedPath }, '', normalizedPath);
          }
        }
      }
      
      // 验证渲染结果
      if (!hasContent) {
        throw new Error('渲染后容器为空');
      }
    } catch (error) {
      // 打印错误到控制台，便于调试
      console.error('客户端路由导航错误:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // 如果是 404 或网络错误，回退到页面刷新
      if (errorMsg.includes('404') || errorMsg.includes('Not Found') || errorMsg.includes('fetch') || errorMsg.includes('请求失败')) {
        try {
          window.location.href = normalizedPath;
        } catch (_e) {
          // 如果无法跳转，静默失败
        }
      } else {
        // 其他错误（如组件加载失败、渲染失败等），也回退到页面刷新
        // 这样可以确保用户能看到新页面，即使客户端路由失败
        try {
          window.location.href = normalizedPath;
        } catch (_e) {
          // 如果无法跳转，静默失败
        }
      }
    }
  }
  
  // 暴露导航函数
  if (typeof window.__setCSRNavigateFunction === 'function') {
    window.__setCSRNavigateFunction(navigateTo);
  }
}
` : '';
  
  // 处理 basePath（多应用模式使用）
  const appBasePath = basePath || '/';
  const escapedBasePath = appBasePath.replace(/'/g, "\\'");

  const clientContent = `
// 页面数据
globalThis.__PAGE_DATA__ = {
  route: '${escapedRoutePath}',
  renderMode: '${renderMode}',
  props: ${propsJson},
  layoutPath: ${escapedLayoutPath},
  basePath: '${escapedBasePath}'
};

${clientRouterCode}


// 动态导入 Preact 并初始化
// 注意：import map 需要在 <head> 中定义，这样浏览器才能解析 'preact' 模块
(async function() {
  try {
    // 等待 DOM 加载完成
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        if (document.readyState === 'complete') {
          resolve(undefined);
        } else {
          document.addEventListener('DOMContentLoaded', resolve);
        }
      });
    }
    
    const mode = '${renderMode}';
    const shouldHydrate = ${shouldHydrate};
    
    // 如果是 SSR 模式且未启用 hydration，完全不执行任何操作
    if (mode === 'ssr' && !shouldHydrate) {
      return;
    }
    
    // 获取 Preact 模块（优先使用预加载的，否则动态导入）
    let hydrate, render, jsx;
    
    // 如果 Preact 模块正在预加载，等待它完成（最多等待 3 秒）
    if (!globalThis.__PREACT_MODULES__) {
      let waitCount = 0;
      const maxWait = 30; // 最多等待 30 次（约 3 秒）
      while (!globalThis.__PREACT_MODULES__ && waitCount < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
      }
    }
    
    if (globalThis.__PREACT_MODULES__) {
      // 使用预加载的 Preact 模块（避免重复导入）
      ({ hydrate, render, jsx } = globalThis.__PREACT_MODULES__);
    } else {
      // 如果预加载超时，动态导入 Preact 模块
      const [preactModule, jsxRuntimeModule] = await Promise.all([
        import('preact'),
        import('preact/jsx-runtime')
      ]);
      hydrate = preactModule.hydrate;
      render = preactModule.render;
      jsx = jsxRuntimeModule.jsx;
    }
    
    // 动态导入页面组件（使用 HTTP URL）
    let module;
    try {
      module = await import('${escapedRoutePath}');
    } catch (importError) {
      throw new Error('页面组件导入失败: ' + importError.message);
    }
    
    const PageComponent = module.default;
    
    if (!PageComponent || typeof PageComponent !== 'function') {
      throw new Error('页面组件未导出默认组件或组件不是函数');
    }
    
    const actualMode = module.renderMode || mode;
    const actualShouldHydrate = module.hydrate === true || shouldHydrate;
    
    // 如果有布局，导入布局组件
    let LayoutComponent = null;
    const layoutPath = ${escapedLayoutPath};
    if (layoutPath) {
      try {
        const layoutModule = await import(layoutPath);
        LayoutComponent = layoutModule.default;
      } catch (_layoutError) {
        // 布局加载失败时静默处理
      }
    }
    
    // 查找容器元素（优先使用 #root，如果没有则使用 body）
    const container = document.getElementById('root');
    if (!container) {
      return;
    }
    
    // 创建页面元素（支持异步组件）
    let pageElement;
    try {
      // 先尝试直接调用组件（支持异步组件）
      // 如果组件是 async function，它会返回 Promise，我们等待它
      // 如果组件是同步函数，它直接返回 JSX 元素
      const componentResult = PageComponent(${propsJson});
      if (componentResult instanceof Promise) {
        pageElement = await componentResult;
      } else {
        // 同步组件返回的结果，可能需要用 jsx 包装
        // 但如果已经是有效的 Preact 元素，直接使用
        pageElement = componentResult;
      }
    } catch (elementError) {
      // 如果直接调用失败，尝试用 jsx 函数调用（同步组件）
      try {
        let elementResult = jsx(PageComponent, ${propsJson});
        if (elementResult instanceof Promise) {
          pageElement = await elementResult;
        } else {
          pageElement = elementResult;
        }
      } catch (jsxError) {
        throw new Error('创建页面元素失败: ' + elementError.message);
      }
    }
    
    // 如果有布局，用布局包裹页面元素（支持异步布局组件）
    let finalElement = pageElement;
    if (LayoutComponent) {
      try {
        // 先尝试直接调用布局组件（支持异步组件）
        const layoutResult = LayoutComponent({ children: pageElement });
        if (layoutResult instanceof Promise) {
          finalElement = await layoutResult;
        } else {
          finalElement = layoutResult;
        }
      } catch (layoutError) {
        // 如果直接调用失败，尝试用 jsx 函数调用（同步组件）
        try {
          let layoutResult = jsx(LayoutComponent, { children: pageElement });
          if (layoutResult instanceof Promise) {
            finalElement = await layoutResult;
          } else {
            finalElement = layoutResult;
          }
        } catch (jsxError) {
          // 如果都失败，使用原始页面元素
          finalElement = pageElement;
        }
      }
    }
    
    if (actualMode === 'csr') {
      // 客户端渲染：完全在客户端渲染
      // 清空容器内容
      container.innerHTML = '';
      
      try {
        render(finalElement, container);
      } catch (renderError) {
        throw renderError;
      }
      
      // CSR 模式：初始化客户端路由导航（SPA 无刷新切换）
      if (typeof initClientSideNavigation === 'function') {
        initClientSideNavigation(render, jsx);
      }
    } else if (actualMode === 'hybrid' || actualShouldHydrate) {
      // Hybrid 模式或明确指定 hydrate=true：在客户端激活
      // 注意：hydrate 需要服务端和客户端的 HTML 结构完全匹配
      // 检查容器是否有内容（服务端渲染的内容）
      if (container.children.length === 0 && container.textContent.trim() === '') {
        // 如果容器为空，说明服务端没有渲染内容，直接客户端渲染
        render(finalElement, container);
      } else {
        // 容器有内容，尝试 hydration
        try {
          // 使用 hydrate 激活服务端渲染的内容
          hydrate(finalElement, container);
        } catch (_hydrateError) {
          // 如果 hydration 失败，保留原有内容，不进行客户端渲染
          // 这样可以避免页面内容消失
        }
      }
      
      // Hybrid 模式：初始化客户端路由导航（SPA 无刷新切换）
      if (typeof initClientSideNavigation === 'function') {
        initClientSideNavigation(render, jsx);
      }
    }
  } catch (error) {
    // 发生错误时，输出详细错误信息到控制台，便于调试
    console.error('❌ 客户端渲染失败:', error);
    console.error('错误堆栈:', error.stack);
    console.error('错误详情:', {
      message: error.message,
      name: error.name,
      cause: error.cause
    });
    
    // 在页面上显示错误信息（开发环境）
    const container = document.getElementById('root');
    if (container) {
      container.innerHTML = \`
        <div style="padding: 20px; background: #fee; border: 2px solid #f00; margin: 20px;">
          <h2 style="color: #c00;">客户端渲染失败</h2>
          <p><strong>错误:</strong> \${error.message}</p>
          <pre style="background: #fff; padding: 10px; overflow: auto;">\${error.stack || '无堆栈信息'}</pre>
        </div>
      \`;
    }
  }
})();
`;

  // 对于 CSR 和 Hybrid 模式，需要立即执行链接拦截器（不使用 module，立即执行）
  if (renderMode === 'csr' || renderMode === 'hybrid') {
    // 返回两个脚本：立即执行的链接拦截器 + 模块化的渲染代码
    return `
<script>
${linkInterceptorScript}
</script>
<script type="module">
${clientContent}
</script>`;
  }
  
  return `<script type="module">${clientContent}</script>`;
}

