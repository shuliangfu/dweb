/**
 * 服务接口模块
 * 定义所有服务必须实现的接口
 * 
 * @module core/iservice
 */

/**
 * 服务接口
 * 所有框架服务都应该实现此接口，以提供统一的生命周期管理
 * 
 * @example
 * ```ts
 * class MyService implements IService {
 *   async initialize(): Promise<void> {
 *     // 初始化逻辑
 *   }
 * 
 *   async start(): Promise<void> {
 *     // 启动逻辑
 *   }
 * 
 *   async stop(): Promise<void> {
 *     // 停止逻辑
 *   }
 * 
 *   async destroy(): Promise<void> {
 *     // 清理逻辑
 *   }
 * 
 *   getName(): string {
 *     return 'MyService';
 *   }
 * }
 * ```
 */
export interface IService {
  /**
   * 服务名称
   * 用于标识和日志记录
   */
  readonly name: string;

  /**
   * 初始化服务
   * 在服务使用前调用，用于设置初始状态
   * 
   * @throws {Error} 如果初始化失败
   * 
   * @example
   * ```ts
   * await service.initialize();
   * ```
   */
  initialize?(): Promise<void> | void;

  /**
   * 启动服务
   * 在应用启动时调用，用于启动服务
   * 
   * @throws {Error} 如果启动失败
   * 
   * @example
   * ```ts
   * await service.start();
   * ```
   */
  start?(): Promise<void> | void;

  /**
   * 停止服务
   * 在应用停止时调用，用于停止服务
   * 
   * @throws {Error} 如果停止失败
   * 
   * @example
   * ```ts
   * await service.stop();
   * ```
   */
  stop?(): Promise<void> | void;

  /**
   * 销毁服务
   * 在应用关闭时调用，用于清理资源
   * 
   * @throws {Error} 如果销毁失败
   * 
   * @example
   * ```ts
   * await service.destroy();
   * ```
   */
  destroy?(): Promise<void> | void;

  /**
   * 获取服务名称
   * 
   * @returns 服务名称
   * 
   * @example
   * ```ts
   * const name = service.getName();
   * console.log(`服务名称: ${name}`);
   * ```
   */
  getName(): string;

  /**
   * 检查服务是否已初始化
   * 
   * @returns 如果服务已初始化返回 true，否则返回 false
   * 
   * @example
   * ```ts
   * if (service.isInitialized()) {
   *   // 服务已初始化
   * }
   * ```
   */
  isInitialized?(): boolean;

  /**
   * 检查服务是否正在运行
   * 
   * @returns 如果服务正在运行返回 true，否则返回 false
   * 
   * @example
   * ```ts
   * if (service.isRunning()) {
   *   // 服务正在运行
   * }
   * ```
   */
  isRunning?(): boolean;
}
