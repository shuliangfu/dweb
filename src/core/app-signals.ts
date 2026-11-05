/**
 * App 进程信号装配（从 app.ts 拆出）。
 *
 * 意图：SIGINT／SIGTERM 优雅关闭与 App 类解耦，缩小 app.ts。
 * 不变量：防重入、先 stop 再 shutdown、成功 exit(0)／失败 exit(1)。
 *
 * @module
 */

import {
  addSignalListener,
  exit,
  removeSignalListener,
  type SignalHandler,
} from "./runtime-adapter.ts";
import { $tr } from "../utils/i18n.ts";

/**
 * 最小日志面：兼容 @dreamer/logger Logger 与 app 内后备 logger。
 * 为何不用 `(...args: unknown[])`：Logger.info 首参为 string，逆变会挂。
 */
export type AppSignalLogger = {
  info: (message: string, ...rest: unknown[]) => void;
  error: (message: string, ...rest: unknown[]) => void;
};

/**
 * 注册 SIGINT／SIGTERM；返回用于移除的 handler map。
 *
 * @param logger 日志
 * @param isShuttingDown 查询是否已在关闭
 * @param markShuttingDown 标记关闭中
 * @param stop 停止 HTTP／服务
 * @param shutdown 生命周期收尾
 */
export function setupAppSignalHandlers(
  logger: AppSignalLogger,
  isShuttingDown: () => boolean,
  markShuttingDown: () => void,
  stop: () => Promise<void>,
  shutdown: () => Promise<void>,
): Map<string, SignalHandler> {
  const signalHandlers = new Map<string, SignalHandler>();

  const makeHandler = (
    labelKey: "log.sigintShutdown" | "log.sigtermShutdown",
  ) => {
    const handler: SignalHandler = () => {
      if (isShuttingDown()) return;
      markShuttingDown();
      logger.info("\n" + $tr(labelKey));
      stop()
        .then(() => shutdown())
        .then(() => {
          exit(0);
        })
        .catch((error) => {
          const errorMessage = error instanceof Error
            ? error.message
            : String(error);
          logger.error($tr("log.shutdownError") + ":", errorMessage);
          exit(1);
        });
    };
    return handler;
  };

  const sigintHandler = makeHandler("log.sigintShutdown");
  addSignalListener("SIGINT", sigintHandler);
  signalHandlers.set("SIGINT", sigintHandler);

  const sigtermHandler = makeHandler("log.sigtermShutdown");
  addSignalListener("SIGTERM", sigtermHandler);
  signalHandlers.set("SIGTERM", sigtermHandler);

  return signalHandlers;
}

/** 移除 {@link setupAppSignalHandlers} 注册的监听器并清空 map。 */
export function removeAppSignalHandlers(
  signalHandlers: Map<string, SignalHandler>,
): void {
  for (const [signal, handler] of signalHandlers.entries()) {
    removeSignalListener(signal as "SIGINT" | "SIGTERM", handler);
  }
  signalHandlers.clear();
}
