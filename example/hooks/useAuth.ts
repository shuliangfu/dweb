/**
 * 认证相关 Hook
 * 提供登录、登出、用户状态管理等功能
 */

import { useCallback, useEffect, useState } from "preact/hooks";
import { getStoreState, setStoreState } from "@dreamer/dweb/client";

/**
 * 用户信息类型
 */
export interface User {
  /** 用户 ID */
  id: string | number;
  /** 用户名 */
  username: string;
  /** 邮箱 */
  email?: string;
  /** 昵称 */
  nickname?: string;
  /** 头像 URL */
  avatar?: string;
  /** 角色 */
  roles?: string[];
  /** 其他用户信息 */
  [key: string]: any;
}

/**
 * 登录凭据
 */
export interface LoginCredentials {
  /** 用户名或邮箱 */
  username: string;
  /** 密码 */
  password: string;
  /** 记住我 */
  rememberMe?: boolean;
}

/**
 * 注册信息
 */
export interface RegisterData {
  /** 用户名 */
  username: string;
  /** 邮箱 */
  email: string;
  /** 密码 */
  password: string;
  /** 确认密码 */
  confirmPassword?: string;
  /** 其他信息 */
  [key: string]: any;
}

/**
 * useAuth Hook 返回值
 */
export interface UseAuthReturn {
  /** 当前用户信息 */
  user: User | null;
  /** 是否已登录 */
  isAuthenticated: boolean;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 登录函数 */
  login: (credentials: LoginCredentials) => Promise<boolean>;
  /** 登出函数 */
  logout: () => Promise<void>;
  /** 注册函数 */
  register: (data: RegisterData) => Promise<boolean>;
  /** 更新用户信息 */
  updateUser: (user: Partial<User>) => void;
  /** 刷新用户信息 */
  refreshUser: () => Promise<void>;
  /** 检查登录状态 */
  checkAuth: () => Promise<void>;
}

/**
 * 认证相关 Hook
 * @param options 配置选项
 * @returns 认证相关对象
 *
 * @example
 * ```typescript
 * const auth = useAuth({
 *   loginApi: '/api/users/login',
 *   logoutApi: '/api/users/logout',
 *   userApi: '/api/users/me',
 *   registerApi: '/api/users/register',
 * });
 *
 * // 在组件中使用
 * if (auth.isLoading) {
 *   return <div>加载中...</div>;
 * }
 *
 * if (auth.isAuthenticated) {
 *   return <div>欢迎, {auth.user?.username}</div>;
 * }
 *
 * // 登录
 * await auth.login({
 *   username: 'john',
 *   password: 'password123'
 * });
 *
 * // 登出
 * await auth.logout();
 * ```
 */
export function useAuth(options?: {
  /** 登录 API 路径（默认 '/api/users/login'） */
  loginApi?: string;
  /** 登出 API 路径（默认 '/api/users/logout'） */
  logoutApi?: string;
  /** 获取当前用户 API 路径（默认 '/api/users/me'） */
  userApi?: string;
  /** 注册 API 路径（默认 '/api/users/register'） */
  registerApi?: string;
  /** Store 中的用户字段名（默认 'user'） */
  userField?: string;
}): UseAuthReturn {
  const {
    loginApi = "/api/users/login",
    logoutApi = "/api/users/logout",
    userApi = "/api/users/me",
    registerApi = "/api/users/register",
    userField = "user",
  } = options || {};

  // 用户信息
  const [user, setUser] = useState<User | null>(null);

  // 是否正在加载
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 从 Store 获取用户信息
   */
  const getUserFromStore = useCallback((): User | null => {
    try {
      const storeState = getStoreState<Record<string, any>>();
      return storeState?.[userField] || null;
    } catch {
      return null;
    }
  }, [userField]);

  /**
   * 更新 Store 中的用户信息
   */
  const updateUserInStore = useCallback((userData: User | null): void => {
    try {
      setStoreState<Record<string, any>>((prev) => ({
        ...prev,
        [userField]: userData,
      }));
    } catch (error) {
      console.error("[useAuth] 更新 Store 失败:", error);
    }
  }, [userField]);

  /**
   * 检查登录状态
   */
  const checkAuth = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      // 先从 Store 获取
      const storeUser = getUserFromStore();
      if (storeUser) {
        setUser(storeUser);
        setIsLoading(false);
        return;
      }

      // 从 API 获取当前用户
      const response = await fetch(userApi, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.user || result.data) {
          const userData = result.user || result.data;
          setUser(userData);
          updateUserInStore(userData);
        }
      }
    } catch (error) {
      console.error("[useAuth] 检查登录状态失败:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [userApi, getUserFromStore, updateUserInStore]);

  /**
   * 登录
   */
  const login = useCallback(
    async (credentials: LoginCredentials): Promise<boolean> => {
      setIsLoading(true);
      try {
        const response = await fetch(loginApi, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({
            message: "登录失败",
          }));
          throw new Error(error.message || "登录失败");
        }

        const result = await response.json();

        // 获取用户信息
        const userData = result.user || result.data;
        if (userData) {
          setUser(userData);
          updateUserInStore(userData);
          return true;
        }

        return false;
      } catch (error) {
        console.error("[useAuth] 登录失败:", error);
        setUser(null);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [loginApi, updateUserInStore],
  );

  /**
   * 登出
   */
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      // 调用登出 API
      await fetch(logoutApi, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("[useAuth] 登出 API 调用失败:", error);
    } finally {
      // 无论 API 调用是否成功，都清除本地状态
      setUser(null);
      updateUserInStore(null);
      setIsLoading(false);
    }
  }, [logoutApi, updateUserInStore]);

  /**
   * 注册
   */
  const register = useCallback(async (data: RegisterData): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch(registerApi, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: "注册失败",
        }));
        throw new Error(error.message || "注册失败");
      }

      const result = await response.json();

      // 注册成功后，如果有用户信息，自动登录
      const userData = result.user || result.data;
      if (userData) {
        setUser(userData);
        updateUserInStore(userData);
        return true;
      }

      return false;
    } catch (error) {
      console.error("[useAuth] 注册失败:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [registerApi, updateUserInStore]);

  /**
   * 更新用户信息
   */
  const updateUser = useCallback((userData: Partial<User>): void => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      updateUserInStore(updatedUser);
    }
  }, [user, updateUserInStore]);

  /**
   * 刷新用户信息
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    await checkAuth();
  }, [checkAuth]);

  // 初始化时检查登录状态
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 计算是否已登录
  const isAuthenticated = user !== null;

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register,
    updateUser,
    refreshUser,
    checkAuth,
  };
}
