/**
 * 单个任务队列实现
 */

import type {
  Task,
  TaskEvent,
  TaskFunction,
  TaskListener,
  TaskOptions,
  TaskPriority,
  TaskStatus,
} from "./types.ts";
import type { QueueAdapter, SerializableTask } from "./adapter.ts";
import { MemoryQueueAdapter } from "./adapters/memory.ts";
import { RedisQueueAdapter } from "./adapters/redis.ts";

/**
 * 任务队列类
 * 管理单个队列的任务执行
 */
export class TaskQueue {
  private name: string;
  private concurrency: number;
  private maxRetries: number;
  private retryInterval: number;
  private priority: TaskPriority;
  private adapter: QueueAdapter;

  /** 任务函数映射表（taskId -> fn） */
  private taskFunctions: Map<string, TaskFunction> = new Map();

  /** 任务 ID 计数器 */
  private taskIdCounter = 0;

  /** 任务事件监听器（按任务ID） */
  private taskListeners: Map<string, Set<TaskListener>> = new Map();

  /** 全局任务事件监听器（监听所有任务） */
  private globalListeners: Set<TaskListener> = new Set();

  /** 是否正在停止（停止后不再接受新任务，等待当前任务完成） */
  private isStopping: boolean = false;

  /** 停止 Promise（用于等待所有任务完成） */
  private stopPromise: Promise<void> | null = null;
  private stopResolve: (() => void) | null = null;

  constructor(
    name: string,
    options: {
      concurrency?: number;
      retry?: number;
      retryInterval?: number;
      priority?: TaskPriority;
      storage?: "memory" | "redis";
      redis?: {
        client?: any;
        keyPrefix?: string;
      };
    } = {},
  ) {
    this.name = name;
    this.concurrency = options.concurrency || 1;
    this.maxRetries = options.retry || 0;
    this.retryInterval = options.retryInterval || 1000;
    this.priority = options.priority || "normal";

    // 初始化适配器
    if (options.storage === "redis" && options.redis?.client) {
      this.adapter = new RedisQueueAdapter({
        client: options.redis.client,
        keyPrefix: options.redis.keyPrefix,
      });
    } else {
      this.adapter = new MemoryQueueAdapter();
    }
  }

