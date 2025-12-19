/**
 * WebSocket 服务器实现
 * 
 * 提供 WebSocket 连接管理、消息广播等功能。
 * 
 * @module features/websocket/server
 */

import type {
  WebSocketConnection,
  WebSocketConfig,
  WebSocketMessage,
  WebSocketStats,
} from './types.ts';

/**
 * WebSocket 服务器类
 * 
 * 管理 WebSocket 连接，提供消息广播、连接管理等功能。
 * 
 * @example
 * ```typescript
 * import { WebSocketServer } from '@dreamer/dweb';
 * 
 * const wsServer = new WebSocketServer({
 *   path: '/ws',
 *   handlers: {
 *     onConnect: (conn) => console.log('连接建立:', conn.id),
 *     onMessage: (conn, msg) => console.log('收到消息:', msg),
 *   },
 * });
 * 
 * // 在 HTTP 请求处理中升级连接
 * if (req.url === '/ws') {
 *   wsServer.handleUpgrade(req);
 * }
 * ```
 */
export class WebSocketServer {
  private config: Required<WebSocketConfig>;
  private connections: Map<string, WebSocketConnection> = new Map();
  private heartbeatTimers: Map<string, number> = new Map();
  private stats: WebSocketStats;
  private connectionCounter = 0;

  /**
   * 创建 WebSocket 服务器实例
   * 
   * @param config - WebSocket 配置选项
   */
  constructor(config: WebSocketConfig = {}) {
    this.config = {
      path: config.path || '/ws',
      heartbeat: config.heartbeat !== false,
      heartbeatInterval: config.heartbeatInterval || 30000,
      timeout: config.timeout || 60000,
      maxConnections: config.maxConnections || 1000,
      handlers: config.handlers || {},
      compress: config.compress || false,
    };

    this.stats = {
      connections: 0,
      totalConnections: 0,
      totalMessages: 0,
      startTime: new Date(),
    };
  }

  /**
   * 处理 WebSocket 升级请求
   * 
   * 将 HTTP 请求升级为 WebSocket 连接。
   * 
   * @param req - HTTP 请求对象
   * @returns WebSocket 升级响应，如果无法升级则返回 null
   * 
   * @example
   * ```typescript
   * const response = wsServer.handleUpgrade(req);
   * if (response) {
   *   return response;
   * }
   * ```
   */
  handleUpgrade(req: globalThis.Request): globalThis.Response | null {
    try {
      // 检查是否超过最大连接数
      if (this.connections.size >= this.config.maxConnections) {
        return new Response('Too many connections', { status: 503 });
      }

      // 使用 Deno 的 WebSocket 升级 API
      const upgrade = Deno.upgradeWebSocket(req);
      const { socket, response } = upgrade;

      // 创建连接对象
      const connectionId = this.generateConnectionId();
      const connection: WebSocketConnection = {
        id: connectionId,
        socket: socket,
        createdAt: new Date(),
        metadata: {},
      };

      // 设置 WebSocket 事件处理器
      this.setupSocketHandlers(connection);

      // 存储连接
      this.connections.set(connectionId, connection);
      this.stats.connections = this.connections.size;
      this.stats.totalConnections++;

      // 调用连接建立回调
      if (this.config.handlers.onConnect) {
        Promise.resolve(this.config.handlers.onConnect(connection)).catch((error) => {
          console.error('WebSocket onConnect 回调错误:', error);
        });
      }

      // 启动心跳检测
      if (this.config.heartbeat) {
        this.startHeartbeat(connectionId);
      }

      return response;
    } catch (error) {
      console.error('WebSocket 升级失败:', error);
      return null;
    }
  }

  /**
   * 设置 WebSocket 事件处理器
   * 
   * @param connection - WebSocket 连接对象
   */
  private setupSocketHandlers(connection: WebSocketConnection): void {
    const { socket, id } = connection;

    // 消息处理
    socket.onopen = () => {
      // WebSocket 连接已建立
    };

    socket.onmessage = (event) => {
      this.stats.totalMessages++;

      // 解析消息
      let message: WebSocketMessage;
      try {
        if (typeof event.data === 'string') {
          // 尝试解析 JSON
          try {
            const parsed = JSON.parse(event.data);
            message = {
              type: 'json',
              data: parsed,
              from: id,
              timestamp: Date.now(),
            };
          } catch {
            // 普通文本消息
            message = {
              type: 'text',
              data: event.data,
              from: id,
              timestamp: Date.now(),
            };
          }
        } else if (event.data instanceof Uint8Array) {
          // 二进制消息
          message = {
            type: 'binary',
            data: event.data,
            from: id,
            timestamp: Date.now(),
          };
        } else {
          // 其他类型，转换为字符串
          message = {
            type: 'text',
            data: String(event.data),
            from: id,
            timestamp: Date.now(),
          };
        }

        // 调用消息处理回调
        if (this.config.handlers.onMessage) {
          Promise.resolve(this.config.handlers.onMessage(connection, message)).catch((error) => {
            console.error('WebSocket onMessage 回调错误:', error);
          });
        }
      } catch (error) {
        console.error('WebSocket 消息处理错误:', error);
        if (this.config.handlers.onError) {
          Promise.resolve(
            this.config.handlers.onError(connection, error instanceof Error ? error : new Error(String(error)))
          ).catch((err) => {
            console.error('WebSocket onError 回调错误:', err);
          });
        }
      }
    };

    socket.onerror = (event) => {
      const error = event instanceof ErrorEvent
        ? new Error(event.message)
        : new Error('WebSocket 错误');
      if (this.config.handlers.onError) {
        Promise.resolve(this.config.handlers.onError(connection, error)).catch((err) => {
          console.error('WebSocket onError 回调错误:', err);
        });
      }
    };

    socket.onclose = (event) => {
      // 清理连接
      this.connections.delete(id);
      this.stats.connections = this.connections.size;

      // 停止心跳检测
      if (this.config.heartbeat) {
        this.stopHeartbeat(id);
      }

      // 调用关闭回调
      if (this.config.handlers.onClose) {
        Promise.resolve(
          this.config.handlers.onClose(connection, event.code, event.reason)
        ).catch((error) => {
          console.error('WebSocket onClose 回调错误:', error);
        });
      }
    };
  }

