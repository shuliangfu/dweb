/**
 * 主题切换插件
 * 支持深色/浅色主题切换，自动检测系统主题
 */

import type { Plugin, Request, Response } from "../../types/index.ts";
import type { ThemeMode, ThemePluginOptions } from "./types.ts";
import { minifyJavaScript } from "../../utils/minify.ts";

/**
 * 生成主题切换脚本
 */
function generateThemeScript(options: ThemePluginOptions): string {
  const config = options.config || {};
  const storageKey = config.storageKey || "theme";
  const defaultTheme = config.defaultTheme || "auto";
  const transition = config.transition !== false;

  return `
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
            if (typeof window === 'undefined') {
              return;
            }
            localStorage.setItem(this.storageKey, theme);
            this.applyTheme(theme);
            
            // 触发自定义事件
            const actualTheme = this.getActualTheme();
            window.dispatchEvent(new CustomEvent('themechange', { 
              detail: { theme, actualTheme } 
            }));
          },
          
          // 应用主题
          applyTheme: function(theme) {
            if (typeof document === 'undefined') {
              return;
            }
            const actualTheme = theme === 'auto' ? this.getSystemTheme() : theme;
            
            // 在 html 元素上设置 class（用于 Tailwind CSS dark mode）
            if (document.documentElement) {
              const htmlElement = document.documentElement;
              
              // 移除旧的 dark/light class
              htmlElement.classList.remove('dark', 'light');
              // 添加新的主题 class
              if (actualTheme === 'dark') {
                htmlElement.classList.add('dark');
              } else {
                htmlElement.classList.add('light');
              }
            }
            
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
          
          // 切换主题（仅在 dark 和 light 之间切换）
          toggleTheme: function() {
            const current = this.getTheme();
            // 如果当前是 auto，切换到 dark；否则在 dark 和 light 之间切换
            const next = current === 'dark' ? 'light' : 'dark';
            this.setTheme(next);
            return next;
          },
          
          // 切换到指定主题
          switchTheme: function(theme) {
            if (theme === 'dark' || theme === 'light' || theme === 'auto') {
              this.setTheme(theme);
              return theme;
            }
            return this.getTheme();
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
        window.setTheme = function(theme) { 
          return ThemeManager.setTheme(theme); 
        };
        window.getTheme = function() { 
          return ThemeManager.getTheme();
        };
        window.getActualTheme = function() { 
          return ThemeManager.getActualTheme();
        };
        window.toggleTheme = function() { 
          return ThemeManager.toggleTheme();
        };
        window.switchTheme = function(theme) { 
          return ThemeManager.switchTheme(theme); 
        };
        
        // 初始化
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => {
            ThemeManager.init();
            // 初始化 store 的值
            const actualTheme = ThemeManager.getActualTheme();
            themeStore.value = actualTheme;
          });
        } else {
          ThemeManager.init();
          // 初始化 store 的值
          const actualTheme = ThemeManager.getActualTheme();
          themeStore.value = actualTheme;
        }
      })();
    ${
    transition
      ? `<style>
      * {
        transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
      }
    </style>`
      : ""
  }
  `;
}

/**
 * 注入主题 class 到 HTML
 * 使用 Tailwind CSS 的 dark mode 方式：在 html 元素上添加 dark/light class
 */
function injectThemeAttribute(html: string, theme: ThemeMode): string {
  let result = html;

  // 获取实际主题（如果是 auto，需要检测系统主题，但服务端无法检测，默认使用 light）
  const actualTheme = theme === "auto" ? "light" : theme;
  const themeClass = actualTheme === "dark" ? "dark" : "light";

  // 在 html 元素上注入 class（用于 Tailwind CSS dark mode）
  if (result.includes("<html")) {
    // 先移除旧的 dark/light class 和 data-theme 属性
    result = result.replace(/<html([^>]*?)>/i, (_match, attrs) => {
      // 移除 data-theme 属性
      let newAttrs = attrs.replace(/\s+data-theme=["'][^"']*["']/gi, "");

      // 处理 class 属性
      const classMatch = newAttrs.match(/\s+class=["']([^"']*?)["']/i);
      if (classMatch) {
        // 移除旧的 dark/light class，保留其他 class
        const existingClasses = classMatch[1]
          .split(/\s+/)
          .filter((c: string) => c && c !== "dark" && c !== "light")
          .join(" ")
          .trim();
        const finalClasses = existingClasses
          ? `${existingClasses} ${themeClass}`
          : themeClass;
        // 替换 class 属性
        newAttrs = newAttrs.replace(
          /\s+class=["'][^"']*["']/i,
          ` class="${finalClasses}"`,
        );
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
  const defaultTheme = config.defaultTheme || "auto";

  return {
    name: "theme",
    config: options as unknown as Record<string, unknown>,

    /**
     * 响应处理钩子 - 注入主题脚本和属性
     * 注意：使用 onResponse 而不是 onRequest，因为 res.body 在 onRequest 时可能还未设置
     */
    onResponse: async (_req: Request, res: Response) => {
      // 只处理 HTML 响应
      if (!res.body || typeof res.body !== "string") {
        return;
      }

      const contentType = res.headers.get("Content-Type") || "";
      if (!contentType.includes("text/html")) {
        return;
      }

      if (options.injectScript !== false) {
        try {
          const html = res.body as string;

          // 注入主题属性
          let newHtml = injectThemeAttribute(html, defaultTheme);

          // 注入主题脚本（在 </head> 之前）
          if (newHtml.includes("</head>")) {
            const scriptContent = generateThemeScript(options);
            // 分离 JavaScript 代码和 style 标签
            const content = scriptContent.trim();
            const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
            let jsCode = content;
            const styleTag = styleMatch ? styleMatch[0] : "";

            // 如果有 style 标签，从内容中移除
            if (styleMatch) {
              jsCode = content.replace(styleMatch[0], "").trim();
            }

            // 压缩 JavaScript 代码
            const minifiedCode = await minifyJavaScript(jsCode);
            // 组合 script 和 style 标签
            const minifiedScript =
              `<script>${minifiedCode}</script>${styleTag}`;
            // 使用 lastIndexOf 确保找到最后一个 </head>，避免与其他注入冲突
            const lastHeadIndex = newHtml.lastIndexOf("</head>");
            if (lastHeadIndex !== -1) {
              newHtml = newHtml.slice(0, lastHeadIndex) +
                `${minifiedScript}\n` +
                newHtml.slice(lastHeadIndex);
            } else {
              // 如果没有找到 </head>，尝试在 <head> 后插入
              if (newHtml.includes("<head>")) {
                newHtml = newHtml.replace(
                  "<head>",
                  `<head>\n${minifiedScript}`,
                );
              }
            }
          }

          res.body = newHtml;
        } catch (error) {
          console.error("[Theme Plugin] 注入主题脚本时出错:", error);
          if (error instanceof Error) {
            console.error("[Theme Plugin] 错误堆栈:", error.stack);
          }
        }
      }
    },
  };
}

// 导出类型
export type { ThemeConfig, ThemeMode, ThemePluginOptions } from "./types.ts";
