/**
 * 队列适配器接口
 * 提供统一的队列存储接口
 */

/**
 * 可序列化的任务数据（不包含函数）
 */
export interface SerializableTask {
  /** 任务 ID */
  id: string;
  /** 队列名称 */
  queueName: string;
  /** 任务状态 */
  status: "pending" | "running" | "completed" | "failed";
  /** 任务优先级 */
  priority: "low" | "normal" | "high" | "urgent";
  /** 任务数据 */
  data?: unknown;
  /** 创建时间 */
  createdAt: number;
  /** 开始执行时间 */
  startedAt?: number;
  /** 完成时间 */
  completedAt?: number;
  /** 错误信息（序列化后的字符串） */
  error?: string;
  /** 重试次数 */
  retryCount: number;
  /** 最大重试次数 */
  maxRetries: number;
}

/**
 * 队列适配器接口
 */
export interface QueueAdapter {
  /**
   * 添加任务
   * @param task 任务数据
   */
  addTask(task: SerializableTask): Promise<void>;

  /**
   * 获取任务
   * @param taskId 任务ID
   */
  getTask(taskId: string): Promise<SerializableTask | null>;

  /**
   * 更新任务
   * @param taskId 任务ID
   * @param updates 更新的字段
   */
  updateTask(
    taskId: string,
    updates: Partial<SerializableTask>,
  ): Promise<void>;

  /**
   * 删除任务
   * @param taskId 任务ID
   */
  deleteTask(taskId: string): Promise<void>;

  /**
   * 获取待执行任务列表（按优先级排序）
   * @param queueName 队列名称
   */
  getPendingTasks(queueName: string): Promise<SerializableTask[]>;

  /**
   * 获取正在执行的任务列表
   * @param queueName 队列名称
   */
  getRunningTasks(queueName: string): Promise<SerializableTask[]>;

  /**
   * 获取已完成的任务列表
   * @param queueName 队列名称
   * @param limit 限制数量
   */
  getCompletedTasks(
    queueName: string,
    limit?: number,
  ): Promise<SerializableTask[]>;

  /**
   * 获取失败的任务列表
   * @param queueName 队列名称
   * @param limit 限制数量
   */
  getFailedTasks(
    queueName: string,
    limit?: number,
  ): Promise<SerializableTask[]>;

  /**
   * 清空队列
   * @param queueName 队列名称
   */
  clearQueue(queueName: string): Promise<void>;
}
