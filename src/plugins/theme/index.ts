/**
 * 主题切换插件
 * 支持深色/浅色主题切换，自动检测系统主题
 */

import type { Plugin, Request, Response } from '../../types/index.ts';
import type { ThemePluginOptions, ThemeMode } from './types.ts';

/**
 * 生成主题切换脚本
 */
function generateThemeScript(options: ThemePluginOptions): string {
  const config = options.config || {};
  const storageKey = config.storageKey || 'theme';
  const defaultTheme = config.defaultTheme || 'auto';
  const transition = config.transition !== false;

  return `
    <script>
      (function() {
        console.log('[Theme Plugin] 开始初始化主题管理器');
        // 主题管理
        const ThemeManager = {
          storageKey: ${JSON.stringify(storageKey)},
          defaultTheme: ${JSON.stringify(defaultTheme)},
          
          // 获取系统主题
          getSystemTheme: function() {
            if (typeof window !== 'undefined' && window.matchMedia) {
              return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            return 'light';
          },
          
          // 获取当前主题
          getTheme: function() {
            if (typeof window === 'undefined') return this.defaultTheme;
            const stored = localStorage.getItem(this.storageKey);
            if (stored) return stored;
            return this.defaultTheme;
          },
          
          // 获取实际主题（处理 auto 模式）
          getActualTheme: function() {
            const theme = this.getTheme();
            if (theme === 'auto') {
              return this.getSystemTheme();
            }
            return theme;
          },
          
          // 设置主题
          setTheme: function(theme) {
            console.log('[Theme Plugin] setTheme 被调用，主题:', theme);
            if (typeof window === 'undefined') {
              console.warn('[Theme Plugin] window 未定义，无法设置主题');
              return;
            }
            localStorage.setItem(this.storageKey, theme);
            console.log('[Theme Plugin] 主题已保存到 localStorage:', this.storageKey, '=', theme);
            this.applyTheme(theme);
            
            // 触发自定义事件
            const actualTheme = this.getActualTheme();
            console.log('[Theme Plugin] 触发 themechange 事件，主题:', theme, '实际主题:', actualTheme);
            window.dispatchEvent(new CustomEvent('themechange', { 
              detail: { theme, actualTheme } 
            }));
          },
          
          // 应用主题
          applyTheme: function(theme) {
            console.log('[Theme Plugin] applyTheme 被调用，主题:', theme);
            if (typeof document === 'undefined') {
              console.warn('[Theme Plugin] document 未定义，无法应用主题');
              return;
            }
            const actualTheme = theme === 'auto' ? this.getSystemTheme() : theme;
            console.log('[Theme Plugin] 实际主题:', actualTheme);
            
            // 在 html 元素上设置 class（用于 Tailwind CSS dark mode）
            if (document.documentElement) {
              // 移除旧的 dark/light class
              document.documentElement.classList.remove('dark', 'light');
              // 添加新的主题 class
              if (actualTheme === 'dark') {
                document.documentElement.classList.add('dark');
                console.log('[Theme Plugin] 已添加 dark class 到 html 元素');
              } else {
                document.documentElement.classList.add('light');
                console.log('[Theme Plugin] 已添加 light class 到 html 元素');
              }
            }
            
            // 更新主题 store（如果存在）
            if (typeof window !== 'undefined' && window.__THEME_STORE__) {
              window.__THEME_STORE__.value = actualTheme;
              console.log('[Theme Plugin] 已更新 __THEME_STORE__.value:', actualTheme);
            } else {
              console.warn('[Theme Plugin] __THEME_STORE__ 不存在，无法更新');
            }
          },
          
          // 初始化
          init: function() {
            console.log('[Theme Plugin] ThemeManager.init() 被调用');
            const theme = this.getTheme();
            console.log('[Theme Plugin] 从 localStorage 获取的主题:', theme);
            this.applyTheme(theme);
            
            // 监听系统主题变化
            if (typeof window !== 'undefined' && window.matchMedia) {
              console.log('[Theme Plugin] 注册系统主题变化监听器');
              window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                console.log('[Theme Plugin] 系统主题变化，当前主题模式:', this.getTheme());
                if (this.getTheme() === 'auto') {
                  this.applyTheme('auto');
                  // 触发主题变化事件
                  window.dispatchEvent(new CustomEvent('themechange', { 
                    detail: { theme: 'auto', actualTheme: this.getActualTheme() } 
                  }));
                }
              });
            } else {
              console.warn('[Theme Plugin] window.matchMedia 不可用，无法监听系统主题变化');
            }
          },
          
          // 切换主题
          toggle: function() {
            const current = this.getTheme();
            console.log('[Theme Plugin] toggle() 被调用，当前主题:', current);
            const next = current === 'dark' ? 'light' : current === 'light' ? 'auto' : 'dark';
            console.log('[Theme Plugin] 切换到主题:', next);
            this.setTheme(next);
            return next;
          }
        };
        
        // 响应式主题 Store（使用 Proxy 实现）
        const themeStore = {
          _value: ThemeManager.getActualTheme(),
          _listeners: new Set(),
          
          // 获取当前主题值
          get value() {
            return this._value;
          },
          
          // 设置主题值并通知所有监听者
          set value(newValue) {
            if (this._value !== newValue) {
              this._value = newValue;
              // 通知所有监听者
              this._listeners.forEach(listener => {
                try {
                  listener(newValue);
                } catch (error) {
                  console.error('[Theme Store] 监听器执行错误:', error);
                }
              });
            }
          },
          
          // 订阅主题变化
          subscribe: function(listener) {
            this._listeners.add(listener);
            // 立即调用一次，传递当前值
            try {
              listener(this._value);
            } catch (error) {
              console.error('[Theme Store] 监听器执行错误:', error);
            }
            // 返回取消订阅函数
            return () => {
              this._listeners.delete(listener);
            };
          },
          
          // 取消订阅
          unsubscribe: function(listener) {
            this._listeners.delete(listener);
          }
        };
        
        // 当主题变化时，更新 store 的值
        window.addEventListener('themechange', (event) => {
          console.log('[Theme Plugin] 收到 themechange 事件:', event.detail);
          if (event.detail && event.detail.actualTheme) {
            themeStore.value = event.detail.actualTheme;
            console.log('[Theme Plugin] themeStore.value 已更新为:', event.detail.actualTheme);
          }
        });
        
        // 暴露到全局
        console.log('[Theme Plugin] 开始暴露全局函数和对象');
        window.__THEME_MANAGER__ = ThemeManager;
        window.__THEME_STORE__ = themeStore;
        window.setTheme = function(theme) { 
          console.log('[Theme Plugin] window.setTheme 被调用，主题:', theme);
          return ThemeManager.setTheme(theme); 
        };
        window.getTheme = function() { 
          const theme = ThemeManager.getTheme();
          console.log('[Theme Plugin] window.getTheme 被调用，返回:', theme);
          return theme;
        };
        window.getActualTheme = function() { 
          const theme = ThemeManager.getActualTheme();
          console.log('[Theme Plugin] window.getActualTheme 被调用，返回:', theme);
          return theme;
        };
        window.toggleTheme = function() { 
          console.log('[Theme Plugin] window.toggleTheme 被调用');
          return ThemeManager.toggle(); 
        };
        console.log('[Theme Plugin] 全局函数和对象已暴露');
        console.log('[Theme Plugin] window.toggleTheme:', typeof window.toggleTheme);
        console.log('[Theme Plugin] window.__THEME_MANAGER__:', typeof window.__THEME_MANAGER__);
        console.log('[Theme Plugin] window.__THEME_STORE__:', typeof window.__THEME_STORE__);
        
        // 初始化
        console.log('[Theme Plugin] 检查 document.readyState:', document.readyState);
        if (document.readyState === 'loading') {
          console.log('[Theme Plugin] 文档正在加载，等待 DOMContentLoaded 事件');
          document.addEventListener('DOMContentLoaded', () => {
            console.log('[Theme Plugin] DOMContentLoaded 事件触发，开始初始化');
            ThemeManager.init();
            // 初始化 store 的值
            const actualTheme = ThemeManager.getActualTheme();
            themeStore.value = actualTheme;
            console.log('[Theme Plugin] 初始化完成，当前主题:', actualTheme);
          });
        } else {
          console.log('[Theme Plugin] 文档已加载，立即初始化');
          ThemeManager.init();
          // 初始化 store 的值
          const actualTheme = ThemeManager.getActualTheme();
          themeStore.value = actualTheme;
          console.log('[Theme Plugin] 初始化完成，当前主题:', actualTheme);
        }
        console.log('[Theme Plugin] 主题管理器脚本执行完成');
      })();
    </script>
    ${transition ? `<style>
      * {
        transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
      }
    </style>` : ''}
  `;
}

