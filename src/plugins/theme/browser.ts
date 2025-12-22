/// <reference lib="dom" />
/**
 * 主题切换客户端脚本
 * 在浏览器中运行的主题管理代码
 */

interface ThemeConfig {
  storageKey: string;
  defaultTheme: "light" | "dark" | "auto";
  transition?: boolean;
}

interface ThemeManager {
  storageKey: string;
  defaultTheme: "light" | "dark" | "auto";
  getSystemTheme(): "light" | "dark";
  getTheme(): "light" | "dark" | "auto";
  getActualTheme(): "light" | "dark";
  setTheme(theme: "light" | "dark" | "auto"): void;
  applyTheme(theme: "light" | "dark" | "auto"): void;
  init(): void;
  toggleTheme(): "dark" | "light";
  switchTheme(theme: "light" | "dark" | "auto"): "light" | "dark" | "auto";
}

interface ThemeStore {
  _value: "light" | "dark";
  _listeners: Set<(theme: "light" | "dark") => void>;
  value: "light" | "dark";
  subscribe(listener: (theme: "light" | "dark") => void): () => void;
  unsubscribe(listener: (theme: "light" | "dark") => void): void;
}

/**
 * 创建主题管理器
 */
function createThemeManager(config: ThemeConfig): ThemeManager {
  return {
    storageKey: config.storageKey,
    defaultTheme: config.defaultTheme,

    // 获取系统主题
    getSystemTheme(): "light" | "dark" {
      if (typeof globalThis !== "undefined" && globalThis.matchMedia) {
        return globalThis.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      }
      return "light";
    },

    // 获取当前主题
    getTheme(): "light" | "dark" | "auto" {
      if (typeof globalThis === "undefined") return this.defaultTheme;
      const stored = localStorage.getItem(this.storageKey);
      if (stored === "dark" || stored === "light" || stored === "auto") {
        return stored;
      }
      return this.defaultTheme;
    },

    // 获取实际主题（处理 auto 模式）
    getActualTheme(): "light" | "dark" {
      const theme = this.getTheme();
      if (theme === "auto") {
        return this.getSystemTheme();
      }
      return theme;
    },

    // 设置主题
    setTheme(theme: "light" | "dark" | "auto"): void {
      if (typeof globalThis === "undefined") {
        return;
      }
      localStorage.setItem(this.storageKey, theme);
      this.applyTheme(theme);

      // 触发自定义事件
      const actualTheme = this.getActualTheme();
      globalThis.dispatchEvent(
        new CustomEvent("themechange", {
          detail: { theme, actualTheme },
        }),
      );
    },

    // 应用主题
    applyTheme(theme: "light" | "dark" | "auto"): void {
      if (typeof document === "undefined") {
        return;
      }
      const actualTheme = theme === "auto" ? this.getSystemTheme() : theme;

      // 在 html 元素上设置 class（用于 Tailwind CSS dark mode）
      if (document.documentElement) {
        const htmlElement = document.documentElement;

        // 移除旧的 dark/light class
        htmlElement.classList.remove("dark", "light");
        // 添加新的主题 class
        if (actualTheme === "dark") {
          htmlElement.classList.add("dark");
        } else {
          htmlElement.classList.add("light");
        }
      }

      // 更新主题 store（如果存在）
      if (typeof globalThis !== "undefined" && (globalThis as any).__THEME_STORE__) {
        (globalThis as any).__THEME_STORE__.value = actualTheme;
      }
    },

    // 初始化
    init(): void {
      const theme = this.getTheme();
      this.applyTheme(theme);

      // 监听系统主题变化
      if (typeof globalThis !== "undefined" && globalThis.matchMedia) {
        globalThis
          .matchMedia("(prefers-color-scheme: dark)")
          .addEventListener("change", (_e) => {
            if (this.getTheme() === "auto") {
              this.applyTheme("auto");
              // 触发主题变化事件
              globalThis.dispatchEvent(
                new CustomEvent("themechange", {
                  detail: {
                    theme: "auto",
                    actualTheme: this.getActualTheme(),
                  },
                }),
              );
            }
          });
      }
    },

    // 切换主题（仅在 dark 和 light 之间切换）
    toggleTheme(): "dark" | "light" {
      const current = this.getTheme();
      // 如果当前是 auto，切换到 dark；否则在 dark 和 light 之间切换
      const next = current === "dark" ? "light" : "dark";
      this.setTheme(next);
      return next;
    },

    // 切换到指定主题
    switchTheme(theme: "light" | "dark" | "auto"): "light" | "dark" | "auto" {
      if (theme === "dark" || theme === "light" || theme === "auto") {
        this.setTheme(theme);
        return theme;
      }
      return this.getTheme();
    },
  };
}

/**
 * 创建主题 Store
 */
function createThemeStore(initialValue: "light" | "dark"): ThemeStore {
  return {
    _value: initialValue,
    _listeners: new Set(),

    // 获取当前主题值
    get value(): "light" | "dark" {
      return this._value;
    },

    // 设置主题值并通知所有监听者
    set value(newValue: "light" | "dark") {
      if (this._value !== newValue) {
        this._value = newValue;
        // 通知所有监听者
        this._listeners.forEach((listener) => {
          try {
            listener(newValue);
          } catch (error) {
            console.error("[Theme Store] 监听器执行错误:", error);
          }
        });
      }
    },

    // 订阅主题变化
    subscribe(listener: (theme: "light" | "dark") => void): () => void {
      this._listeners.add(listener);
      // 立即调用一次，传递当前值
      try {
        listener(this._value);
      } catch (error) {
        console.error("[Theme Store] 监听器执行错误:", error);
      }
      // 返回取消订阅函数
      return () => {
        this._listeners.delete(listener);
      };
    },

    // 取消订阅
    unsubscribe(listener: (theme: "light" | "dark") => void): void {
      this._listeners.delete(listener);
    },
  };
}

/**
 * 初始化主题系统
 * 暴露到全局，供内联脚本调用
 */
function initTheme(config: ThemeConfig): void {
  // 创建主题管理器
  const themeManager = createThemeManager(config);
  const themeStore = createThemeStore(themeManager.getActualTheme());

  // 当主题变化时，更新 store 的值
  globalThis.addEventListener("themechange", ((event: CustomEvent) => {
    if (event.detail && event.detail.actualTheme) {
      themeStore.value = event.detail.actualTheme;
    }
  }) as EventListener);

  // 暴露到全局
  (globalThis as any).__THEME_MANAGER__ = themeManager;
  (globalThis as any).__THEME_STORE__ = themeStore;
  (globalThis as any).setTheme = (theme: "light" | "dark" | "auto") => {
    return themeManager.setTheme(theme);
  };
  (globalThis as any).getTheme = () => {
    return themeManager.getTheme();
  };
  (globalThis as any).getActualTheme = () => {
    return themeManager.getActualTheme();
  };
  (globalThis as any).toggleTheme = () => {
    return themeManager.toggleTheme();
  };
  (globalThis as any).switchTheme = (theme: "light" | "dark" | "auto") => {
    return themeManager.switchTheme(theme);
  };

  // 初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      themeManager.init();
      // 初始化 store 的值
      const actualTheme = themeManager.getActualTheme();
      themeStore.value = actualTheme;
    });
  } else {
    themeManager.init();
    // 初始化 store 的值
    const actualTheme = themeManager.getActualTheme();
    themeStore.value = actualTheme;
  }

  // 注意：过渡效果的 style 标签由服务端注入，不需要在客户端创建
}

// 暴露到全局，供内联脚本调用
if (typeof globalThis !== "undefined") {
  (globalThis as any).initTheme = initTheme;
}

