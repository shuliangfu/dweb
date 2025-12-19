/**
 * Session 管理模块
 * 提供 Session 的创建、获取、更新、销毁功能
 */

import type { Session, SessionConfig } from '../types/index.ts';
import { crypto } from '@std/crypto';

/**
 * Session 存储接口
 */
interface SessionStore {
  get(sessionId: string): Promise<SessionData | null>;
  set(sessionId: string, data: SessionData, maxAge: number): Promise<void>;
  delete(sessionId: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Session 数据
 */
interface SessionData {
  id: string;
  data: Record<string, unknown>;
  expires: number;
}

/**
 * 内存 Session 存储
 */
class MemorySessionStore implements SessionStore {
  private sessions: Map<string, SessionData> = new Map();
  private cleanupInterval?: number;
  
  constructor() {
    // 定期清理过期 Session
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // 每分钟清理一次
  }
  
  async get(sessionId: string): Promise<SessionData | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }
    
    // 检查是否过期
    if (session.expires < Date.now()) {
      this.sessions.delete(sessionId);
      return null;
    }
    
    return session;
  }
  
  async set(sessionId: string, data: SessionData, maxAge: number): Promise<void> {
    data.expires = Date.now() + maxAge;
    this.sessions.set(sessionId, data);
  }
  
  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }
  
  async clear(): Promise<void> {
    this.sessions.clear();
  }
  
  private cleanup(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (session.expires < now) {
        this.sessions.delete(id);
      }
    }
  }
  
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

/**
 * Session 管理器
 */
export class SessionManager {
  private store: SessionStore;
  private config: SessionConfig;
  private cookieName: string = 'dweb.session';
  
  constructor(config: SessionConfig) {
    this.config = config;
    
    // 根据配置选择存储方式
    switch (config.store) {
      case 'memory':
        this.store = new MemorySessionStore();
        break;
      case 'file':
        // 文件存储将在后续实现
        this.store = new MemorySessionStore();
        break;
      case 'redis':
        // Redis 存储将在后续实现
        this.store = new MemorySessionStore();
        break;
      default:
        this.store = new MemorySessionStore();
    }
  }
  
  /**
   * 生成 Session ID
   * @returns Session ID
   */
  private generateSessionId(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * 创建 Session
   * @param data Session 数据
   * @returns Session 对象
   */
  async create(data: Record<string, unknown> = {}): Promise<Session> {
    const sessionId = this.generateSessionId();
    const sessionData: SessionData = {
      id: sessionId,
      data,
      expires: Date.now() + (this.config.maxAge || 3600000)
    };
    
    await this.store.set(sessionId, sessionData, this.config.maxAge || 3600000);
    
    return this.createSessionObject(sessionData);
  }
  
  /**
   * 获取 Session
   * @param sessionId Session ID
   * @returns Session 对象或 null
   */
  async get(sessionId: string): Promise<Session | null> {
    const sessionData = await this.store.get(sessionId);
    if (!sessionData) {
      return null;
    }
    
    return this.createSessionObject(sessionData);
  }
  
  /**
   * 创建 Session 对象
   * @param sessionData Session 数据
   * @returns Session 对象
   */
  private createSessionObject(sessionData: SessionData): Session {
    const self = this;
    
    return {
      id: sessionData.id,
      data: sessionData.data,
      async update(newData: Record<string, unknown>): Promise<void> {
        sessionData.data = { ...sessionData.data, ...newData };
        await self.store.set(sessionData.id, sessionData, self.config.maxAge || 3600000);
      },
      async destroy(): Promise<void> {
        await self.store.delete(sessionData.id);
      },
      async regenerate(): Promise<void> {
        const oldId = sessionData.id;
        const newId = self.generateSessionId();
        sessionData.id = newId;
        await self.store.set(newId, sessionData, self.config.maxAge || 3600000);
        await self.store.delete(oldId);
      }
    };
  }
  
  /**
   * 销毁 Session
   * @param sessionId Session ID
   */
  async destroy(sessionId: string): Promise<void> {
    await this.store.delete(sessionId);
  }
  
  /**
   * 获取 Cookie 名称
   * @returns Cookie 名称
   */
  getCookieName(): string {
    return this.cookieName;
  }
}

