/**
 * WebSocket 功能模块入口
 * 导出所有 WebSocket 相关的公共 API
 * 
 * @module features/websocket
 */

export { WebSocketServer } from './server.ts';
export {
  initWebSocket,
  getWebSocketServer,
  isWebSocketInitialized,
} from './access.ts';
export type {
  WebSocketConnection,
  WebSocketConfig,
  WebSocketMessage,
  WebSocketHandlers,
  WebSocketStats,
  WebSocketMessageType,
} from './types.ts';

