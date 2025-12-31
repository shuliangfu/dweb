/**
 * 内存队列适配器
 * 使用内存存储任务数据
 */

import type { QueueAdapter, SerializableTask } from "../adapter.ts";

/**
 * 内存队列适配器
 */
export class MemoryQueueAdapter implements QueueAdapter {
  /** 任务存储（按队列名称分组） */
  private tasks: Map<string, Map<string, SerializableTask>> = new Map();

  /**
   * 获取队列的任务存储
   */
  private getQueueTasks(queueName: string): Map<string, SerializableTask> {
    if (!this.tasks.has(queueName)) {
      this.tasks.set(queueName, new Map());
    }
    return this.tasks.get(queueName)!;
  }

  async addTask(task: SerializableTask): Promise<void> {
    const queueTasks = this.getQueueTasks(task.queueName);
    queueTasks.set(task.id, { ...task });
  }

  async getTask(taskId: string): Promise<SerializableTask | null> {
    for (const queueTasks of this.tasks.values()) {
      const task = queueTasks.get(taskId);
      if (task) {
        return { ...task };
      }
    }
    return null;
  }

  async updateTask(
    taskId: string,
    updates: Partial<SerializableTask>,
  ): Promise<void> {
    for (const queueTasks of this.tasks.values()) {
      const task = queueTasks.get(taskId);
      if (task) {
        queueTasks.set(taskId, { ...task, ...updates });
        return;
      }
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    for (const queueTasks of this.tasks.values()) {
      queueTasks.delete(taskId);
    }
  }

  async getPendingTasks(queueName: string): Promise<SerializableTask[]> {
    const queueTasks = this.getQueueTasks(queueName);
    const tasks = Array.from(queueTasks.values()).filter(
      (task) => task.status === "pending",
    );
    // 按优先级排序
    return this.sortByPriority(tasks);
  }

  async getRunningTasks(queueName: string): Promise<SerializableTask[]> {
    const queueTasks = this.getQueueTasks(queueName);
    return Array.from(queueTasks.values()).filter(
      (task) => task.status === "running",
    );
  }

  async getCompletedTasks(
    queueName: string,
    limit: number = 100,
  ): Promise<SerializableTask[]> {
    const queueTasks = this.getQueueTasks(queueName);
    const tasks = Array.from(queueTasks.values())
      .filter((task) => task.status === "completed")
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
      .slice(0, limit);
    return tasks;
  }

  async getFailedTasks(
    queueName: string,
    limit: number = 100,
  ): Promise<SerializableTask[]> {
    const queueTasks = this.getQueueTasks(queueName);
    const tasks = Array.from(queueTasks.values())
      .filter((task) => task.status === "failed")
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
      .slice(0, limit);
    return tasks;
  }

  async clearQueue(queueName: string): Promise<void> {
    this.tasks.delete(queueName);
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
