/**
 * Redis 队列适配器
 * 使用 Redis 存储任务数据
 */

import type { QueueAdapter, SerializableTask } from "../adapter.ts";

/**
 * Redis 配置
 */
export interface RedisQueueAdapterConfig {
  /** Redis 客户端实例 */
  client: any;
  /** Key 前缀 */
  keyPrefix?: string;
}

/**
 * Redis 队列适配器
 */
export class RedisQueueAdapter implements QueueAdapter {
  private client: any;
  private keyPrefix: string;

  constructor(config: RedisQueueAdapterConfig) {
    if (!config.client) {
      throw new Error("Redis client is required");
    }
    this.client = config.client;
    this.keyPrefix = config.keyPrefix || "queue:";
  }

  /**
   * 获取任务 Key
   */
  private getTaskKey(taskId: string): string {
    return `${this.keyPrefix}task:${taskId}`;
  }

  /**
   * 获取队列的待执行任务列表 Key
   */
  private getPendingListKey(queueName: string): string {
    return `${this.keyPrefix}${queueName}:pending`;
  }

  /**
   * 获取队列的正在执行任务集合 Key
   */
  private getRunningSetKey(queueName: string): string {
    return `${this.keyPrefix}${queueName}:running`;
  }

  /**
   * 获取队列的已完成任务列表 Key
   */
  private getCompletedListKey(queueName: string): string {
    return `${this.keyPrefix}${queueName}:completed`;
  }

  /**
   * 获取队列的失败任务列表 Key
   */
  private getFailedListKey(queueName: string): string {
    return `${this.keyPrefix}${queueName}:failed`;
  }

  async addTask(task: SerializableTask): Promise<void> {
    const taskKey = this.getTaskKey(task.id);
    const taskJson = JSON.stringify(task);

    // 存储任务数据
    await this.client.set(taskKey, taskJson);

    // 根据状态添加到相应的列表
    if (task.status === "pending") {
      await this.client.lpush(this.getPendingListKey(task.queueName), task.id);
    } else if (task.status === "running") {
      await this.client.sadd(this.getRunningSetKey(task.queueName), task.id);
    }
  }

  async getTask(taskId: string): Promise<SerializableTask | null> {
    const taskKey = this.getTaskKey(taskId);
    const taskJson = await this.client.get(taskKey);
    if (!taskJson) {
      return null;
    }
    try {
      return JSON.parse(taskJson) as SerializableTask;
    } catch {
      return null;
    }
  }

  async updateTask(
    taskId: string,
    updates: Partial<SerializableTask>,
  ): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) {
      return;
    }

    const updatedTask = { ...task, ...updates };
    const taskKey = this.getTaskKey(taskId);
    const taskJson = JSON.stringify(updatedTask);

    // 更新任务数据
    await this.client.set(taskKey, taskJson);

    // 如果状态改变，需要更新列表
    if (updates.status && updates.status !== task.status) {
      // 从旧状态列表中移除
      if (task.status === "pending") {
        await this.client.lrem(
          this.getPendingListKey(task.queueName),
          1,
          taskId,
        );
      } else if (task.status === "running") {
        await this.client.srem(
          this.getRunningSetKey(task.queueName),
          taskId,
        );
      }

      // 添加到新状态列表
      if (updates.status === "pending") {
        await this.client.lpush(
          this.getPendingListKey(task.queueName),
          taskId,
        );
      } else if (updates.status === "running") {
        await this.client.sadd(
          this.getRunningSetKey(task.queueName),
          taskId,
        );
      } else if (updates.status === "completed") {
        await this.client.lpush(
          this.getCompletedListKey(task.queueName),
          taskId,
        );
        // 限制已完成任务列表大小
        await this.client.ltrim(
          this.getCompletedListKey(task.queueName),
          0,
          99,
        );
      } else if (updates.status === "failed") {
        await this.client.lpush(
          this.getFailedListKey(task.queueName),
          taskId,
        );
        // 限制失败任务列表大小
        await this.client.ltrim(
          this.getFailedListKey(task.queueName),
          0,
          99,
        );
      }
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) {
      return;
    }

    const taskKey = this.getTaskKey(taskId);
    await this.client.del(taskKey);

    // 从相应的列表中移除
    if (task.status === "pending") {
      await this.client.lrem(this.getPendingListKey(task.queueName), 1, taskId);
    } else if (task.status === "running") {
      await this.client.srem(this.getRunningSetKey(task.queueName), taskId);
    }
  }

  async getPendingTasks(queueName: string): Promise<SerializableTask[]> {
    const listKey = this.getPendingListKey(queueName);
    const taskIds = await this.client.lrange(listKey, 0, -1);
    const tasks: SerializableTask[] = [];

    for (const taskId of taskIds) {
      const task = await this.getTask(taskId);
      if (task) {
        tasks.push(task);
      }
    }

    // 按优先级排序
    return this.sortByPriority(tasks);
  }

  async getRunningTasks(queueName: string): Promise<SerializableTask[]> {
    const setKey = this.getRunningSetKey(queueName);
    const taskIds = await this.client.smembers(setKey);
    const tasks: SerializableTask[] = [];

    for (const taskId of taskIds) {
      const task = await this.getTask(taskId);
      if (task) {
        tasks.push(task);
      }
    }

    return tasks;
  }

  async getCompletedTasks(
    queueName: string,
    limit: number = 100,
  ): Promise<SerializableTask[]> {
    const listKey = this.getCompletedListKey(queueName);
    const taskIds = await this.client.lrange(listKey, 0, limit - 1);
    const tasks: SerializableTask[] = [];

    for (const taskId of taskIds) {
      const task = await this.getTask(taskId);
      if (task) {
        tasks.push(task);
      }
    }

    return tasks;
  }

  async getFailedTasks(
    queueName: string,
    limit: number = 100,
  ): Promise<SerializableTask[]> {
    const listKey = this.getFailedListKey(queueName);
    const taskIds = await this.client.lrange(listKey, 0, limit - 1);
    const tasks: SerializableTask[] = [];

    for (const taskId of taskIds) {
      const task = await this.getTask(taskId);
      if (task) {
        tasks.push(task);
      }
    }

    return tasks;
  }

  async clearQueue(queueName: string): Promise<void> {
    // 获取所有任务ID
    const pendingIds = await this.client.lrange(
      this.getPendingListKey(queueName),
      0,
      -1,
    );
    const runningIds = await this.client.smembers(
      this.getRunningSetKey(queueName),
    );

    // 删除所有任务数据
    const allIds = [...pendingIds, ...runningIds];
    if (allIds.length > 0) {
      const keys = allIds.map((id) => this.getTaskKey(id));
      await this.client.del(...keys);
    }

    // 删除所有列表
    await this.client.del(
      this.getPendingListKey(queueName),
      this.getRunningSetKey(queueName),
      this.getCompletedListKey(queueName),
      this.getFailedListKey(queueName),
    );
  }

  /**
   * 按优先级排序任务
   */
  private sortByPriority(tasks: SerializableTask[]): SerializableTask[] {
    const priorityOrder: Record<string, number> = {
      urgent: 0,
      high: 1,
      normal: 2,
      low: 3,
    };
    return tasks.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    );
  }
}
