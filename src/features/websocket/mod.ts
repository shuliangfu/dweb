/**
 * WebSocket 功能模块入口
 * 导出所有 WebSocket 相关的公共 API
 *
 * @module features/websocket
 */

export { WebSocketServer } from "./server.ts";
export { WebSocketClient } from "./client.ts";
export {
  getWebSocketServer,
  initWebSocket,
  isWebSocketInitialized,
} from "./access.ts";
export type {
  WebSocketConfig,
  WebSocketConnection,
  WebSocketHandlers,
  WebSocketMessage,
  WebSocketMessageType,
  WebSocketStats,
} from "./types.ts";
export type {
  WebSocketClientConfig,
  WebSocketClientEventType,
  WebSocketClientHandlers,
  WebSocketClientState,
} from "./client.ts";
