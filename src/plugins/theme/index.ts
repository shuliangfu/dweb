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
  const injectDataAttribute = config.injectDataAttribute !== false;
  const injectBodyClass = config.injectBodyClass !== false;
  const transition = config.transition !== false;

  return `
    <script>
      (function() {
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
            if (typeof window === 'undefined') return;
            localStorage.setItem(this.storageKey, theme);
            this.applyTheme(theme);
            
            // 触发自定义事件
            window.dispatchEvent(new CustomEvent('themechange', { 
              detail: { theme, actualTheme: this.getActualTheme() } 
            }));
          },
          
          // 应用主题
          applyTheme: function(theme) {
            if (typeof document === 'undefined') return;
            const actualTheme = theme === 'auto' ? this.getSystemTheme() : theme;
            ${injectDataAttribute ? `document.documentElement.setAttribute('data-theme', actualTheme);` : ''}
            ${injectBodyClass ? `document.body.className = document.body.className.replace(/\\btheme-\\w+/g, '') + ' theme-' + actualTheme;` : ''}
            // 更新主题 store（如果存在）
            if (typeof window !== 'undefined' && window.__THEME_STORE__) {
              window.__THEME_STORE__.value = actualTheme;
            }
          },
          
          // 初始化
          init: function() {
            const theme = this.getTheme();
            this.applyTheme(theme);
            
            // 监听系统主题变化
            if (typeof window !== 'undefined' && window.matchMedia) {
              window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (this.getTheme() === 'auto') {
                  this.applyTheme('auto');
                  // 触发主题变化事件
                  window.dispatchEvent(new CustomEvent('themechange', { 
                    detail: { theme: 'auto', actualTheme: this.getActualTheme() } 
                  }));
                }
              });
            }
          },
          
          // 切换主题
          toggle: function() {
            const current = this.getTheme();
            const next = current === 'dark' ? 'light' : current === 'light' ? 'auto' : 'dark';
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
          if (event.detail && event.detail.actualTheme) {
            themeStore.value = event.detail.actualTheme;
          }
        });
        
        // 暴露到全局
        window.__THEME_MANAGER__ = ThemeManager;
        window.__THEME_STORE__ = themeStore;
        window.setTheme = function(theme) { ThemeManager.setTheme(theme); };
        window.getTheme = function() { return ThemeManager.getTheme(); };
        window.getActualTheme = function() { return ThemeManager.getActualTheme(); };
        window.toggleTheme = function() { return ThemeManager.toggle(); };
        
        // 初始化
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => {
            ThemeManager.init();
            // 初始化 store 的值
            themeStore.value = ThemeManager.getActualTheme();
          });
        } else {
          ThemeManager.init();
          // 初始化 store 的值
          themeStore.value = ThemeManager.getActualTheme();
        }
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
 * 注入主题属性到 HTML
 */
function injectThemeAttribute(html: string, theme: ThemeMode): string {
  let result = html;
  
  // 获取实际主题（如果是 auto，默认为 light）
  const actualTheme = theme === 'auto' ? 'light' : theme;
  
  // 注入 data-theme 属性
  if (result.includes('<html')) {
    if (result.match(/<html[^>]*data-theme=["'][^"']*["']/)) {
      result = result.replace(
        /<html([^>]*?)data-theme=["'][^"']*["']/,
        `<html$1data-theme="${actualTheme}"`
      );
    } else {
      result = result.replace(
        /<html([^>]*?)>/,
        `<html$1 data-theme="${actualTheme}">`
      );
    }
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
      // 只处理 HTML 响应
      if (!res.body || typeof res.body !== 'string') {
        return;
      }

      const contentType = res.headers.get('Content-Type') || '';
      if (!contentType.includes('text/html')) {
        return;
      }

      if (options.injectScript !== false) {
        try {
          const html = res.body as string;
          
          // 注入主题属性
          let newHtml = injectThemeAttribute(html, defaultTheme);
          
          // 注入主题脚本（在 </head> 之前）
          if (newHtml.includes('</head>')) {
            const script = generateThemeScript(options);
            newHtml = newHtml.replace('</head>', `${script}\n</head>`);
          }
          
          res.body = newHtml;
        } catch (error) {
          console.error('[Theme Plugin] 注入主题脚本时出错:', error);
        }
      }
    },
  };
}

// 导出类型
export type { ThemePluginOptions, ThemeConfig, ThemeMode } from './types.ts';

