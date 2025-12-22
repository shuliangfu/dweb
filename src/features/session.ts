/**
 * Session 管理模块
 * 提供 Session 的创建、获取、更新、销毁功能
 * 支持多种存储方式：memory、file、kv、mongodb、redis
 */

import type { Session, SessionConfig } from '../types/index.ts';
import { crypto } from '@std/crypto';
import { getDatabase } from './database/access.ts';
import type { MongoDBAdapter } from './database/adapters/mongodb.ts';
import * as path from '@std/path';
import { ensureDir } from '@std/fs/ensure_dir';

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
    // 接口要求 async，但内存操作是同步的
    await Promise.resolve();
    
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
    // 接口要求 async，但内存操作是同步的
    await Promise.resolve();
    
    data.expires = Date.now() + maxAge;
    this.sessions.set(sessionId, data);
  }
  
  async delete(sessionId: string): Promise<void> {
    // 接口要求 async，但内存操作是同步的
    await Promise.resolve();
    
    this.sessions.delete(sessionId);
  }
  
  async clear(): Promise<void> {
    // 接口要求 async，但内存操作是同步的
    await Promise.resolve();
    
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
 * Deno KV Session 存储
 */
class KVSessionStore implements SessionStore {
  private kv: Deno.Kv | null = null;
  private keyPrefix = 'session:';
  private initPromise: Promise<void> | null = null;
  
  constructor() {
    // 异步初始化 KV 数据库
    // 注意：需要 --unstable-kv 标志或 Deno Deploy 环境
    this.initPromise = this.init();
  }
  
  private async init(): Promise<void> {
    try {
      this.kv = await Deno.openKv();
    } catch (error) {
      throw new Error(`Failed to open Deno KV: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null;
    }
  }
  
  private getKey(sessionId: string): string[] {
    return [this.keyPrefix, sessionId];
  }
  
  async get(sessionId: string): Promise<SessionData | null> {
    await this.ensureInitialized();
    
    if (!this.kv) {
      return null;
    }
    
    try {
      const key = this.getKey(sessionId);
      const result = await this.kv.get<SessionData>(key);
      
      if (!result.value) {
        return null;
      }
      
      // 检查是否过期
      if (result.value.expires < Date.now()) {
        await this.delete(sessionId);
        return null;
      }
      
      return result.value;
    } catch (error) {
      console.error('[Session] KV get error:', error);
      return null;
    }
  }
  
  async set(sessionId: string, data: SessionData, maxAge: number): Promise<void> {
    await this.ensureInitialized();
    
    if (!this.kv) {
      throw new Error('KV database not initialized');
    }
    
    try {
      data.expires = Date.now() + maxAge;
      const key = this.getKey(sessionId);
      
      // 使用过期时间作为 TTL（秒）
      const ttlSeconds = Math.floor(maxAge / 1000);
      await this.kv.set(key, data, { expireIn: ttlSeconds * 1000 });
    } catch (error) {
      console.error('[Session] KV set error:', error);
      throw error;
    }
  }
  
  async delete(sessionId: string): Promise<void> {
    await this.ensureInitialized();
    
    if (!this.kv) {
      return;
    }
    
    try {
      const key = this.getKey(sessionId);
      await this.kv.delete(key);
    } catch (error) {
      console.error('[Session] KV delete error:', error);
    }
  }
  
  async clear(): Promise<void> {
    await this.ensureInitialized();
    
    if (!this.kv) {
      return;
    }
    
    try {
      const prefix = [this.keyPrefix];
      const entries = this.kv.list({ prefix });
      
      for await (const entry of entries) {
        await this.kv.delete(entry.key);
      }
    } catch (err) {
      console.error('[Session] KV clear error:', err);
    }
  }
}

/**
 * MongoDB Session 存储
 */
class MongoDBSessionStore implements SessionStore {
  private collectionName: string;
  private db: ReturnType<typeof getDatabase> | null = null;
  
  constructor(collectionName: string = 'sessions') {
    this.collectionName = collectionName;
    try {
      this.db = getDatabase();
    } catch (_error) {
      // 数据库可能未初始化，稍后在 get/set 时再检查
      console.warn('[Session] MongoDB not initialized, will use when available');
    }
  }
  
  private getMongoDBAdapter(): MongoDBAdapter {
    if (!this.db) {
      this.db = getDatabase();
    }
    
    // 检查是否是 MongoDB 适配器
    if (!('getDatabase' in this.db)) {
      throw new Error('Database adapter is not MongoDB. Please configure MongoDB in dweb.config.ts');
    }
    
    return this.db as unknown as MongoDBAdapter;
  }
  
  async get(sessionId: string): Promise<SessionData | null> {
    try {
      const adapter = this.getMongoDBAdapter();
      const db = adapter.getDatabase();
      
      if (!db) {
        return null;
      }
      
      const collection = db.collection(this.collectionName);
      const session = await collection.findOne({ id: sessionId });
      
      if (!session) {
        return null;
      }
      
      // 检查是否过期
      if (session.expires < Date.now()) {
        await this.delete(sessionId);
        return null;
      }
      
      return {
        id: session.id,
        data: session.data,
        expires: session.expires
      };
    } catch (err) {
      console.error('[Session] MongoDB get error:', err);
      return null;
    }
  }
  
  async set(sessionId: string, data: SessionData, maxAge: number): Promise<void> {
    try {
      const adapter = this.getMongoDBAdapter();
      const db = adapter.getDatabase();
      
      if (!db) {
        throw new Error('MongoDB database not available');
      }
      
      data.expires = Date.now() + maxAge;
      const collection = db.collection(this.collectionName);
      
      // 使用 upsert 更新或插入
      await collection.updateOne(
        { id: sessionId },
        { $set: { id: sessionId, data: data.data, expires: data.expires } },
        { upsert: true }
      );
    } catch (error) {
      console.error('[Session] MongoDB set error:', error);
      throw error;
    }
  }
  
  async delete(sessionId: string): Promise<void> {
    try {
      const adapter = this.getMongoDBAdapter();
      const db = adapter.getDatabase();
      
      if (!db) {
        return;
      }
      
      const collection = db.collection(this.collectionName);
      await collection.deleteOne({ id: sessionId });
    } catch (error) {
      console.error('[Session] MongoDB delete error:', error);
    }
  }
  
  async clear(): Promise<void> {
    try {
      const adapter = this.getMongoDBAdapter();
      const db = adapter.getDatabase();
      
      if (!db) {
        return;
      }
      
      const collection = db.collection(this.collectionName);
      await collection.deleteMany({});
    } catch (error) {
      console.error('[Session] MongoDB clear error:', error);
    }
  }
}

/**
 * Redis Session 存储
 */
class RedisSessionStore implements SessionStore {
  private client: any = null; // Redis 客户端
  private config: { host: string; port: number; password?: string; db?: number };
  private keyPrefix = 'session:';
  
  constructor(config: { host: string; port: number; password?: string; db?: number }) {
    this.config = config;
  }
  
  private getKey(sessionId: string): string {
    return `${this.keyPrefix}${sessionId}`;
  }
  
  async connect(): Promise<void> {
    try {
      // 尝试导入 Redis 客户端
      // 注意：需要安装 Redis 客户端库，例如 npm:redis
      // 这里使用动态导入，如果未安装则抛出错误
      // 使用类型断言和字符串拼接避免编译时检查（运行时动态导入）
      const redisSpecifier = 'npm:redis@^4.6.0';
      const redisModule = await import(redisSpecifier) as any;
      const { createClient } = redisModule;
      
      this.client = createClient({
        socket: {
          host: this.config.host,
          port: this.config.port,
        },
        password: this.config.password,
        database: this.config.db || 0,
      });
      
      await this.client.connect();
    } catch (err) {
      throw new Error(
        `Failed to connect to Redis: ${err instanceof Error ? err.message : String(err)}. ` +
        `Please install Redis client: deno add npm:redis@^4.6.0`
      );
    }
  }
  
  async get(sessionId: string): Promise<SessionData | null> {
    if (!this.client) {
      await this.connect();
    }
    
    try {
      const key = this.getKey(sessionId);
      const data = await this.client.get(key);
      
      if (!data) {
        return null;
      }
      
      const sessionData: SessionData = JSON.parse(data);
      
      // 检查是否过期（Redis 会自动处理过期，但这里也检查一下）
      if (sessionData.expires < Date.now()) {
        await this.delete(sessionId);
        return null;
      }
      
      return sessionData;
    } catch (error) {
      console.error('[Session] Redis get error:', error);
      return null;
    }
  }
  
  async set(sessionId: string, data: SessionData, maxAge: number): Promise<void> {
    if (!this.client) {
      await this.connect();
    }
    
    try {
      data.expires = Date.now() + maxAge;
      const key = this.getKey(sessionId);
      const value = JSON.stringify(data);
      
      // 使用 SETEX 设置键值对和过期时间（秒）
      const ttlSeconds = Math.floor(maxAge / 1000);
      await this.client.setEx(key, ttlSeconds, value);
    } catch (error) {
      console.error('[Session] Redis set error:', error);
      throw error;
    }
  }
  
  async delete(sessionId: string): Promise<void> {
    if (!this.client) {
      return;
    }
    
    try {
      const key = this.getKey(sessionId);
      await this.client.del(key);
    } catch (error) {
      console.error('[Session] Redis delete error:', error);
    }
  }
  
  async clear(): Promise<void> {
    if (!this.client) {
      return;
    }
    
    try {
      // 获取所有匹配的键
      const pattern = `${this.keyPrefix}*`;
      const keys = await this.client.keys(pattern);
      
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error('[Session] Redis clear error:', error);
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }
}

/**
 * 文件 Session 存储
 */
class FileSessionStore implements SessionStore {
  private sessionDir: string;
  private cleanupInterval?: number;
  
  constructor(sessionDir: string = '.sessions') {
    this.sessionDir = path.isAbsolute(sessionDir) 
      ? sessionDir 
      : path.join(Deno.cwd(), sessionDir);
    
    // 确保目录存在
    this.init();
    
    // 定期清理过期 Session
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // 每分钟清理一次
  }
  
  private async init(): Promise<void> {
    try {
      await ensureDir(this.sessionDir);
    } catch (error) {
      throw new Error(`Failed to create session directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private getSessionFilePath(sessionId: string): string {
    // 使用 session ID 作为文件名（已包含安全字符）
    return path.join(this.sessionDir, `${sessionId}.json`);
  }
  
  async get(sessionId: string): Promise<SessionData | null> {
    try {
      const filePath = this.getSessionFilePath(sessionId);
      
      // 检查文件是否存在
      try {
        await Deno.stat(filePath);
      } catch {
        return null;
      }
      
      // 读取文件
      const content = await Deno.readTextFile(filePath);
      const sessionData: SessionData = JSON.parse(content);
      
      // 检查是否过期
      if (sessionData.expires < Date.now()) {
        await this.delete(sessionId);
        return null;
      }
      
      return sessionData;
    } catch (error) {
      console.error('[Session] File get error:', error);
      return null;
    }
  }
  
  async set(sessionId: string, data: SessionData, maxAge: number): Promise<void> {
    try {
      data.expires = Date.now() + maxAge;
      const filePath = this.getSessionFilePath(sessionId);
      
      // 确保目录存在
      await ensureDir(this.sessionDir);
      
      // 写入文件
      const content = JSON.stringify(data, null, 2);
      await Deno.writeTextFile(filePath, content);
    } catch (error) {
      console.error('[Session] File set error:', error);
      throw error;
    }
  }
  
  async delete(sessionId: string): Promise<void> {
    try {
      const filePath = this.getSessionFilePath(sessionId);
      await Deno.remove(filePath);
    } catch (error) {
      // 文件不存在时忽略错误
      if (!(error instanceof Deno.errors.NotFound)) {
        console.error('[Session] File delete error:', error);
      }
    }
  }
  
  async clear(): Promise<void> {
    try {
      const entries = Deno.readDir(this.sessionDir);
      for await (const entry of entries) {
        if (entry.isFile && entry.name.endsWith('.json')) {
          const filePath = path.join(this.sessionDir, entry.name);
          try {
            await Deno.remove(filePath);
          } catch (error) {
            console.error(`[Session] Failed to delete session file ${entry.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('[Session] File clear error:', error);
    }
  }
  
  private async cleanup(): Promise<void> {
    try {
      const now = Date.now();
      const entries = Deno.readDir(this.sessionDir);
      
      for await (const entry of entries) {
        if (entry.isFile && entry.name.endsWith('.json')) {
          const filePath = path.join(this.sessionDir, entry.name);
          try {
            const content = await Deno.readTextFile(filePath);
            const sessionData: SessionData = JSON.parse(content);
            
            if (sessionData.expires < now) {
              await Deno.remove(filePath);
            }
          } catch {
            // 忽略读取或解析错误，继续处理下一个文件
          }
        }
      }
    } catch (error) {
      // 忽略清理错误
      console.error('[Session] File cleanup error:', error);
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
      case 'kv': {
        // Deno KV 存储
        try {
          this.store = new KVSessionStore();
        } catch (error) {
          console.warn('[Session] Failed to initialize KV store, falling back to memory:', error);
          this.store = new MemorySessionStore();
        }
        break;
      }
      case 'mongodb': {
        // MongoDB 存储
        const mongoCollection = config.mongodb?.collection || 'sessions';
        this.store = new MongoDBSessionStore(mongoCollection);
        break;
      }
      case 'redis': {
        // Redis 存储
        if (!config.redis) {
          throw new Error('Redis store requires redis configuration (host, port)');
        }
        this.store = new RedisSessionStore(config.redis);
        break;
      }
      case 'file': {
        // 文件存储
        const fileDir = (config as SessionConfig & { file?: { dir?: string } }).file?.dir || '.sessions';
        this.store = new FileSessionStore(fileDir);
        break;
      }
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
    // maxAge 配置单位为秒，转换为毫秒
    const maxAgeMs = (this.config.maxAge || 3600) * 1000;
    const sessionData: SessionData = {
      id: sessionId,
      data,
      expires: Date.now() + maxAgeMs
    };
    
    await this.store.set(sessionId, sessionData, maxAgeMs);
    
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
    // 保存必要的引用，避免在闭包中直接使用 this
    const store = this.store;
    const maxAge = this.config.maxAge || 3600000;
    const generateSessionId = () => this.generateSessionId();
    
    return {
      // 使用 getter 确保 id 始终返回最新的 sessionData.id
      get id() {
        return sessionData.id;
      },
      data: sessionData.data,
      async update(newData: Record<string, unknown>): Promise<void> {
        sessionData.data = { ...sessionData.data, ...newData };
        await store.set(sessionData.id, sessionData, maxAge);
      },
      async destroy(): Promise<void> {
        await store.delete(sessionData.id);
      },
      async regenerate(): Promise<void> {
        const oldId = sessionData.id;
        const newId = generateSessionId();
        sessionData.id = newId;
        await store.set(newId, sessionData, maxAge);
        await store.delete(oldId);
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

