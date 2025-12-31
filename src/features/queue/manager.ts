/**
 * 任务队列管理器
 * 管理多个任务队列
 */

import { BaseManager } from "../../core/base-manager.ts";
import type { IService } from "../../core/iservice.ts";
import { TaskQueue } from "./queue.ts";
import type {
  QueueOptions,
  TaskFunction,
  TaskListener,
  TaskOptions,
} from "./types.ts";

/**
 * 任务队列管理器类
 */
export class QueueManager extends BaseManager implements IService {
  /** 队列映射表 */
  private queues: Map<string, TaskQueue> = new Map();
  /** Redis 客户端实例（共享） */
  private redisClient: any = null;

  /**
   * 构造函数
   */
  constructor() {
    super("QueueManager");
  }

  /**
   * 设置 Redis 客户端
   * @param client Redis 客户端实例
   */
  setRedisClient(client: any): void {
    this.redisClient = client;
  }

  /**
   * 获取 Redis 客户端
   */
  getRedisClient(): any {
    return this.redisClient;
  }

  /**
   * 添加队列
   * @param name 队列名称
   * @param options 队列配置
   */
  addQueue(name: string, options: QueueOptions = {}): void {
    if (this.queues.has(name)) {
      throw new Error(`队列 "${name}" 已存在`);
    }

    // 如果使用 Redis 存储但没有提供 client，使用共享的 Redis 客户端
    let redisConfig = options.redis;
    if (!redisConfig && options.storage === "redis" && this.redisClient) {
      redisConfig = {
        client: this.redisClient,
        keyPrefix: undefined,
      };
    }

    const queue = new TaskQueue(name, {
      concurrency: options.concurrency || 1,
      retry: options.retry || 0,
      retryInterval: options.retryInterval || 1000,
      priority: options.priority || "normal",
      storage: options.storage || "memory",
      redis: redisConfig,
    });

    this.queues.set(name, queue);
  }

  /**
   * 运行任务（将任务加入队列并异步执行）
   * @param queueName 队列名称
   * @param fn 任务函数
   * @param options 任务配置
   * @returns 任务 ID
   */
  async runTask(
    queueName: string,
    fn: TaskFunction,
    options: TaskOptions = {},
  ): Promise<string> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`队列 "${queueName}" 不存在，请先使用 addQueue 添加队列`);
    }

    return await queue.addTask(fn, options);
  }

  /**
   * 获取队列
   * @param name 队列名称
   */
  getQueue(name: string): TaskQueue | undefined {
    return this.queues.get(name);
  }

  /**
   * 获取所有队列状态
   */
  async getAllQueuesStatus(): Promise<
    Array<{
      name: string;
      pending: number;
      running: number;
      completed: number;
      failed: number;
      concurrency: number;
    }>
  > {
    const statuses: Array<{
      name: string;
      pending: number;
      running: number;
      completed: number;
      failed: number;
      concurrency: number;
    }> = [];

    for (const queue of this.queues.values()) {
      statuses.push(await queue.getStatus());
    }

    return statuses;
  }

  /**
   * 获取队列状态
   * @param name 队列名称
   */
  async getQueueStatus(name: string) {
    const queue = this.queues.get(name);
    if (!queue) {
      return undefined;
    }
    return await queue.getStatus();
  }

  /**
   * 删除队列
   * @param name 队列名称
   */
  async removeQueue(name: string): Promise<boolean> {
    const queue = this.queues.get(name);
    if (queue) {
      await queue.clear();
      return this.queues.delete(name);
    }
    return false;
  }

  /**
   * 清空所有队列
   */
  async clearAll(): Promise<void> {
    for (const queue of this.queues.values()) {
      await queue.clear();
    }
  }

  /**
   * 监听指定任务ID的事件
   * @param queueName 队列名称
   * @param taskId 任务ID
   * @param listener 事件监听器
   * @returns 取消监听的函数，如果队列不存在返回 undefined
   */
  onTask(
    queueName: string,
    taskId: string,
    listener: TaskListener,
  ): (() => void) | undefined {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return undefined;
    }
    return queue.onTask(taskId, listener);
  }

  /**
   * 移除指定任务ID的事件监听器
   * @param queueName 队列名称
   * @param taskId 任务ID
   * @param listener 事件监听器
   */
  offTask(
    queueName: string,
    taskId: string,
    listener: TaskListener,
  ): void {
    const queue = this.queues.get(queueName);
    if (queue) {
      queue.offTask(taskId, listener);
    }
  }

  /**
   * 监听指定队列的所有任务事件
   * @param queueName 队列名称
   * @param listener 事件监听器
   * @returns 取消监听的函数，如果队列不存在返回 undefined
   */
  on(
    queueName: string,
    listener: TaskListener,
  ): (() => void) | undefined {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return undefined;
    }
    return queue.on(listener);
  }

  /**
   * 移除指定队列的全局任务事件监听器
   * @param queueName 队列名称
   * @param listener 事件监听器
   */
  off(queueName: string, listener: TaskListener): void {
    const queue = this.queues.get(queueName);
    if (queue) {
      queue.off(listener);
    }
  }

  /**
   * 监听所有队列的所有任务事件
   * @param listener 事件监听器
   * @returns 取消监听的函数数组
   */
  onAll(listener: TaskListener): Array<() => void> {
    const unsubscribers: Array<() => void> = [];
    for (const queue of this.queues.values()) {
      const unsubscribe = queue.on(listener);
      unsubscribers.push(unsubscribe);
    }
    return unsubscribers;
  }

  /**
   * 移除所有队列的全局任务事件监听器
   * @param listener 事件监听器
   */
  offAll(listener: TaskListener): void {
    for (const queue of this.queues.values()) {
      queue.off(listener);
    }
  }

  /**
   * 销毁管理器
   * 关闭 Redis 连接（不清空任务，任务保留在 Redis 中）
   */
  protected override async onDestroy(): Promise<void> {
    // 注意：不清空队列任务，任务保留在 Redis 中，服务重启后可以继续处理
    // 只关闭 Redis 客户端连接
    if (this.redisClient && typeof this.redisClient.quit === "function") {
      await this.redisClient.quit();
    }
    this.redisClient = null;
    // console.log("队列服务销毁完成...");
  }

  /**
   * 停止管理器
   * 停止所有队列接受新任务，等待当前任务完成
   *
   * 关闭流程：
   * 1. 调用所有队列的 stop()，设置 isStopping = true，不再接受新任务
   * 2. 等待所有正在执行的任务完成（必须等待，不能超时，避免数据丢失）
   */
  protected override async onStop(): Promise<void> {
    // 停止所有队列（不再接受新任务，等待当前任务完成）
    const stopPromises: Promise<void>[] = [];
    for (const queue of this.queues.values()) {
      stopPromises.push(queue.stop());
    }

    // 等待所有队列停止（必须等待完成，不能超时，避免数据丢失）
    await Promise.all(stopPromises);
  }
}
