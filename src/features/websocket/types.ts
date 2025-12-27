/**
 * WebSocket 功能类型定义
 *
 * @module features/websocket/types
 */

/**
 * WebSocket 连接对象
 */
export interface WebSocketConnection {
  /** 连接 ID（唯一标识） */
  id: string;
  /** WebSocket 对象 */
  socket: WebSocket;
  /** 连接创建时间 */
  createdAt: Date;
  /** 连接元数据（可存储用户信息等） */
  metadata?: Record<string, unknown>;
}

/**
 * WebSocket 消息类型
 */
export type WebSocketMessageType = "text" | "binary" | "json";

/**
 * WebSocket 消息对象
 */
export interface WebSocketMessage {
  /** 消息类型 */
  type: WebSocketMessageType;
  /** 消息内容 */
  data: string | Uint8Array | Record<string, unknown>;
  /** 发送者连接 ID（可选） */
  from?: string;
  /** 目标连接 ID（可选，用于点对点消息） */
  to?: string;
  /** 消息时间戳 */
  timestamp?: number;
}

/**
 * WebSocket 事件处理器
 */
export interface WebSocketHandlers {
  /** 连接建立时调用 */
  onConnect?: (connection: WebSocketConnection) => void | Promise<void>;
  /** 收到消息时调用 */
  onMessage?: (
    connection: WebSocketConnection,
    message: WebSocketMessage,
  ) => void | Promise<void>;
  /** 连接关闭时调用 */
  onClose?: (
    connection: WebSocketConnection,
    code: number,
    reason: string,
  ) => void | Promise<void>;
  /** 连接错误时调用 */
  onError?: (
    connection: WebSocketConnection,
    error: Error,
  ) => void | Promise<void>;
}

/**
 * WebSocket 服务器配置
 */
export interface WebSocketConfig {
  /** WebSocket 路径前缀（默认: '/ws'） */
  path?: string;
  /** 是否启用心跳检测（默认: true） */
  heartbeat?: boolean;
  /** 心跳间隔（毫秒，默认: 30000） */
  heartbeatInterval?: number;
  /** 连接超时时间（毫秒，默认: 60000） */
  timeout?: number;
  /** 最大连接数（默认: 1000） */
  maxConnections?: number;
  /** 事件处理器 */
  handlers?: WebSocketHandlers;
  /** 是否启用消息压缩（默认: false） */
  compress?: boolean;
}

/**
 * WebSocket 服务器统计信息
 */
export interface WebSocketStats {
  /** 当前连接数 */
  connections: number;
  /** 总连接数（历史累计） */
  totalConnections: number;
  /** 总消息数 */
  totalMessages: number;
  /** 服务器启动时间 */
  startTime: Date;
}