/**
 * 注入主题 class 到 HTML
 * 使用 Tailwind CSS 的 dark mode 方式：在 html 元素上添加 dark/light class
 */
function injectThemeAttribute(html: string, theme: ThemeMode): string {
  let result = html;
  
  // 获取实际主题（如果是 auto，需要检测系统主题，但服务端无法检测，默认使用 light）
  const actualTheme = theme === 'auto' ? 'light' : theme;
  const themeClass = actualTheme === 'dark' ? 'dark' : 'light';
  
  // 在 html 元素上注入 class（用于 Tailwind CSS dark mode）
  if (result.includes('<html')) {
    // 先移除旧的 dark/light class 和 data-theme 属性
    result = result.replace(/<html([^>]*?)>/i, (match, attrs) => {
      // 移除 data-theme 属性
      let newAttrs = attrs.replace(/\s+data-theme=["'][^"']*["']/gi, '');
      
      // 处理 class 属性
      const classMatch = newAttrs.match(/\s+class=["']([^"']*?)["']/i);
      if (classMatch) {
        // 移除旧的 dark/light class，保留其他 class
        const existingClasses = classMatch[1]
          .split(/\s+/)
          .filter((c: string) => c && c !== 'dark' && c !== 'light')
          .join(' ')
          .trim();
        const finalClasses = existingClasses ? `${existingClasses} ${themeClass}` : themeClass;
        // 替换 class 属性
        newAttrs = newAttrs.replace(/\s+class=["'][^"']*["']/i, ` class="${finalClasses}"`);
      } else {
        // 如果没有 class 属性，添加一个
        newAttrs = `${newAttrs} class="${themeClass}"`;
      }
      
      return `<html${newAttrs}>`;
    });
  }
  
  return result;
}

