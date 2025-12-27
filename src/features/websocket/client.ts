/**
 * WebSocket 客户端实现
 *
 * 提供 WebSocket 客户端连接、消息发送接收、自动重连等功能。
 *
 * @module features/websocket/client
 */

/**
 * WebSocket 客户端事件类型
 */
export type WebSocketClientEventType = "open" | "message" | "error" | "close";

/**
 * WebSocket 客户端事件处理器
 */
export interface WebSocketClientHandlers {
  /** 连接建立时调用 */
  onOpen?: (event: Event) => void | Promise<void>;
  /** 收到消息时调用 */
  onMessage?: (event: MessageEvent) => void | Promise<void>;
  /** 连接错误时调用 */
  onError?: (event: Event) => void | Promise<void>;
  /** 连接关闭时调用 */
  onClose?: (event: CloseEvent) => void | Promise<void>;
}

/**
 * WebSocket 客户端配置
 */
export interface WebSocketClientConfig {
  /** WebSocket 服务器 URL */
  url: string;
  /** 协议列表（可选） */
  protocols?: string | string[];
  /** 是否自动重连（默认: true） */
  autoReconnect?: boolean;
  /** 重连延迟（毫秒，默认: 1000） */
  reconnectDelay?: number;
  /** 最大重连次数（默认: Infinity，无限重连） */
  maxReconnectAttempts?: number;
  /** 是否启用心跳检测（默认: false） */
  heartbeat?: boolean;
  /** 心跳间隔（毫秒，默认: 30000） */
  heartbeatInterval?: number;
  /** 心跳超时时间（毫秒，默认: 10000） */
  heartbeatTimeout?: number;
  /** 事件处理器 */
  handlers?: WebSocketClientHandlers;
}

/**
 * WebSocket 客户端状态
 */
export type WebSocketClientState = "connecting" | "open" | "closing" | "closed";

/**
 * WebSocket 客户端类
 *
 * 提供 WebSocket 客户端功能，支持自动重连、心跳检测等。
 *
 * @example
 * ```typescript
 * import { WebSocketClient } from '@dreamer/dweb';
 *
 * const client = new WebSocketClient({
 *   url: 'ws://localhost:3000/ws',
 *   autoReconnect: true,
 *   handlers: {
 *     onOpen: () => console.log('连接已建立'),
 *     onMessage: (event) => console.log('收到消息:', event.data),
 *     onClose: () => console.log('连接已关闭'),
 *   },
 * });
 *
 * await client.connect();
 * client.send('Hello Server');
 * ```
 */
export class WebSocketClient {
  private config: Required<Omit<WebSocketClientConfig, "url" | "protocols">> & {
    url: string;
    protocols?: string | string[];
  };
  private socket: WebSocket | null = null;
  private state: WebSocketClientState = "closed";
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private heartbeatTimeoutTimer: number | null = null;
  private lastHeartbeatTime = 0;

  /**
   * 创建 WebSocket 客户端实例
   *
   * @param config - 客户端配置
   */
  constructor(config: WebSocketClientConfig) {
    if (!config.url) {
      throw new Error("WebSocket URL is required");
    }

    this.config = {
      url: config.url,
      protocols: config.protocols,
      autoReconnect: config.autoReconnect !== false,
      reconnectDelay: config.reconnectDelay || 1000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? Infinity,
      heartbeat: config.heartbeat || false,
      heartbeatInterval: config.heartbeatInterval || 30000,
      heartbeatTimeout: config.heartbeatTimeout || 10000,
      handlers: config.handlers || {},
    };
  }

