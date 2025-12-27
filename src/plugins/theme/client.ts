/**
 * 主题客户端访问模块
 * 提供类型安全的主题访问接口
 */

import type { ThemeMode } from "./types.ts";
import { themeStore } from "./store.ts";
import type { StoreInstance } from "../../plugins/store/define-store.ts";
import type { ThemeStoreState } from "./store.ts";
import { useThemeStore } from "./store.ts";

/**
 * 主题管理器接口
 */
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

/**
 * 获取主题管理器实例
 * @returns 主题管理器实例，如果不在客户端环境则返回 null
 */
export function getThemeManager(): ThemeManager | null {
  if (typeof globalThis === "undefined" || !globalThis.window) {
    return null;
  }

  const win = globalThis.window as Window & {
    __THEME_MANAGER__?: ThemeManager;
  };

  return win.__THEME_MANAGER__ || null;
}

/**
 * 获取主题 Store 实例
 * @returns 主题 Store 实例，如果不在客户端环境则返回 null
 */
export function getThemeStore():
  | (StoreInstance<ThemeStoreState> & ThemeStoreState)
  | null {
  if (typeof globalThis === "undefined" || !globalThis.window) {
    return null;
  }

  // 返回使用 defineStore 定义的 themeStore
  return themeStore;
}

/**
 * 获取当前主题
 * @returns 当前主题（'light' | 'dark' | 'auto'），如果不在客户端环境则返回 null
 */
export function getTheme(): ThemeMode | null {
  if (typeof globalThis === "undefined" || !globalThis.window) {
    return null;
  }

  const win = globalThis.window as Window & {
    getTheme?: () => ThemeMode;
  };

  if (win.getTheme && typeof win.getTheme === "function") {
    return win.getTheme();
  }

  return null;
}

/**
 * 获取实际主题（处理 auto 模式）
 * @returns 实际主题（'light' | 'dark'），如果不在客户端环境则返回 null
 */
export function getActualTheme(): "light" | "dark" | null {
  if (typeof globalThis === "undefined" || !globalThis.window) {
    return null;
  }

  const win = globalThis.window as Window & {
    getActualTheme?: () => "light" | "dark";
  };

  if (win.getActualTheme && typeof win.getActualTheme === "function") {
    return win.getActualTheme();
  }

  return null;
}

/**
 * 设置主题
 * @param theme 主题模式（'light' | 'dark' | 'auto'）
 */
export function setTheme(theme: ThemeMode): void {
  if (typeof globalThis === "undefined" || !globalThis.window) {
    console.warn(
      "[Theme Client] 无法设置主题：不在客户端环境或主题系统未初始化",
    );
    return;
  }

  const win = globalThis.window as Window & {
    setTheme?: (theme: ThemeMode) => void;
  };

  if (win.setTheme && typeof win.setTheme === "function") {
    win.setTheme(theme);
    useThemeStore().setValue(theme as "light" | "dark");
  } else {
    console.warn("[Theme Client] 无法设置主题：主题系统未初始化");
  }
}

/**
 * 切换主题（在 dark 和 light 之间切换）
 * @returns 切换后的主题（'dark' | 'light'），如果不在客户端环境则返回 null
 */
export function toggleTheme(): "dark" | "light" | null {
  if (typeof globalThis === "undefined" || !globalThis.window) {
    console.warn(
      "[Theme Client] 无法切换主题：不在客户端环境或主题系统未初始化",
    );
    return null;
  }

  const win = globalThis.window as Window & {
    toggleTheme?: () => "dark" | "light";
  };

  if (win.toggleTheme && typeof win.toggleTheme === "function") {
    return win.toggleTheme();
  }

  console.warn("[Theme Client] 无法切换主题：主题系统未初始化");
  return null;
}

/**
 * 切换到指定主题
 * @param theme 主题模式（'light' | 'dark' | 'auto'）
 * @returns 切换后的主题，如果不在客户端环境则返回 null
 */
export function switchTheme(theme: ThemeMode): ThemeMode | null {
  if (typeof globalThis === "undefined" || !globalThis.window) {
    console.warn(
      "[Theme Client] 无法切换主题：不在客户端环境或主题系统未初始化",
    );
    return null;
  }

  const win = globalThis.window as Window & {
    switchTheme?: (theme: ThemeMode) => ThemeMode;
  };

  if (win.switchTheme && typeof win.switchTheme === "function") {
    return win.switchTheme(theme);
  }

  console.warn("[Theme Client] 无法切换主题：主题系统未初始化");
  return null;
}

/**
 * 订阅主题变化
 * @param listener 主题变化监听器（接收实际主题 'light' | 'dark'）
 * @returns 取消订阅函数，如果不在客户端环境或主题 Store 未初始化则返回 null
 */
export function subscribeTheme(
  listener: (theme: "light" | "dark") => void,
): (() => void) | null {
  if (typeof globalThis === "undefined" || !globalThis.window) {
    console.warn("[Theme Client] 无法订阅主题变化：不在客户端环境");
    return null;
  }

  const store = getThemeStore();
  if (!store) {
    console.warn("[Theme Client] 无法订阅主题变化：主题 Store 未初始化");
    return null;
  }

  // 使用 store 的 $subscribe 方法
  return store.$subscribe((state) => {
    if (state && typeof state === "object" && "value" in state) {
      const themeValue = state.value as "light" | "dark";
      listener(themeValue);
    }
  });
}

/**
 * 获取当前主题值（从 Store 中获取）
 * @returns 当前主题值（'light' | 'dark'），如果不在客户端环境则返回 null
 */
export function getThemeValue(): "light" | "dark" | null {
  if (typeof globalThis === "undefined" || !globalThis.window) {
    return null;
  }

  const store = getThemeStore();
  if (!store) {
    return null;
  }

  // 从 store 中获取 value 属性
  return store.value;
}

/**
 * 获取当前主题模式（从 Store 中获取）
 * @returns 当前主题模式（'light' | 'dark' | 'auto'），如果不在客户端环境则返回 null
 */
export function getThemeMode(): ThemeMode | null {
  if (typeof globalThis === "undefined" || !globalThis.window) {
    return null;
  }

  const store = getThemeStore();
  if (!store) {
    return null;
  }

  // 从 store 中获取 mode 属性
  return store.mode;
}
