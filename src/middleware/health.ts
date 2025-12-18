/**
 * 健康检查中间件
 * 提供健康检查端点
 */

import type { Middleware } from '../types/index.ts';

/**
 * 健康检查选项
 */
export interface HealthOptions {
  /**
   * 健康检查路径（默认 '/health'）
   */
  path?: string;
  
  /**
   * 就绪检查路径（默认 '/health/ready'）
   */
  readyPath?: string;
  
  /**
   * 存活检查路径（默认 '/health/live'）
   */
  livePath?: string;
  
  /**
   * 自定义健康检查函数
   */
  healthCheck?: () => Promise<{ status: 'ok' | 'error'; message?: string; details?: Record<string, unknown> }>;
  
  /**
   * 自定义就绪检查函数
   */
  readyCheck?: () => Promise<{ status: 'ready' | 'not-ready'; message?: string; details?: Record<string, unknown> }>;
  
  /**
   * 自定义存活检查函数
   */
  liveCheck?: () => Promise<{ status: 'alive' | 'dead'; message?: string; details?: Record<string, unknown> }>;
}

/**
 * 默认健康检查函数
 */
async function defaultHealthCheck(): Promise<{ status: 'ok' | 'error'; message?: string; details?: Record<string, unknown> }> {
  return {
    status: 'ok',
    message: 'Service is healthy',
    details: {
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * 默认就绪检查函数
 */
async function defaultReadyCheck(): Promise<{ status: 'ready' | 'not-ready'; message?: string; details?: Record<string, unknown> }> {
  return {
    status: 'ready',
    message: 'Service is ready',
    details: {
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * 默认存活检查函数
 */
async function defaultLiveCheck(): Promise<{ status: 'alive' | 'dead'; message?: string; details?: Record<string, unknown> }> {
  return {
    status: 'alive',
    message: 'Service is alive',
    details: {
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * 创建健康检查中间件
 * @param options 健康检查选项
 * @returns 中间件函数
 */
export function health(options: HealthOptions = {}): Middleware {
  const {
    path = '/health',
    readyPath = '/health/ready',
    livePath = '/health/live',
    healthCheck = defaultHealthCheck,
    readyCheck = defaultReadyCheck,
    liveCheck = defaultLiveCheck,
  } = options;
  
  return async (req, res, next) => {
    const url = new URL(req.url);
    const requestPath = url.pathname;
    
    // 处理健康检查端点
    if (requestPath === path) {
      try {
        const result = await healthCheck();
        if (result.status === 'ok') {
          res.status = 200;
          res.json({
            status: 'ok',
            message: result.message || 'Service is healthy',
            ...result.details,
          });
        } else {
          res.status = 503;
          res.json({
            status: 'error',
            message: result.message || 'Service is unhealthy',
            ...result.details,
          });
        }
      } catch (error) {
        res.status = 503;
        res.json({
          status: 'error',
          message: error instanceof Error ? error.message : 'Health check failed',
        });
      }
      return;
    }
    
    // 处理就绪检查端点
    if (requestPath === readyPath) {
      try {
        const result = await readyCheck();
        if (result.status === 'ready') {
          res.status = 200;
          res.json({
            status: 'ready',
            message: result.message || 'Service is ready',
            ...result.details,
          });
        } else {
          res.status = 503;
          res.json({
            status: 'not-ready',
            message: result.message || 'Service is not ready',
            ...result.details,
          });
        }
      } catch (error) {
        res.status = 503;
        res.json({
          status: 'not-ready',
          message: error instanceof Error ? error.message : 'Ready check failed',
        });
      }
      return;
    }
    
    // 处理存活检查端点
    if (requestPath === livePath) {
      try {
        const result = await liveCheck();
        if (result.status === 'alive') {
          res.status = 200;
          res.json({
            status: 'alive',
            message: result.message || 'Service is alive',
            ...result.details,
          });
        } else {
          res.status = 503;
          res.json({
            status: 'dead',
            message: result.message || 'Service is dead',
            ...result.details,
          });
        }
      } catch (error) {
        res.status = 503;
        res.json({
          status: 'dead',
          message: error instanceof Error ? error.message : 'Live check failed',
        });
      }
      return;
    }
    
    // 其他请求继续处理
    await next();
  };
}

