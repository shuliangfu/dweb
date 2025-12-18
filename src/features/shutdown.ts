/**
 * 优雅关闭模块
 * 处理服务器关闭信号和资源清理
 */

/**
 * 关闭处理器类型
 */
export type ShutdownHandler = () => Promise<void> | void;

/**
 * 关闭处理器列表
 */
const shutdownHandlers: ShutdownHandler[] = [];

/**
 * 是否正在关闭
 */
let isShuttingDown = false;

/**
 * 注册关闭处理器
 * @param handler 关闭处理函数
 */
export function registerShutdownHandler(handler: ShutdownHandler): void {
  shutdownHandlers.push(handler);
}

/**
 * 移除关闭处理器
 * @param handler 关闭处理函数
 */
export function unregisterShutdownHandler(handler: ShutdownHandler): void {
  const index = shutdownHandlers.indexOf(handler);
  if (index > -1) {
    shutdownHandlers.splice(index, 1);
  }
}

/**
 * 执行所有关闭处理器
 */
async function executeShutdownHandlers(): Promise<void> {
  // 按注册顺序的逆序执行（后注册的先执行）
  for (let i = shutdownHandlers.length - 1; i >= 0; i--) {
    try {
      await shutdownHandlers[i]();
    } catch (error) {
      console.error('关闭处理器执行失败:', error);
    }
  }
}

/**
 * 优雅关闭
 * @param signal 信号名称
 * @param server 服务器实例（可选）
 */
export async function gracefulShutdown(
  signal: string,
  server?: { close?: () => Promise<void> | void }
): Promise<void> {
  if (isShuttingDown) {
    console.log('关闭流程已在进行中，忽略重复信号');
    return;
  }
  
  isShuttingDown = true;
  console.log(`收到 ${signal} 信号，开始优雅关闭...`);
  
  try {
    // 1. 停止接收新请求（如果服务器支持）
    if (server?.close) {
      console.log('停止接收新请求...');
      await server.close();
    }
    
    // 2. 等待现有请求完成（给一个合理的超时时间）
    console.log('等待现有请求完成...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待最多 5 秒
    
    // 3. 执行关闭处理器（清理资源）
    console.log('执行关闭处理器...');
    await executeShutdownHandlers();
    
    console.log('优雅关闭完成');
    Deno.exit(0);
  } catch (error) {
    console.error('优雅关闭失败:', error);
    Deno.exit(1);
  }
}

/**
 * 设置信号监听器
 * @param server 服务器实例（可选）
 */
export function setupSignalHandlers(server?: { close?: () => Promise<void> | void }): void {
  // 监听 SIGTERM 信号（通常由进程管理器发送）
  Deno.addSignalListener('SIGTERM', () => {
    gracefulShutdown('SIGTERM', server).catch(console.error);
  });
  
  // 监听 SIGINT 信号（通常由 Ctrl+C 触发）
  Deno.addSignalListener('SIGINT', () => {
    gracefulShutdown('SIGINT', server).catch(console.error);
  });
  
  console.log('已设置信号监听器（SIGTERM, SIGINT）');
}

/**
 * 检查是否正在关闭
 * @returns 是否正在关闭
 */
export function isShuttingDownState(): boolean {
  return isShuttingDown;
}

