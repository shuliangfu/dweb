/**
 * 用户信息管理 Hook
 * 提供用户信息的获取、更新、刷新等功能
 */

import { useState, useEffect, useCallback } from 'preact/hooks';
import { getStoreState, setStoreState } from '@dreamer/dweb/client';

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
  /** 状态 */
  status?: string;
  /** 手机号 */
  phone?: string;
  /** 年龄 */
  age?: number;
  /** 创建时间 */
  createdAt?: string | Date;
  /** 更新时间 */
  updatedAt?: string | Date;
  /** 最后登录时间 */
  lastLoginAt?: string | Date;
  /** 其他用户信息 */
  [key: string]: unknown;
}

/**
 * useUser Hook 返回值
 */
export interface UseUserReturn {
  /** 当前用户信息 */
  user: User | null;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 获取用户信息 */
  fetchUser: (userId?: string | number) => Promise<User | null>;
  /** 更新用户信息 */
  updateUser: (userId: string | number, data: Partial<User>) => Promise<User | null>;
  /** 刷新当前用户信息 */
  refreshUser: () => Promise<User | null>;
  /** 清除用户信息 */
  clearUser: () => void;
  /** 设置用户信息（本地更新，不调用 API） */
  setUser: (user: User | null) => void;
}

/**
 * 用户信息管理 Hook
 * @param options 配置选项
 * @returns 用户信息管理对象
 * 
 * @example
 * ```typescript
 * // 获取当前用户信息
 * const { user, isLoading, refreshUser } = useUser({
 *   userApi: '/api/users/me',
 *   updateApi: '/api/users/update',
 *   autoFetch: true, // 自动获取当前用户
 * });
 * 
 * // 获取指定用户信息
 * const { user, fetchUser } = useUser();
 * useEffect(() => {
 *   fetchUser('123');
 * }, []);
 * 
 * // 更新用户信息
 * const { updateUser } = useUser();
 * await updateUser('123', { nickname: '新昵称' });
 * 
 * // 在组件中使用
 * if (isLoading) return <div>加载中...</div>;
 * if (error) return <div>错误: {error.message}</div>;
 * if (user) {
 *   return <div>欢迎, {user.username}</div>;
 * }
 * ```
 */
export function useUser(options?: {
  /** 获取用户信息 API 路径（默认 '/api/users/me'） */
  userApi?: string;
  /** 更新用户信息 API 路径（默认 '/api/users/update'） */
  updateApi?: string;
  /** 是否自动获取当前用户（默认 false） */
  autoFetch?: boolean;
  /** 当前用户 ID（用于自动获取，如果不提供则从 Store 或 API 获取） */
  userId?: string | number | null;
  /** Store 中的用户字段名（默认 'user'） */
  userField?: string;
}): UseUserReturn {
  const {
    userApi = '/api/users/me',
    updateApi = '/api/users/update',
    autoFetch = false,
    userId: initialUserId = null,
    userField = 'user',
  } = options || {};

  // 用户信息
  const [user, setUserState] = useState<User | null>(null);
  
  // 是否正在加载
  const [isLoading, setIsLoading] = useState(false);
  
  // 错误信息
  const [error, setError] = useState<Error | null>(null);

  /**
   * 从 Store 获取用户信息
   */
  const getUserFromStore = useCallback((): User | null => {
    try {
      const storeState = getStoreState<Record<string, unknown>>();
      const storeUser = storeState?.[userField];
      return (storeUser as User) || null;
    } catch {
      return null;
    }
  }, [userField]);

  /**
   * 更新 Store 中的用户信息
   */
  const updateUserInStore = useCallback((userData: User | null): void => {
    try {
      setStoreState<Record<string, unknown>>((prev) => ({
        ...prev,
        [userField]: userData,
      }));
    } catch (err) {
      console.error('[useUser] 更新 Store 失败:', err);
    }
  }, [userField]);

  /**
   * 获取用户信息
   */
  const fetchUser = useCallback(async (targetUserId?: string | number): Promise<User | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // 如果指定了用户 ID，获取指定用户信息
      if (targetUserId) {
        const response = await fetch(`/api/users/get-user?id=${targetUserId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`获取用户信息失败: ${response.status}`);
        }

        const result = await response.json();
        const userData = result.user || result.data || result;
        
        if (userData) {
          setUserState(userData);
          return userData as User;
        }

        return null;
      }

      // 否则获取当前用户信息
      // 先从 Store 获取
      const storeUser = getUserFromStore();
      if (storeUser && !targetUserId) {
        setUserState(storeUser);
        setIsLoading(false);
        return storeUser;
      }

      // 从 API 获取
      const response = await fetch(userApi, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`获取用户信息失败: ${response.status}`);
      }

      const result = await response.json();
      const userData = result.user || result.data || result;
      
      if (userData) {
        setUserState(userData);
        updateUserInStore(userData);
        return userData as User;
      }

      return null;
    } catch (err) {
      const apiError = err instanceof Error ? err : new Error(String(err));
      setError(apiError);
      console.error('[useUser] 获取用户信息失败:', apiError);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userApi, getUserFromStore, updateUserInStore]);

  /**
   * 更新用户信息
   */
  const updateUser = useCallback(async (
    targetUserId: string | number,
    data: Partial<User>,
  ): Promise<User | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(updateApi, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: targetUserId,
          ...data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '更新失败' }));
        throw new Error(errorData.message || `更新用户信息失败: ${response.status}`);
      }

      const result = await response.json();
      const updatedUser = result.user || result.data || result;
      
      if (updatedUser) {
        // 如果是当前用户，更新状态
        if (user && (user.id === targetUserId || user.id === String(targetUserId))) {
          setUserState(updatedUser);
          updateUserInStore(updatedUser);
        }
        
        return updatedUser as User;
      }

      return null;
    } catch (err) {
      const apiError = err instanceof Error ? err : new Error(String(err));
      setError(apiError);
      console.error('[useUser] 更新用户信息失败:', apiError);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [updateApi, user, updateUserInStore]);

  /**
   * 刷新当前用户信息
   */
  const refreshUser = useCallback(async (): Promise<User | null> => {
    return await fetchUser();
  }, [fetchUser]);

  /**
   * 清除用户信息
   */
  const clearUser = useCallback((): void => {
    setUserState(null);
    updateUserInStore(null);
    setError(null);
  }, [updateUserInStore]);

  /**
   * 设置用户信息（本地更新，不调用 API）
   */
  const setUser = useCallback((userData: User | null): void => {
    setUserState(userData);
    updateUserInStore(userData);
  }, [updateUserInStore]);

  // 自动获取用户信息
  useEffect(() => {
    if (autoFetch) {
      if (initialUserId) {
        fetchUser(initialUserId);
      } else {
        fetchUser();
      }
    }
  }, [autoFetch, initialUserId, fetchUser]);

  // 初始化时尝试从 Store 获取用户信息
  useEffect(() => {
    if (!user && !isLoading) {
      const storeUser = getUserFromStore();
      if (storeUser) {
        setUserState(storeUser);
      }
    }
  }, [user, isLoading, getUserFromStore]);

  return {
    user,
    isLoading,
    error,
    fetchUser,
    updateUser,
    refreshUser,
    clearUser,
    setUser,
  };
}

