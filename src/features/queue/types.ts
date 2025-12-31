/**
 * 任务队列类型定义
 */

/**
 * 任务优先级
 */
export type TaskPriority = "low" | "normal" | "high" | "urgent";

/**
 * 任务状态
 */
export type TaskStatus = "pending" | "running" | "completed" | "failed";

/**
 * 任务函数类型
 */
export type TaskFunction<T = unknown> = (
  data?: T,
) => Promise<unknown> | unknown;

/**
 * 任务配置
 */
export interface TaskOptions {
  /** 任务优先级 */
  priority?: TaskPriority;
  /** 任务数据（传递给任务函数） */
  data?: unknown;
  /** 延迟执行时间（毫秒） */
  delay?: number;
  /** 任务 ID（可选，如果不提供会自动生成） */
  id?: string;
}

/**
 * 队列存储类型
 */
export type QueueStorageType = "memory" | "redis";

/**
 * 队列配置
 */
export interface QueueOptions {
  /** 最大并发数 */
  concurrency?: number;
  /** 重试次数 */
  retry?: number;
  /** 重试间隔（毫秒） */
  retryInterval?: number;
  /** 队列优先级 */
  priority?: TaskPriority;
  /** 存储类型 */
  storage?: QueueStorageType;
  /** Redis 配置（当 storage 为 redis 时使用） */
  redis?: {
    /** Redis 客户端实例 */
    client?: any;
    /** Key 前缀 */
    keyPrefix?: string;
  };
}

/**
 * 任务实例
 */
export interface Task {
  /** 任务 ID */
  id: string;
  /** 队列名称 */
  queueName: string;
  /** 任务函数 */
  fn: TaskFunction;
  /** 任务状态 */
  status: TaskStatus;
  /** 任务优先级 */
  priority: TaskPriority;
  /** 任务数据 */
  data?: unknown;
  /** 创建时间 */
  createdAt: number;
  /** 开始执行时间 */
  startedAt?: number;
  /** 完成时间 */
  completedAt?: number;
  /** 错误信息 */
  error?: Error;
  /** 重试次数 */
  retryCount: number;
  /** 最大重试次数 */
  maxRetries: number;
}

/**
 * 任务事件数据
 */
export interface TaskEvent {
  /** 任务 ID */
  taskId: string;
  /** 队列名称 */
  queueName: string;
  /** 任务状态（成功或失败） */
  status: "completed" | "failed";
  /** 任务数据 */
  data?: unknown;
  /** 错误信息（如果失败） */
  error?: Error;
  /** 执行时长（毫秒） */
  duration: number;
  /** 重试次数 */
  retryCount: number;
}

/**
 * 任务事件监听器
 */
export type TaskListener = (event: TaskEvent) => void | Promise<void>;