  /**
   * 发送消息到指定连接
   * 
   * @param connectionId - 连接 ID
   * @param message - 消息内容
   * @returns 是否发送成功
   * 
   * @example
   * ```typescript
   * wsServer.send('connection-id', { type: 'text', data: 'Hello' });
   * ```
   */
  send(connectionId: string, message: WebSocketMessage): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    try {
      const { socket } = connection;
      if (socket.readyState === WebSocket.OPEN) {
        if (message.type === 'json') {
          socket.send(JSON.stringify(message.data));
        } else if (message.type === 'binary') {
          socket.send(message.data as Uint8Array);
        } else {
          socket.send(message.data as string);
        }
        return true;
      }
    } catch (error) {
      console.error(`发送消息到连接 ${connectionId} 失败:`, error);
    }

    return false;
  }

  /**
   * 广播消息到所有连接
   * 
   * @param message - 消息内容
   * @param excludeConnectionId - 排除的连接 ID（可选，用于排除发送者）
   * @returns 成功发送的连接数
   * 
   * @example
   * ```typescript
   * wsServer.broadcast({ type: 'text', data: 'Hello everyone' });
   * ```
   */
  broadcast(message: WebSocketMessage, excludeConnectionId?: string): number {
    let successCount = 0;

    for (const [id, _connection] of this.connections) {
      if (excludeConnectionId && id === excludeConnectionId) {
        continue;
      }

      if (this.send(id, message)) {
        successCount++;
      }
    }

    return successCount;
  }

  /**
   * 获取连接对象
   * 
   * @param connectionId - 连接 ID
   * @returns 连接对象，如果不存在则返回 undefined
   */
  getConnection(connectionId: string): WebSocketConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * 获取所有连接
   * 
   * @returns 所有连接的数组
   */
  getAllConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * 关闭指定连接
   * 
   * @param connectionId - 连接 ID
   * @param code - 关闭代码（可选）
   * @param reason - 关闭原因（可选）
   */
  closeConnection(connectionId: string, code?: number, reason?: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.socket.close(code || 1000, reason);
    }
  }

  /**
   * 关闭所有连接
   * 
   * @param code - 关闭代码（可选）
   * @param reason - 关闭原因（可选）
   */
  closeAll(code?: number, reason?: string): void {
    for (const connection of this.connections.values()) {
      connection.socket.close(code || 1000, reason);
    }
    this.connections.clear();
    this.stats.connections = 0;
  }

  /**
   * 获取服务器统计信息
   * 
   * @returns 统计信息对象
   */
  getStats(): WebSocketStats {
    return { ...this.stats };
  }

  /**
   * 生成唯一的连接 ID
   * 
   * @returns 连接 ID
   */
  private generateConnectionId(): string {
    this.connectionCounter++;
    return `ws_${Date.now()}_${this.connectionCounter}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 启动心跳检测
   * 
   * @param connectionId - 连接 ID
   */
  private startHeartbeat(connectionId: string): void {
    const timerId = globalThis.setInterval(() => {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        this.stopHeartbeat(connectionId);
        return;
      }

      // 发送 ping 消息
      if (connection.socket.readyState === WebSocket.OPEN) {
        try {
          connection.socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        } catch (error) {
          console.error(`心跳检测失败 (${connectionId}):`, error);
          this.closeConnection(connectionId, 1006, 'Heartbeat failed');
        }
      } else {
        this.stopHeartbeat(connectionId);
      }
    }, this.config.heartbeatInterval);

    this.heartbeatTimers.set(connectionId, timerId);
  }

  /**
   * 停止心跳检测
   * 
   * @param connectionId - 连接 ID
   */
  private stopHeartbeat(connectionId: string): void {
    const timerId = this.heartbeatTimers.get(connectionId);
    if (timerId) {
      globalThis.clearInterval(timerId);
      this.heartbeatTimers.delete(connectionId);
    }
  }
}

