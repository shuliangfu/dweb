/**
 * Web3 操作辅助类
 * 提供 Web3 相关的操作功能，如钱包连接、合约交互、交易处理等
 */

/**
 * Web3 配置选项
 */
export interface Web3Config {
  /** RPC 节点 URL */
  rpcUrl?: string;
  /** 链 ID */
  chainId?: number;
  /** 网络名称 */
  network?: string;
  /** 其他配置选项 */
  [key: string]: unknown;
}

/**
 * Web3 操作类
 * 提供 Web3 相关的操作方法
 */
export class Web3Client {
  private config: Web3Config;

  /**
   * 创建 Web3 客户端实例
   * @param config Web3 配置选项
   */
  constructor(config: Web3Config = {}) {
    this.config = config;
  }

  /**
   * 获取配置
   * @returns 当前配置
   */
  getConfig(): Web3Config {
    return { ...this.config };
  }

  /**
   * 更新配置
   * @param config 新的配置选项
   */
  updateConfig(config: Partial<Web3Config>): void {
    this.config = { ...this.config, ...config };
  }

  // TODO: 在这里添加你的 Web3 操作方法
  // 例如：
  // - connectWallet()
  // - getBalance()
  // - sendTransaction()
  // - callContract()
  // 等等
}

/**
 * 创建 Web3 客户端实例（便捷函数）
 * @param config Web3 配置选项
 * @returns Web3 客户端实例
 */
export function createWeb3Client(config: Web3Config = {}): Web3Client {
  return new Web3Client(config);
}