  /**
   * 连接到 WebSocket 服务器
   *
   * @returns Promise<void> - 连接建立后 resolve
   *
   * @example
   * ```typescript
   * await client.connect();
   * ```
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state === "open" || this.state === "connecting") {
        resolve();
        return;
      }

      this.state = "connecting";

      try {
        // 创建 WebSocket 连接
        this.socket = new WebSocket(this.config.url, this.config.protocols);

        // 设置事件处理器
        this.setupEventHandlers(resolve, reject);

        // 设置超时
        const timeout = globalThis.setTimeout(() => {
          if (this.state === "connecting") {
            this.socket?.close();
            reject(new Error("WebSocket connection timeout"));
          }
        }, 10000); // 10 秒超时

        // 连接成功后清除超时
        this.socket.addEventListener("open", () => {
          globalThis.clearTimeout(timeout);
        }, { once: true });
      } catch (error) {
        this.state = "closed";
        reject(error);
      }
    });
  }

  /**
   * 设置 WebSocket 事件处理器
   *
   * @param resolve - Promise resolve 函数
   * @param reject - Promise reject 函数
   */
  private setupEventHandlers(
    resolve: () => void,
    reject: (error: Error) => void,
  ): void {
    if (!this.socket) {
      return;
    }

    // 连接建立
    this.socket.onopen = (event) => {
      this.state = "open";
      this.reconnectAttempts = 0;

      // 启动心跳检测
      if (this.config.heartbeat) {
        this.startHeartbeat();
      }

      // 调用用户处理器
      if (this.config.handlers.onOpen) {
        Promise.resolve(this.config.handlers.onOpen(event)).catch((error) => {
          console.error("WebSocket onOpen 回调错误:", error);
        });
      }

      resolve();
    };

    // 收到消息
    this.socket.onmessage = (event) => {
      // 处理心跳响应
      if (this.config.heartbeat) {
        try {
          const data = typeof event.data === "string"
            ? JSON.parse(event.data)
            : event.data;
          if (data && data.type === "pong") {
            this.lastHeartbeatTime = Date.now();
            if (this.heartbeatTimeoutTimer) {
              globalThis.clearTimeout(this.heartbeatTimeoutTimer);
              this.heartbeatTimeoutTimer = null;
            }
            return;
          }
        } catch {
          // 不是 JSON 消息，继续处理
        }
      }

      // 调用用户处理器
      if (this.config.handlers.onMessage) {
        Promise.resolve(this.config.handlers.onMessage(event)).catch(
          (error) => {
            console.error("WebSocket onMessage 回调错误:", error);
          },
        );
      }
    };

    // 连接错误
    this.socket.onerror = (event) => {
      // 调用用户处理器
      if (this.config.handlers.onError) {
        Promise.resolve(this.config.handlers.onError(event)).catch((error) => {
          console.error("WebSocket onError 回调错误:", error);
        });
      }

      // 如果不是手动关闭，触发 reject
      if (this.state === "connecting") {
        reject(new Error("WebSocket connection failed"));
      }
    };

    // 连接关闭
    this.socket.onclose = (event) => {
      this.state = "closed";
      this.stopHeartbeat();

      // 调用用户处理器
      if (this.config.handlers.onClose) {
        Promise.resolve(this.config.handlers.onClose(event)).catch((error) => {
          console.error("WebSocket onClose 回调错误:", error);
        });
      }

      // 自动重连
      if (this.config.autoReconnect && !event.wasClean) {
        this.scheduleReconnect();
      }
    };
  }

  /**
   * 发送消息
   *
   * @param data - 要发送的数据（字符串、ArrayBuffer 或 Blob）
   * @returns 是否发送成功
   *
   * @example
   * ```typescript
   * client.send('Hello Server');
   * client.send(JSON.stringify({ type: 'message', data: 'Hello' }));
   * ```
   */
  send(data: string | ArrayBuffer | Blob): boolean {
    if (!this.socket || this.state !== "open") {
      console.warn("WebSocket is not connected");
      return false;
    }

    try {
      this.socket.send(data);
      return true;
    } catch (error) {
      console.error("WebSocket send error:", error);
      return false;
    }
  }

  /**
   * 发送 JSON 消息
   *
   * @param data - 要发送的对象
   * @returns 是否发送成功
   *
   * @example
   * ```typescript
   * client.sendJSON({ type: 'message', data: 'Hello' });
   * ```
   */
  sendJSON(data: unknown): boolean {
    try {
      return this.send(JSON.stringify(data));
    } catch (error) {
      console.error("WebSocket sendJSON error:", error);
      return false;
    }
  }

  /**
   * 关闭连接
   *
   * @param code - 关闭代码（可选）
   * @param reason - 关闭原因（可选）
   *
   * @example
   * ```typescript
   * client.close(1000, 'Normal closure');
   * ```
   */
  close(code?: number, reason?: string): void {
    this.config.autoReconnect = false; // 禁用自动重连
    this.stopHeartbeat();
    this.cancelReconnect();

    if (this.socket) {
      this.state = "closing";
      this.socket.close(code || 1000, reason);
    }
  }

  /**
   * 获取当前连接状态
   *
   * @returns 连接状态
   */
  getState(): WebSocketClientState {
    return this.state;
  }

  /**
   * 检查是否已连接
   *
   * @returns 如果已连接返回 true
   */
  isConnected(): boolean {
    return this.state === "open" && this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return; // 已经安排了重连
    }

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.warn("WebSocket max reconnect attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay *
      Math.min(this.reconnectAttempts, 10); // 指数退避，最多 10 倍

    this.reconnectTimer = globalThis.setTimeout(() => {
      this.reconnectTimer = null;
      console.log(
        `WebSocket reconnecting (attempt ${this.reconnectAttempts})...`,
      );
      this.connect().catch((error) => {
        console.error("WebSocket reconnect failed:", error);
      });
    }, delay);
  }

  /**
   * 取消重连
   */
  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      globalThis.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * 启动心跳检测
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.lastHeartbeatTime = Date.now();

    this.heartbeatTimer = globalThis.setInterval(() => {
      if (this.isConnected()) {
        // 发送 ping
        this.sendJSON({ type: "ping", timestamp: Date.now() });

        // 设置超时检测
        this.heartbeatTimeoutTimer = globalThis.setTimeout(() => {
          const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeatTime;
          if (timeSinceLastHeartbeat > this.config.heartbeatTimeout) {
            console.warn("WebSocket heartbeat timeout, reconnecting...");
            this.socket?.close();
          }
        }, this.config.heartbeatTimeout);
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * 停止心跳检测
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      globalThis.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.heartbeatTimeoutTimer) {
      globalThis.clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }
}