  /**
   * 添加任务到队列
   */
  async addTask(
    fn: TaskFunction,
    options: TaskOptions = {},
  ): Promise<string> {
    // 如果正在停止，拒绝新任务
    if (this.isStopping) {
      throw new Error(
        `队列 "${this.name}" 正在停止，无法接受新任务`,
      );
    }

    const taskId = options.id || `task-${Date.now()}-${++this.taskIdCounter}`;
    const priority = options.priority || this.priority;

    // 保存任务函数
    this.taskFunctions.set(taskId, fn);

    // 创建可序列化的任务数据
    const serializableTask: SerializableTask = {
      id: taskId,
      queueName: this.name,
      status: "pending",
      priority,
      data: options.data,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: this.maxRetries,
    };

    // 如果有延迟，等待延迟时间
    if (options.delay && options.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, options.delay));
    }

    // 保存到适配器
    await this.adapter.addTask(serializableTask);

    // 尝试执行任务
    this.processQueue();

    return taskId;
  }

  /**
   * 从适配器恢复任务（包含函数）
   */
  private async restoreTask(
    serializableTask: SerializableTask,
  ): Promise<Task | null> {
    const fn = this.taskFunctions.get(serializableTask.id);
    if (!fn) {
      // 如果函数不存在，可能是服务重启后丢失了
      // 这种情况下任务无法执行，标记为失败
      if (
        serializableTask.status === "pending" ||
        serializableTask.status === "running"
      ) {
        await this.adapter.updateTask(serializableTask.id, {
          status: "failed",
          error: "任务函数已丢失（服务重启后无法恢复）",
          completedAt: Date.now(),
        });
      }
      return null;
    }

    return {
      id: serializableTask.id,
      queueName: serializableTask.queueName,
      fn,
      status: serializableTask.status as TaskStatus,
      priority: serializableTask.priority,
      data: serializableTask.data,
      createdAt: serializableTask.createdAt,
      startedAt: serializableTask.startedAt,
      completedAt: serializableTask.completedAt,
      error: serializableTask.error
        ? new Error(serializableTask.error)
        : undefined,
      retryCount: serializableTask.retryCount,
      maxRetries: serializableTask.maxRetries,
    };
  }

  /**
   * 处理队列中的任务
   */
  private async processQueue(): Promise<void> {
    // 如果正在停止，不再处理新任务
    if (this.isStopping) {
      // 检查是否所有任务都已完成
      this.checkStopComplete();
      return;
    }

    // 如果已达到最大并发数，不处理新任务
    const runningTasks = await this.adapter.getRunningTasks(this.name);
    if (runningTasks.length >= this.concurrency) {
      return;
    }

    // 获取待处理任务
    const pendingTasks = await this.adapter.getPendingTasks(this.name);
    if (pendingTasks.length === 0) {
      return;
    }

    // 获取下一个待处理任务
    const serializableTask = pendingTasks[0];
    const task = await this.restoreTask(serializableTask);
    if (!task) {
      return;
    }

    // 更新任务状态为运行中
    await this.adapter.updateTask(task.id, {
      status: "running",
      startedAt: Date.now(),
    });

    // 异步执行任务
    this.executeTask(task).finally(() => {
      // 任务完成后，继续处理队列中的下一个任务
      this.processQueue();
      // 如果正在停止，检查是否所有任务都已完成
      if (this.isStopping) {
        this.checkStopComplete();
      }
    });
  }

  /**
   * 执行任务
   */
  private async executeTask(task: Task): Promise<void> {
    try {
      // 执行任务函数
      await task.fn(task.data);

      // 任务成功完成
      await this.adapter.updateTask(task.id, {
        status: "completed",
        completedAt: Date.now(),
      });

      // 触发任务事件
      this.emit({
        taskId: task.id,
        queueName: task.queueName,
        status: "completed",
        data: task.data,
        duration: Date.now() - (task.startedAt || task.createdAt),
        retryCount: task.retryCount,
      });
    } catch (error) {
      // 任务执行失败
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      task.retryCount++;

      // 如果还有重试次数，重新加入队列
      if (task.retryCount <= task.maxRetries) {
        await this.adapter.updateTask(task.id, {
          status: "pending",
          startedAt: undefined,
          error: undefined,
          retryCount: task.retryCount,
        });

        // 等待重试间隔后重新处理队列
        setTimeout(() => {
          this.processQueue();
        }, this.retryInterval);
      } else {
        // 重试次数用尽，标记为失败
        await this.adapter.updateTask(task.id, {
          status: "failed",
          error: errorMessage,
          completedAt: Date.now(),
          retryCount: task.retryCount,
        });

        // 触发任务失败事件
        this.emit({
          taskId: task.id,
          queueName: task.queueName,
          status: "failed",
          data: task.data,
          error: error instanceof Error ? error : new Error(errorMessage),
          duration: Date.now() - (task.startedAt || task.createdAt),
          retryCount: task.retryCount,
        });
      }
    }
  }

  /**
   * 获取队列状态
   */
  async getStatus(): Promise<{
    name: string;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    concurrency: number;
  }> {
    const [pending, running, completed, failed] = await Promise.all([
      this.adapter.getPendingTasks(this.name),
      this.adapter.getRunningTasks(this.name),
      this.adapter.getCompletedTasks(this.name, 100),
      this.adapter.getFailedTasks(this.name, 100),
    ]);

    return {
      name: this.name,
      pending: pending.length,
      running: running.length,
      completed: completed.length,
      failed: failed.length,
      concurrency: this.concurrency,
    };
  }

  /**
   * 获取队列名称
   */
  getName(): string {
    return this.name;
  }

  /**
   * 清空队列
   */
  async clear(): Promise<void> {
    await this.adapter.clearQueue(this.name);
    // 清理函数映射表
    const allTasks = await Promise.all([
      this.adapter.getPendingTasks(this.name),
      this.adapter.getRunningTasks(this.name),
    ]);
    for (const tasks of allTasks) {
      for (const task of tasks) {
        this.taskFunctions.delete(task.id);
      }
    }
  }

  /**
   * 监听指定任务ID的事件
   * @param taskId 任务ID
   * @param listener 事件监听器
   * @returns 取消监听的函数
   */
  onTask(taskId: string, listener: TaskListener): () => void {
    if (!this.taskListeners.has(taskId)) {
      this.taskListeners.set(taskId, new Set());
    }
    this.taskListeners.get(taskId)!.add(listener);
    // 返回取消监听的函数
    return () => {
      const listeners = this.taskListeners.get(taskId);
      if (listeners) {
        listeners.delete(listener);
        // 如果没有监听器了，删除这个任务ID的映射
        if (listeners.size === 0) {
          this.taskListeners.delete(taskId);
        }
      }
    };
  }

  /**
   * 移除指定任务ID的事件监听器
   * @param taskId 任务ID
   * @param listener 事件监听器
   */
  offTask(taskId: string, listener: TaskListener): void {
    const listeners = this.taskListeners.get(taskId);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.taskListeners.delete(taskId);
      }
    }
  }

  /**
   * 监听所有任务的事件
   * @param listener 事件监听器
   * @returns 取消监听的函数
   */
  on(listener: TaskListener): () => void {
    this.globalListeners.add(listener);
    // 返回取消监听的函数
    return () => {
      this.globalListeners.delete(listener);
    };
  }

  /**
   * 移除全局任务事件监听器
   * @param listener 事件监听器
   */
  off(listener: TaskListener): void {
    this.globalListeners.delete(listener);
  }

  /**
   * 停止队列
   * 停止接受新任务，等待所有正在运行的任务完成
   * @returns Promise，在所有任务完成后 resolve
   */
  stop(): Promise<void> {
    if (this.isStopping) {
      // 如果已经在停止，返回现有的 Promise
      return this.stopPromise || Promise.resolve();
    }

    this.isStopping = true;

    // 创建停止 Promise
    this.stopPromise = new Promise<void>((resolve) => {
      this.stopResolve = resolve;
    });

    // 检查是否所有任务都已完成（不 await，让它在后台检查）
    this.checkStopComplete();

    return this.stopPromise;
  }

  /**
   * 检查停止是否完成（所有任务都已完成）
   * 定期轮询检查，确保及时检测到任务完成
   */
  private async checkStopComplete(): Promise<void> {
    if (!this.isStopping || !this.stopResolve) {
      return;
    }

    const runningTasks = await this.adapter.getRunningTasks(this.name);
    if (runningTasks.length === 0) {
      // 所有任务都已完成，resolve stopPromise
      this.stopResolve();
      this.stopResolve = null;
    } else {
      // 如果还有正在运行的任务，500ms 后再次检查
      // 这样可以确保即使任务完成时没有触发 checkStopComplete()，也能及时检测到
      setTimeout(() => {
        this.checkStopComplete();
      }, 500);
    }
  }

  /**
   * 触发任务事件
   * @param event 任务事件数据
   */
  private async emit(event: TaskEvent): Promise<void> {
    // 触发该任务ID的监听器
    const taskListeners = this.taskListeners.get(event.taskId);
    if (taskListeners) {
      for (const listener of taskListeners) {
        try {
          await Promise.resolve(listener(event));
        } catch (error) {
          // 监听器错误不应该影响任务执行
          console.error(
            `[TaskQueue] 任务事件监听器执行失败 (任务ID: ${event.taskId}):`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }

    // 触发全局监听器
    for (const listener of this.globalListeners) {
      try {
        await Promise.resolve(listener(event));
      } catch (error) {
        // 监听器错误不应该影响任务执行
        console.error(
          `[TaskQueue] 全局任务事件监听器执行失败:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  }
}
