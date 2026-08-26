/**
 * 异步单飞 + 尾随合并：并发调用共享进行中的 Promise；
 * 进行中若再有调用，结束后再跑一轮（使用最后一次参数）。
 */

export interface CoalescedAsyncRunner<TArg, TResult> {
  (arg: TArg): Promise<TResult>;
  /** 当前是否有执行中或待跑的尾随任务 */
  isBusy(): boolean;
}

/**
 * 创建可合并的异步执行器。
 *
 * @param run 实际异步工作
 */
export function createCoalescedAsyncRunner<TArg, TResult>(
  run: (arg: TArg) => Promise<TResult>,
): CoalescedAsyncRunner<TArg, TResult> {
  let inflight: Promise<TResult> | null = null;
  let pendingArg: TArg | undefined;
  let hasPending = false;
  const waiters: Array<{
    resolve: (value: TResult) => void;
    reject: (reason: unknown) => void;
  }> = [];

  const flushPending = async (): Promise<void> => {
    while (hasPending) {
      const arg = pendingArg as TArg;
      hasPending = false;
      pendingArg = undefined;
      const batch = waiters.splice(0, waiters.length);
      try {
        const result = await run(arg);
        for (const w of batch) w.resolve(result);
      } catch (err) {
        for (const w of batch) w.reject(err);
      }
    }
  };

  const runner = ((arg: TArg): Promise<TResult> => {
    if (inflight) {
      pendingArg = arg;
      hasPending = true;
      return new Promise<TResult>((resolve, reject) => {
        waiters.push({ resolve, reject });
      });
    }

    inflight = (async () => {
      try {
        return await run(arg);
      } finally {
        // 无论成功失败都冲刷尾随任务，避免 waiters 永久挂起；冲刷完成后再放开单飞锁
        try {
          await flushPending();
        } finally {
          inflight = null;
        }
      }
    })();

    return inflight;
  }) as CoalescedAsyncRunner<TArg, TResult>;

  runner.isBusy = () => inflight !== null || hasPending;
  return runner;
}