/**
 * 创建主题切换插件
 */
export function theme(options: ThemePluginOptions = {}): Plugin {
  const config = options.config || {};
  const defaultTheme = config.defaultTheme || 'auto';

  return {
    name: 'theme',
    config: options as unknown as Record<string, unknown>,

    /**
     * 响应处理钩子 - 注入主题脚本和属性
     * 注意：使用 onResponse 而不是 onRequest，因为 res.body 在 onRequest 时可能还未设置
     */
    onResponse(_req: Request, res: Response) {
      console.log('[Theme Plugin] onResponse 钩子被调用');
      // 只处理 HTML 响应
      if (!res.body || typeof res.body !== 'string') {
        console.log('[Theme Plugin] res.body 不存在或不是字符串，跳过处理');
        return;
      }

      const contentType = res.headers.get('Content-Type') || '';
      console.log('[Theme Plugin] Content-Type:', contentType);
      if (!contentType.includes('text/html')) {
        console.log('[Theme Plugin] 不是 HTML 响应，跳过处理');
        return;
      }

      if (options.injectScript !== false) {
        try {
          const html = res.body as string;
          console.log('[Theme Plugin] 开始注入主题脚本，HTML 长度:', html.length);
          
          // 注入主题属性
          let newHtml = injectThemeAttribute(html, defaultTheme);
          console.log('[Theme Plugin] 主题属性已注入，默认主题:', defaultTheme);
          
          // 注入主题脚本（在 </head> 之前）
          if (newHtml.includes('</head>')) {
            console.log('[Theme Plugin] 找到 </head> 标签，开始注入脚本');
            const script = generateThemeScript(options);
            console.log('[Theme Plugin] 主题脚本已生成，长度:', script.length);
            newHtml = newHtml.replace('</head>', `${script}\n</head>`);
            console.log('[Theme Plugin] 脚本已注入到 HTML');
          } else {
            console.warn('[Theme Plugin] 未找到 </head> 标签，无法注入脚本');
          }
          
          res.body = newHtml;
          console.log('[Theme Plugin] 主题脚本注入完成');
        } catch (error) {
          console.error('[Theme Plugin] 注入主题脚本时出错:', error);
          if (error instanceof Error) {
            console.error('[Theme Plugin] 错误堆栈:', error.stack);
          }
        }
      } else {
        console.log('[Theme Plugin] injectScript 被禁用，跳过脚本注入');
      }
    },
  };
}

// 导出类型
export type { ThemePluginOptions, ThemeConfig, ThemeMode } from './types.ts';

