/**
 * 服务容器模块
 * 实现依赖注入，管理服务的注册和解析
 *
 * @module core/service-container
 */

/**
 * 服务令牌类型
 * 可以是字符串、符号或类构造函数
 */
export type ServiceToken<T = unknown> = string | symbol | (new () => T);

/**
 * 服务工厂函数类型
 * 接收容器实例，返回服务实例或 Promise
 */
export type ServiceFactory<T> = (container: ServiceContainer) => T | Promise<T>;

/**
 * 服务生命周期
 */
export enum ServiceLifetime {
  /** 单例模式：整个应用生命周期内只有一个实例 */
  Singleton = "singleton",
  /** 瞬态模式：每次请求都创建新实例 */
  Transient = "transient",
  /** 作用域模式：在作用域内单例（如每个请求一个实例） */
  Scoped = "scoped",
}

/**
 * 服务注册信息（内部使用）
 */
interface ServiceRegistration<T> {
  /** 服务令牌 */
  token: ServiceToken<T>;
  /** 服务工厂函数 */
  factory: ServiceFactory<T>;
  /** 服务生命周期 */
  lifetime: ServiceLifetime;
  /** 服务实例（单例模式使用） */
  instance?: T;
}

/**
 * 服务注册配置（用于用户配置服务）
 * 用于在插件中批量注册服务
 *
 * @example
 * ```ts
 * import { ServiceConfig, ServiceLifetime } from '@dreamer/dweb';
 *
 * const services: ServiceConfig[] = [
 *   { name: 'userService', factory: () => new UserService() },
 *   { name: 'orderService', factory: () => new OrderService(), lifetime: ServiceLifetime.Singleton },
 * ];
 * ```
 */
export interface ServiceConfig {
  /** 服务名称（token） */
  name: string;
  /** 服务工厂函数 */
  factory: () => unknown;
  /** 服务生命周期，默认为单例 */
  lifetime?: ServiceLifetime;
}

/**
 * 服务容器
 * 实现依赖注入，管理服务的注册和解析
 *
 * @example
 * ```ts
 * import { ServiceContainer, ServiceLifetime } from "@dreamer/dweb/core/service-container";
 *
 * const container = new ServiceContainer();
 *
 * // 注册单例服务
 * container.registerSingleton('logger', () => new Logger());
 *
 * // 注册瞬态服务
 * container.registerTransient('requestId', () => generateId());
 *
 * // 获取服务
 * const logger = container.get<Logger>('logger');
 * ```
 */
export class ServiceContainer {
  /** 服务注册表 */
  private services = new Map<ServiceToken, ServiceRegistration<unknown>>();
  /** 作用域实例缓存（用于 Scoped 生命周期） */
  private scopedInstances = new Map<ServiceToken, unknown>();

  /**
   * 注册服务（单例模式）
   * 整个应用生命周期内只有一个实例
   *
   * @param token - 服务令牌
   * @param factory - 服务工厂函数
   *
   * @example
   * ```ts
   * container.registerSingleton('logger', () => new Logger());
   * ```
   */
  registerSingleton<T>(
    token: ServiceToken<T>,
    factory: ServiceFactory<T>,
  ): void {
    this.register(token, factory, ServiceLifetime.Singleton);
  }

  /**
   * 注册服务（瞬态模式）
   * 每次获取都创建新实例
   *
   * @param token - 服务令牌
   * @param factory - 服务工厂函数
   *
   * @example
   * ```ts
   * container.registerTransient('requestId', () => generateId());
   * ```
   */
  registerTransient<T>(
    token: ServiceToken<T>,
    factory: ServiceFactory<T>,
  ): void {
    this.register(token, factory, ServiceLifetime.Transient);
  }

  /**
   * 注册服务（作用域模式）
   * 在作用域内单例（如每个请求一个实例）
   *
   * @param token - 服务令牌
   * @param factory - 服务工厂函数
   *
   * @example
   * ```ts
   * container.registerScoped('requestContext', () => new RequestContext());
   * ```
   */
  registerScoped<T>(
    token: ServiceToken<T>,
    factory: ServiceFactory<T>,
  ): void {
    this.register(token, factory, ServiceLifetime.Scoped);
  }

  /**
   * 注册服务（内部方法）
   *
   * @param token - 服务令牌
   * @param factory - 服务工厂函数
   * @param lifetime - 服务生命周期
   */
  private register<T>(
    token: ServiceToken<T>,
    factory: ServiceFactory<T>,
    lifetime: ServiceLifetime,
  ): void {
    this.services.set(token, {
      token,
      factory: factory as ServiceFactory<unknown>,
      lifetime,
    });
  }

  /**
   * 获取服务
   * 根据服务生命周期返回相应的实例
   *
   * @param token - 服务令牌
   * @returns 服务实例
   * @throws {Error} 如果服务未注册
   *
   * @example
   * ```ts
   * const logger = container.get<Logger>('logger');
   * ```
   */
  get<T>(token: ServiceToken<T>): T {
    const registration = this.services.get(token);
    if (!registration) {
      throw new Error(`服务未注册: ${String(token)}`);
    }

    // 单例模式：返回已创建的实例或创建新实例
    if (registration.lifetime === ServiceLifetime.Singleton) {
      if (!registration.instance) {
        const instance = registration.factory(this);
        // 如果工厂函数返回 Promise，需要等待（但这里简化处理，假设是同步的）
        // 实际使用中，单例服务应该在初始化时创建
        registration.instance = instance as T;
      }
      return registration.instance as T;
    }

    // 瞬态模式：每次创建新实例
    if (registration.lifetime === ServiceLifetime.Transient) {
      return registration.factory(this) as T;
    }

    // 作用域模式：在作用域内单例
    if (registration.lifetime === ServiceLifetime.Scoped) {
      if (!this.scopedInstances.has(token)) {
        this.scopedInstances.set(token, registration.factory(this));
      }
      return this.scopedInstances.get(token) as T;
    }

    throw new Error(`不支持的服务生命周期: ${registration.lifetime}`);
  }

  /**
   * 检查服务是否已注册
   *
   * @param token - 服务令牌
   * @returns 如果服务已注册返回 true，否则返回 false
   *
   * @example
   * ```ts
   * if (container.has('logger')) {
   *   const logger = container.get<Logger>('logger');
   * }
   * ```
   */
  has(token: ServiceToken): boolean {
    return this.services.has(token);
  }

  /**
   * 清除作用域实例
   * 用于请求结束后清理作用域内的服务实例
   *
   * @example
   * ```ts
   * // 在请求处理完成后调用
   * container.clearScope();
   * ```
   */
  clearScope(): void {
    this.scopedInstances.clear();
  }

  /**
   * 获取所有已注册的服务令牌
   *
   * @returns 服务令牌数组
   */
  getRegisteredTokens(): ServiceToken[] {
    return Array.from(this.services.keys());
  }
}
