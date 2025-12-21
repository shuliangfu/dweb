/**
 * 客户端脚本工具函数
 * 用于生成客户端渲染脚本代码
 */

import { filePathToHttpUrl } from "./path.ts";
import { minifyJavaScript } from "./minify.ts";

/**
 * 创建客户端 JS 脚本
 * @param routePath 路由路径（用于动态导入）
 * @param renderMode 渲染模式
 * @param props 页面 props
 * @param shouldHydrate 是否启用 hydration
 * @param layoutPath 布局文件路径（可选）
 * @param basePath 应用基础路径（可选）
 * @param allLayoutPaths 所有布局路径数组（可选）
 * @param layoutDisabled 是否禁用布局（可选）
 * @returns 客户端脚本 HTML
 */
export async function createClientScript(
  routePath: string,
  renderMode: "ssr" | "csr" | "hybrid",
  props: Record<string, unknown>,
  shouldHydrate: boolean = false,
  layoutPath?: string | null,
  basePath?: string,
  allLayoutPaths?: string[] | null,
  layoutDisabled: boolean = false,
): Promise<string> {
  // 将文件路径转换为 HTTP URL
  const httpUrl = filePathToHttpUrl(routePath);
  // 转义路径中的特殊字符
  const escapedRoutePath = httpUrl.replace(/'/g, "\\'");

  // 提取 metadata（如果存在），并从 props 中移除，避免重复和潜在问题
  const metadata = (props as any)?.metadata || null;
  const propsWithoutMetadata = { ...props };
  if ("metadata" in propsWithoutMetadata) {
    delete (propsWithoutMetadata as any).metadata;
  }
  // 确保 propsJson 是有效的 JSON，并转义特殊字符
  let propsJson = JSON.stringify(propsWithoutMetadata);
  // 转义 HTML 特殊字符，防止 XSS
  propsJson = propsJson.replace(/</g, "\\u003c").replace(/>/g, "\\u003e");

  // 如果有布局路径，转换为 HTTP URL
  let escapedLayoutPath = "null";
  let escapedAllLayoutPaths = "null";
  if (layoutPath) {
    // layoutPath 已经是绝对路径，直接使用
    const layoutFileUrl = layoutPath.startsWith("file://")
      ? layoutPath
      : `file://${layoutPath}`;
    const layoutHttpUrl = filePathToHttpUrl(layoutFileUrl);
    escapedLayoutPath = `'${layoutHttpUrl.replace(/'/g, "\\'")}'`;
  }

  // 如果有多个布局路径，转换为 HTTP URL 数组
  if (
    allLayoutPaths && Array.isArray(allLayoutPaths) && allLayoutPaths.length > 0
  ) {
    const layoutUrls = allLayoutPaths.map((layoutPath: string) => {
      const layoutFileUrl = layoutPath.startsWith("file://")
        ? layoutPath
        : `file://${layoutPath}`;
      const layoutHttpUrl = filePathToHttpUrl(layoutFileUrl);
      return `'${layoutHttpUrl.replace(/'/g, "\\'")}'`;
    });
    escapedAllLayoutPaths = `[${layoutUrls.join(", ")}]`;
  }

  // 调试日志已移除，避免在并发请求时产生混乱
  // console.log({ httpUrl, escapedLayoutPath });

  // CSR 模式：不再需要手动拦截链接
  // 如果使用 preact-router，它会自动处理链接点击
  // 如果不使用 preact-router，在 initClientSideNavigation 中处理
  let linkInterceptorScript = "";
  if (renderMode === "csr" || renderMode === "hybrid") {
    linkInterceptorScript = `
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
`;
  }

  // CSR 模式客户端路由导航初始化函数（在模块中执行）
  // 参考用户之前的实现，使用类似 preact-router 的方式
  let clientRouterCode = "";
  if (renderMode === "csr" || renderMode === "hybrid") {
    clientRouterCode = `
// 辅助函数：加载布局组件
async function loadLayoutComponents(pageData) {
  const LayoutComponents = [];
  
  // 检查页面是否禁用了布局
  if (pageData.layout === false) {
    // 如果页面禁用了布局，直接返回空数组
    return LayoutComponents;
  }
  
  if (pageData.allLayoutPaths && Array.isArray(pageData.allLayoutPaths) && pageData.allLayoutPaths.length > 0) {
    // 加载所有布局组件（从最具体到最通用）
    // 如果某个布局设置了 layout = false，则停止继承
    for (const layoutPath of pageData.allLayoutPaths) {
      try {
        const layoutModule = await import(layoutPath);
        const LayoutComponent = layoutModule?.default;
        if (LayoutComponent && typeof LayoutComponent === 'function') {
          LayoutComponents.push(LayoutComponent);
          
          // 检查是否设置了 layout = false（禁用继承）
          // 如果设置了 layout = false，则停止继承，不再加载后续的布局
          if (layoutModule.layout === false) {
            break;
          }
        }
      } catch (_layoutError) {
        // 布局加载失败时静默处理，跳过该布局
      }
    }
  } else if (pageData.layoutPath && pageData.layoutPath !== 'null' && typeof pageData.layoutPath === 'string') {
    // 向后兼容：如果只有单个布局路径
    try {
      const layoutModule = await import(pageData.layoutPath);
      const LayoutComponent = layoutModule?.default;
      if (LayoutComponent && typeof LayoutComponent === 'function') {
        LayoutComponents.push(LayoutComponent);
      }
    } catch (_layoutError) {
      // 布局加载失败时静默处理
    }
  }
  return LayoutComponents;
}

// 辅助函数：创建页面元素（支持异步组件）
async function createPageElement(PageComponent, props, jsxFunc) {
  let pageElement;
  try {
    // 先尝试直接调用组件（支持异步组件）
    const componentResult = PageComponent(props);
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
    pageElement = jsxFunc(PageComponent, props);
    if (pageElement instanceof Promise) {
      pageElement = await pageElement;
    }
  }
  if (!pageElement) {
    throw new Error('页面元素创建失败（返回 null）');
  }
  return pageElement;
}

// 辅助函数：嵌套布局组件（支持异步布局组件和布局继承）
async function nestLayoutComponents(LayoutComponents, pageElement, jsxFunc) {
  if (LayoutComponents.length === 0) {
    return pageElement;
  }
  
  // 从最内层到最外层嵌套布局组件
  let currentElement = pageElement;
  for (const LayoutComponent of LayoutComponents) {
    try {
      // 先尝试直接调用布局组件（支持异步组件）
      const layoutResult = LayoutComponent({ children: currentElement });
      // 如果布局组件返回 Promise，等待它
      if (layoutResult instanceof Promise) {
        currentElement = await layoutResult;
      } else {
        currentElement = layoutResult;
      }
    } catch (layoutError) {
      // 如果直接调用失败，尝试用 jsx 函数调用（同步组件）
      try {
        let layoutResult = jsxFunc(LayoutComponent, { children: currentElement });
        if (layoutResult instanceof Promise) {
          currentElement = await layoutResult;
        } else {
          currentElement = layoutResult;
        }
      } catch (jsxError) {
        // 如果都失败，跳过该布局，继续使用当前元素
      }
    }
  }
  return currentElement;
}

// 辅助函数：创建最终元素（页面元素 + 布局嵌套）
async function createFinalElement(PageComponent, LayoutComponents, props, jsxFunc) {
  // 创建页面元素
  const pageElement = await createPageElement(PageComponent, props, jsxFunc);
  
  // 嵌套布局组件
  let finalElement = await nestLayoutComponents(LayoutComponents, pageElement, jsxFunc);
  
  // 如果最终元素为空，使用页面元素作为后备
  if (!finalElement) {
    finalElement = pageElement;
  }
  
  // 如果页面元素也为空，才抛出错误
  if (!finalElement) {
    throw new Error('最终元素创建失败（返回 null）');
  }
  
  return finalElement;
}

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
  
  // 更新 SEO meta 标签（客户端导航时使用）
  // 直接使用全局的 updateMetaTagsFromPageData 函数
  // updateMetaTagsFromPageData 可以接受 pageData 对象或 metadata 对象
  function updateMetaTags(metadata) {
    if (typeof window.updateMetaTagsFromPageData === 'function') {
      window.updateMetaTagsFromPageData(metadata);
    }
  }
  
  // 提取并更新 i18n 数据（从 HTML 中提取 window.__I18N_DATA__）
  function extractAndUpdateI18nData(html) {
    try {
      // 查找包含 __I18N_DATA__ 的 script 标签（非模块脚本，通常在 head 中）
      // 使用 RegExp 构造函数避免模板字符串插值冲突
      const scriptTagRegex = new RegExp('<script[^>]*>[\\s\\S]*?window\\.__I18N_DATA__[\\s\\S]*?</script>', 'i');
      const i18nScriptMatch = html.match(scriptTagRegex);
      if (i18nScriptMatch) {
        const scriptContent = i18nScriptMatch[0];
        
        // 提取 window.__I18N_DATA__ 对象
        // 使用字符串拼接避免模板字符串插值冲突
        const dataRegex = new RegExp('window\\.__I18N_DATA__\\s*=\\s*(\\{[\\s\\S]*?\\});');
        const dataMatch = scriptContent.match(dataRegex);
        if (dataMatch) {
          try {
            // 使用 Function 解析对象（避免 eval）
            const i18nData = new Function('return ' + dataMatch[1])();
            
            // 更新全局 i18n 数据
            if (i18nData && typeof i18nData === 'object') {
              window.__I18N_DATA__ = i18nData;
              
              // 更新全局翻译函数（确保 this 绑定正确）
              if (i18nData.t && typeof i18nData.t === 'function') {
                window.$t = function(key, params) {
                  if (!window.__I18N_DATA__ || !window.__I18N_DATA__.t) {
                    return key;
                  }
                  return window.__I18N_DATA__.t.call(window.__I18N_DATA__, key, params);
                };
              }
            }
          } catch (_e) {
            // 解析失败，静默处理
          }
        }
      }
    } catch (_e) {
      // 提取失败，静默处理（可能没有 i18n 数据）
    }
    
    // 确保 $t 函数始终可用（即使没有 i18n 数据）
    if (typeof window.$t !== 'function') {
      window.$t = function(key, _params) {
        return key;
      };
    }
  }
  
  // 加载页面数据（简化版：直接使用 Function 解析）
  async function loadPageData(pathname) {
    if (pathname === window.location.pathname && globalThis.__PAGE_DATA__) {
      return globalThis.__PAGE_DATA__;
    }
    
    const response = await fetch(pathname, {
      headers: { 'Accept': 'text/html' }
    });
    if (!response.ok) {
      throw new Error(\`请求失败: \${response.status}\`);
    }
    
    const html = await response.text();
    
    // 提取并更新 i18n 数据（在解析页面数据之前）
    extractAndUpdateI18nData(html);
    
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const allScripts = Array.from(doc.querySelectorAll('script[type="module"]'));
    
    // 优先查找包含 __PAGE_DATA__ 赋值的脚本（双下划线，确保是赋值不是读取）
    // 必须同时包含 'globalThis.__PAGE_DATA__ =' 和 'route:' 字段
    let script = allScripts.find(s => {
      const text = s.textContent || '';
      // 确保是双下划线 __PAGE_DATA__，不是单下划线 _PAGE_DATA_
      const hasAssign = text.includes('globalThis.__PAGE_DATA__ =') || text.includes('globalThis.__PAGE_DATA__=');
      const hasRoute = text.includes('route:');
      return hasAssign && hasRoute;
    });
    
    // 如果没找到，尝试只匹配赋值语句（向后兼容）
    if (!script) {
      script = allScripts.find(s => {
        const text = s.textContent || '';
        return text.includes('globalThis.__PAGE_DATA__ =') || text.includes('globalThis.__PAGE_DATA__=');
      });
    }
    
    // 如果还是没找到，再尝试查找包含 __PAGE_DATA__ 的脚本（最后的后备方案）
    if (!script) {
      script = allScripts.find(s => s.textContent?.includes('__PAGE_DATA__'));
    }
    
    if (!script) {
      throw new Error('未找到页面数据脚本');
    }
    
    // 提取对象：找到 { 到匹配的 }
    const scriptText = script.textContent || '';
    const startIdx = scriptText.indexOf('globalThis.__PAGE_DATA__');
    
    if (startIdx === -1) {
      throw new Error('未找到 __PAGE_DATA__');
    }
    
    const assignIdx = scriptText.indexOf('=', startIdx);
    
    // 在等号后查找第一个 {，但需要跳过可能的空白和换行
    let braceStart = assignIdx + 1;
    while (braceStart < scriptText.length) {
      const char = scriptText[braceStart];
      const charCode = char.charCodeAt(0);
      // 检查是否为空白字符：空格(32)、制表符(9)、换行符(10)、回车符(13)
      if (charCode !== 32 && charCode !== 9 && charCode !== 10 && charCode !== 13) {
        break;
      }
      braceStart++;
    }
    
    if (scriptText[braceStart] !== '{') {
      throw new Error('未找到对象开始');
    }
    
    // 括号匹配（考虑字符串中的括号）
    let count = 0;
    let braceEnd = braceStart;
    let inString = false;
    let stringChar = null;
    
    for (let i = braceStart; i < scriptText.length; i++) {
      const char = scriptText[i];
      const prevChar = i > 0 ? scriptText[i - 1] : '';
      
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
    
    if (count !== 0) {
      throw new Error('括号不匹配');
    }
    
    const objStr = scriptText.substring(braceStart, braceEnd + 1);
    
    let pageData;
    try {
      pageData = new Function('return ' + objStr)();
    } catch (parseError) {
      throw new Error(\`解析页面数据失败: \${parseError.message}\`);
    }
    
    // 验证解析出的数据
    if (!pageData || typeof pageData !== 'object') {
      throw new Error('页面数据格式无效');
    }
    
    return pageData;
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
      
      // 验证页面数据
      if (!pageData || typeof pageData !== 'object') {
        throw new Error('页面数据格式无效');
      }
      
      // 检查 route 字段是否存在
      if (!pageData.route || typeof pageData.route !== 'string') {
        throw new Error('页面数据缺少 route 字段，无法加载组件');
      }
      
      // 加载组件
      let pageModule;
      try {
        pageModule = await import(pageData.route);
      } catch (importError) {
        throw new Error(\`组件导入失败: \${importError.message}\`);
      }
      
      const PageComponent = pageModule.default;
      if (!PageComponent) {
        throw new Error('页面组件未导出默认组件');
      }
      if (typeof PageComponent !== 'function') {
        throw new Error('页面组件不是函数');
      }
      
      // 加载所有布局组件（支持布局继承）
      const LayoutComponents = await loadLayoutComponents(pageData);
      
      // 创建最终元素（页面元素 + 布局嵌套）
      const finalElement = await createFinalElement(PageComponent, LayoutComponents, pageData.props || {}, jsxFunc);
      
      // 渲染（与初始渲染使用完全相同的方式）
      const container = document.getElementById('root');
      if (!container) throw new Error('未找到容器');
      
      // 检查目标页面的渲染模式
      const targetMode = pageModule.renderMode || pageData.renderMode || 'csr';
      
      // Preact 的 render 函数会自动处理内容替换，不需要先卸载
      // 直接渲染新内容，Preact 会进行差异更新，避免闪动
      try {
        // 使用 requestAnimationFrame 确保在下一帧渲染，优化性能
        await new Promise(resolve => requestAnimationFrame(resolve));
        
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
          // Preact 的 render 会自动处理内容替换，无需先卸载
          renderFunc(finalElement, container);
        }
      } catch (renderError) {
        throw renderError;
      }
      
      // 等待一下，让 Preact 完成 DOM 更新
      // 使用 requestAnimationFrame 确保 DOM 更新完成
      await new Promise(resolve => requestAnimationFrame(resolve));
      
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
          // 注意：不要手动触发 popstate 事件，这会导致循环
          // popstate 事件应该只在浏览器前进/后退时由浏览器自动触发
        } catch (_e) {
          // 静默处理事件触发错误
        }
      }
      
      // 如果容器为空，尝试重新渲染
      if (!hasContent) {
        // 重新从全局模块获取（确保使用最新的）
        const { render: renderRetry, jsx: jsxRetry } = globalThis.__PREACT_MODULES__;
        
        // 重新创建最终元素（使用辅助函数）
        const finalElementRetry = await createFinalElement(PageComponent, LayoutComponents, pageData.props || {}, jsxRetry);
        
        // 直接重新渲染，Preact 会自动处理内容替换
        // 使用 requestAnimationFrame 确保在下一帧渲染
        await new Promise(resolve => requestAnimationFrame(resolve));
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
      
      // 更新 SEO meta 标签（如果页面数据包含 metadata）
      if (typeof window.updateMetaTagsFromPageData === 'function') {
        window.updateMetaTagsFromPageData(pageData);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // 如果是 404 或网络错误，回退到页面刷新
      if (errorMsg.includes('404') || errorMsg.includes('Not Found') || errorMsg.includes('fetch') || errorMsg.includes('请求失败')) {
        try {
          window.location.href = normalizedPath;
        } catch (_e) {
          // 如果无法跳转，静默失败
        }
      } else {
        // 其他错误（如组件加载失败、渲染失败等），先尝试在控制台显示错误
        // 只有在严重错误时才回退到页面刷新
        // 对于布局相关的错误，不应该回退到页面刷新，因为布局继承是新增功能
        if (errorMsg.includes('布局组件渲染失败')) {
          // 布局渲染失败不应该导致页面刷新，因为我们已经跳过了失败的布局
          // 这种情况不应该发生，但如果发生了，至少页面已经渲染了
        } else {
          // 其他严重错误才回退到页面刷新
          try {
            window.location.href = normalizedPath;
          } catch (_e) {
            // 如果无法跳转，静默失败
          }
        }
      }
    }
  }
  
  // 暴露导航函数
  if (typeof window.__setCSRNavigateFunction === 'function') {
    window.__setCSRNavigateFunction(navigateTo);
  }
}
`;
  }

  // 处理 basePath（多应用模式使用）
  const appBasePath = basePath || "/";
  const escapedBasePath = appBasePath.replace(/'/g, "\\'");

  // 生成 metadata JSON（已在上面提取），确保格式正确
  let metadataJson = "null";
  if (metadata) {
    try {
      metadataJson = JSON.stringify(metadata);
      // 转义 HTML 特殊字符，防止 XSS
      metadataJson = metadataJson.replace(/</g, "\\u003c").replace(
        />/g,
        "\\u003e",
      );
    } catch (_error) {
      metadataJson = "null";
    }
  }

  const clientContent = `
// 确保 i18n 函数在页面加载时可用
// i18n 插件的脚本在 </head> 之前注入，所以这里应该已经存在 window.__I18N_DATA__
// 优先使用 window.__I18N_DATA__ 来初始化 window.$t
if (window.__I18N_DATA__ && window.__I18N_DATA__.t && typeof window.__I18N_DATA__.t === 'function') {
  // 使用 i18n 插件的翻译函数（确保 this 绑定正确）
  window.$t = function(key, params) {
    if (!window.__I18N_DATA__ || !window.__I18N_DATA__.t) {
      return key;
    }
    return window.__I18N_DATA__.t.call(window.__I18N_DATA__, key, params);
  };
} else if (typeof window.$t !== 'function') {
  // 如果 i18n 插件未启用或脚本未注入，使用默认函数
  window.$t = function(key, _params) {
    return key;
  };
}

// 页面数据
globalThis.__PAGE_DATA__ = {
  route: '${escapedRoutePath}',
  renderMode: '${renderMode}',
  props: ${propsJson},
  layoutPath: ${escapedLayoutPath},
  allLayoutPaths: ${escapedAllLayoutPaths},
  basePath: '${escapedBasePath}',
  metadata: ${metadataJson},
  layout: ${layoutDisabled ? "false" : "undefined"}
};

// 更新 SEO meta 标签的通用函数（全局函数，供客户端路由使用）
window.updateMetaTagsFromPageData = function updateMetaTagsFromPageData(pageData) {
  const metadata = pageData?.metadata || (pageData && typeof pageData === 'object' ? pageData : null);
  if (!metadata || typeof metadata !== 'object') return;
  
  const escapeHtml = (text) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  };
  
  const updateOrCreateMeta = (attr, value, content) => {
    let meta = document.querySelector(\`meta[\${attr}="\${value}"]\`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute(attr, value);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', escapeHtml(content));
  };
  
  // 更新 title
  if (metadata.title) {
    document.title = metadata.title;
    updateOrCreateMeta('property', 'og:title', metadata.title);
    updateOrCreateMeta('name', 'twitter:title', metadata.title);
  }
  
  // 更新 description
  if (metadata.description) {
    updateOrCreateMeta('name', 'description', metadata.description);
    updateOrCreateMeta('property', 'og:description', metadata.description);
    updateOrCreateMeta('name', 'twitter:description', metadata.description);
  }
  
  // 更新 keywords
  if (metadata.keywords) {
    const keywordsStr = Array.isArray(metadata.keywords) 
      ? metadata.keywords.join(', ') 
      : metadata.keywords;
    updateOrCreateMeta('name', 'keywords', keywordsStr);
  }
  
  // 更新 author
  if (metadata.author) {
    updateOrCreateMeta('name', 'author', metadata.author);
  }
  
  // 更新 Open Graph image
  if (metadata.image) {
    updateOrCreateMeta('property', 'og:image', metadata.image);
    updateOrCreateMeta('name', 'twitter:image', metadata.image);
  }
  
  // 更新 canonical URL
  if (metadata.url) {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', metadata.url);
  }
  
  // 更新 robots
  if (metadata.robots !== undefined) {
    if (metadata.robots === false) {
      updateOrCreateMeta('name', 'robots', 'noindex, nofollow');
    } else if (typeof metadata.robots === 'object') {
      const directives = [];
      if (metadata.robots.index !== false) directives.push('index');
      else directives.push('noindex');
      if (metadata.robots.follow !== false) directives.push('follow');
      else directives.push('nofollow');
      if (metadata.robots.noarchive) directives.push('noarchive');
      if (metadata.robots.nosnippet) directives.push('nosnippet');
      if (metadata.robots.noimageindex) directives.push('noimageindex');
      updateOrCreateMeta('name', 'robots', directives.join(', '));
    }
  }
}

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
    
    // 查找容器元素（优先使用 #root，如果没有则使用 body）
    const container = document.getElementById('root');
    if (!container) {
      return;
    }
    
    // 获取页面 props（从 __PAGE_DATA__ 中获取，避免直接插入 JSON）
    const pageProps = globalThis.__PAGE_DATA__?.props || {};
    
    // 加载所有布局组件（支持布局继承）
    const LayoutComponents = await loadLayoutComponents(globalThis.__PAGE_DATA__);
    
    // 创建最终元素（页面元素 + 布局嵌套）
    const finalElement = await createFinalElement(PageComponent, LayoutComponents, pageProps, jsx);
    
    if (actualMode === 'csr') {
      // 客户端渲染：完全在客户端渲染
      // 清空容器内容
      container.innerHTML = '';
      
      try {
        render(finalElement, container);
      } catch (renderError) {
        throw renderError;
      }
      
      // 更新 SEO meta 标签（初始加载时，CSR 模式）
      if (typeof updateMetaTagsFromPageData === 'function') {
        updateMetaTagsFromPageData(globalThis.__PAGE_DATA__);
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
      
      // 更新 SEO meta 标签（初始加载时，Hybrid 模式）
      // 即使服务端已经渲染了 meta 标签，客户端也需要更新以确保一致性
      if (typeof updateMetaTagsFromPageData === 'function') {
        updateMetaTagsFromPageData(globalThis.__PAGE_DATA__);
      }
      
      // Hybrid 模式：初始化客户端路由导航（SPA 无刷新切换）
      if (typeof initClientSideNavigation === 'function') {
        initClientSideNavigation(render, jsx);
      }
    }
  } catch (error) {
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
  if (renderMode === "csr" || renderMode === "hybrid") {
    // 使用 esbuild 压缩代码
    const [minifiedLinkInterceptor, minifiedClientContent] = await Promise.all([
      minifyJavaScript(linkInterceptorScript),
      minifyJavaScript(clientContent),
    ]);

    // 返回两个脚本：立即执行的链接拦截器 + 模块化的渲染代码
    return `<script>${minifiedLinkInterceptor}</script><script type="module">${minifiedClientContent}</script>`;
  }

  // 使用 esbuild 压缩代码
  const minifiedClientContent = await minifyJavaScript(clientContent);
  return `<script type="module">${minifiedClientContent}</script>`;
}
