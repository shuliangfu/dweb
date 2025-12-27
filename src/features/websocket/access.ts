/**
 * WebSocket 访问辅助函数
 * 提供全局 WebSocket 服务器访问
 *
 * @module features/websocket/access
 */

import type { WebSocketServer } from "./server.ts";

/**
 * 全局 WebSocket 服务器实例
 */
let wsServerInstance: WebSocketServer | null = null;

/**
 * 初始化 WebSocket 服务器
 *
 * 在服务器启动时调用，设置全局 WebSocket 服务器实例。
 *
 * @param server - WebSocket 服务器实例
 *
 * @example
 * ```typescript
 * import { initWebSocket } from '@dreamer/dweb';
 *
 * const wsServer = new WebSocketServer(config);
 * initWebSocket(wsServer);
 * ```
 */
export function initWebSocket(server: WebSocketServer): void {
  wsServerInstance = server;
}

/**
 * 获取 WebSocket 服务器实例
 *
 * 返回全局 WebSocket 服务器实例。如果未初始化，返回 null。
 *
 * @returns WebSocket 服务器实例或 null
 *
 * @example
 * ```typescript
 * import { getWebSocketServer } from '@dreamer/dweb';
 *
 * const wsServer = getWebSocketServer();
 * if (wsServer) {
 *   wsServer.broadcast({ type: 'text', data: 'Hello' });
 * }
 * ```
 */
export function getWebSocketServer(): WebSocketServer | null {
  return wsServerInstance;
}

/**
 * 检查 WebSocket 服务器是否已初始化
 *
 * @returns 如果已初始化返回 true，否则返回 false
 */
export function isWebSocketInitialized(): boolean {
  return wsServerInstance !== null;
}
