/**
 * Web3 操作辅助类
 * 提供 Web3 相关的操作功能，如钱包连接、合约交互、交易处理等
 */

/**
 * 扩展 Window 接口以支持 ethereum
 */
interface WindowWithEthereum extends Window {
  ethereum?: {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  };
}

declare const window: WindowWithEthereum;

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
  /** 私钥（可选，用于服务端操作） */
  privateKey?: string;
  /** 其他配置选项 */
  [key: string]: unknown;
}

/**
 * 交易选项
 */
export interface TransactionOptions {
  /** 发送方地址 */
  from?: string;
  /** 接收方地址 */
  to: string;
  /** 交易金额（wei） */
  value?: string | bigint;
  /** Gas 限制 */
  gasLimit?: string | bigint;
  /** Gas 价格（wei） */
  gasPrice?: string | bigint;
  /** 最大费用（EIP-1559） */
  maxFeePerGas?: string | bigint;
  /** 优先费用（EIP-1559） */
  maxPriorityFeePerGas?: string | bigint;
  /** 数据 */
  data?: string;
  /** 随机数 */
  nonce?: number;
}

/**
 * 合约调用选项
 */
export interface ContractCallOptions {
  /** 合约地址 */
  address: string;
  /** 函数名 */
  functionName: string;
  /** 函数参数 */
  args?: unknown[];
  /** 调用方地址 */
  from?: string;
  /** 交易金额（wei） */
  value?: string | bigint;
  /** Gas 限制 */
  gasLimit?: string | bigint;
}

/**
 * 合约读取选项
 */
export interface ContractReadOptions {
  /** 合约地址 */
  address: string;
  /** 函数名 */
  functionName: string;
  /** 函数参数 */
  args?: unknown[];
  /** 调用方地址 */
  from?: string;
}

/**
 * Web3 操作类
 * 提供 Web3 相关的操作方法
 */
export class Web3Client {
  private config: Web3Config;
  private provider: unknown = null;
  private signer: unknown = null;

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
    // 重置 provider 和 signer，以便使用新配置
    this.provider = null;
    this.signer = null;
  }

  /**
   * 初始化 Provider（懒加载）
   * @returns Provider 实例
   */
  private async getProvider(): Promise<any> {
    if (this.provider) {
      return this.provider;
    }

    if (!this.config.rpcUrl) {
      throw new Error("RPC URL 未配置，请设置 rpcUrl");
    }

    // 动态导入 ethers（如果可用）
    try {
      const { JsonRpcProvider } = await import("npm:ethers@^6.0.0");
      this.provider = new JsonRpcProvider(this.config.rpcUrl, this.config.chainId);
      return this.provider;
    } catch (error) {
      throw new Error(
        `无法加载 ethers.js，请确保已安装: npm:ethers@^6.0.0。错误: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 初始化 Signer（懒加载）
   * @returns Signer 实例
   */
  private async getSigner(): Promise<any> {
    if (this.signer) {
      return this.signer;
    }

    if (!this.config.privateKey) {
      throw new Error("私钥未配置，请设置 privateKey");
    }

    const provider = await this.getProvider();
    try {
      const { Wallet } = await import("npm:ethers@^6.0.0");
      this.signer = new Wallet(this.config.privateKey, provider);
      return this.signer;
    } catch (error) {
      throw new Error(
        `无法创建 Wallet，请确保已安装: npm:ethers@^6.0.0。错误: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 连接钱包（浏览器环境）
   * @returns 钱包地址数组
   */
  async connectWallet(): Promise<string[]> {
    if (typeof globalThis !== "undefined" && "window" in globalThis) {
      const win = globalThis.window as WindowWithEthereum;
      if (!win.ethereum) {
        throw new Error("未检测到钱包，请安装 MetaMask 或其他 Web3 钱包");
      }

      try {
        const accounts = await win.ethereum.request({
          method: "eth_requestAccounts",
        });
        return accounts as string[];
      } catch (error) {
        throw new Error(
          `连接钱包失败: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    throw new Error("当前环境不支持钱包连接（非浏览器环境）");
  }

  /**
   * 获取当前连接的账户地址
   * @returns 账户地址数组
   */
  async getAccounts(): Promise<string[]> {
    if (typeof globalThis !== "undefined" && "window" in globalThis) {
      const win = globalThis.window as WindowWithEthereum;
      if (!win.ethereum) {
        return [];
      }

      try {
        const accounts = await win.ethereum.request({
          method: "eth_accounts",
        });
        return accounts as string[];
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * 获取账户余额
   * @param address 账户地址
   * @returns 余额（wei，字符串格式）
   */
  async getBalance(address: string): Promise<string> {
    const provider = await this.getProvider();
    try {
      const balance = await (provider as any).getBalance(address);
      return balance.toString();
    } catch (error) {
      throw new Error(
        `获取余额失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 获取账户余额（ETH 单位）
   * @param address 账户地址
   * @returns 余额（ETH）
   */
  async getBalanceInEth(address: string): Promise<string> {
    const balance = await this.getBalance(address);
    try {
      const { formatUnits } = await import("npm:ethers@^6.0.0");
      return formatUnits(balance, 18);
    } catch {
      // 如果 ethers 不可用，手动转换（1 ETH = 10^18 wei）
      const balanceBigInt = BigInt(balance);
      const ethValue = Number(balanceBigInt) / 1e18;
      return ethValue.toString();
    }
  }

  /**
   * 获取交易计数（nonce）
   * @param address 账户地址
   * @returns nonce 值
   */
  async getTransactionCount(address: string): Promise<number> {
    const provider = await this.getProvider();
    try {
      const count = await (provider as { getTransactionCount: (address: string) => Promise<number> }).getTransactionCount(address);
      return count;
    } catch (error) {
      throw new Error(
        `获取交易计数失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 发送交易
   * @param options 交易选项
   * @returns 交易哈希
   */
  async sendTransaction(options: TransactionOptions): Promise<string> {
    const signer = await this.getSigner();
    try {
      const tx = await (signer as { sendTransaction: (tx: TransactionOptions) => Promise<{ hash: string }> }).sendTransaction({
        to: options.to,
        value: options.value,
        data: options.data,
        gasLimit: options.gasLimit,
        gasPrice: options.gasPrice,
        maxFeePerGas: options.maxFeePerGas,
        maxPriorityFeePerGas: options.maxPriorityFeePerGas,
        nonce: options.nonce,
      });
      return tx.hash;
    } catch (error) {
      throw new Error(
        `发送交易失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 等待交易确认
   * @param txHash 交易哈希
   * @param confirmations 确认数（默认 1）
   * @returns 交易收据
   */
  async waitForTransaction(
    txHash: string,
    confirmations: number = 1
  ): Promise<unknown> {
    const provider = await this.getProvider();
    try {
      const receipt = await (provider as { waitForTransaction: (hash: string, confirmations?: number) => Promise<unknown> }).waitForTransaction(txHash, confirmations);
      return receipt;
    } catch (error) {
      throw new Error(
        `等待交易确认失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 调用合约函数（写入操作）
   * @param options 合约调用选项
   * @returns 交易哈希
   */
  async callContract(options: ContractCallOptions): Promise<string> {
    const signer = await this.getSigner();
    try {
      const { Contract } = await import("npm:ethers@^6.0.0");
      const contract = new Contract(
        options.address,
        [`function ${options.functionName}(${options.args?.map(() => "uint256").join(",") || ""})`],
        signer as any
      );
      const tx = await contract[options.functionName](...(options.args || []), {
        value: options.value,
        gasLimit: options.gasLimit,
      });
      return tx.hash;
    } catch (error) {
      throw new Error(
        `调用合约失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 读取合约数据（只读操作）
   * @param options 合约读取选项
   * @returns 函数返回值
   */
  async readContract(options: ContractReadOptions): Promise<unknown> {
    const provider = await this.getProvider();
    try {
      const { Contract } = await import("npm:ethers@^6.0.0");
      const contract = new Contract(
        options.address,
        [`function ${options.functionName}(${options.args?.map(() => "uint256").join(",") || ""}) view returns (uint256)`],
        provider as any
      );
      const result = await contract[options.functionName](...(options.args || []));
      return result;
    } catch (error) {
      throw new Error(
        `读取合约失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 签名消息
   * @param message 要签名的消息
   * @returns 签名结果
   */
  async signMessage(message: string): Promise<string> {
    const signer = await this.getSigner();
    try {
      const signature = await (signer as { signMessage: (message: string) => Promise<string> }).signMessage(message);
      return signature;
    } catch (error) {
      throw new Error(
        `签名消息失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 验证消息签名
   * @param message 原始消息
   * @param signature 签名
   * @param address 签名者地址
   * @returns 是否验证通过
   */
  async verifyMessage(
    message: string,
    signature: string,
    address: string
  ): Promise<boolean> {
    try {
      const { verifyMessage } = await import("npm:ethers@^6.0.0");
      const recoveredAddress = verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      throw new Error(
        `验证签名失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 获取 Gas 价格
   * @returns Gas 价格（wei）
   */
  async getGasPrice(): Promise<string> {
    const provider = await this.getProvider();
    try {
      const feeData = await (provider as { getFeeData: () => Promise<{ gasPrice: bigint | null }> }).getFeeData();
      return feeData.gasPrice?.toString() || "0";
    } catch (error) {
      throw new Error(
        `获取 Gas 价格失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 估算 Gas 消耗
   * @param options 交易选项
   * @returns 估算的 Gas 数量
   */
  async estimateGas(options: TransactionOptions): Promise<string> {
    const provider = await this.getProvider();
    try {
      const gasEstimate = await (provider as { estimateGas: (tx: TransactionOptions) => Promise<bigint> }).estimateGas({
        to: options.to,
        value: options.value,
        data: options.data,
        from: options.from,
      });
      return gasEstimate.toString();
    } catch (error) {
      throw new Error(
        `估算 Gas 失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 获取区块信息
   * @param blockNumber 区块号（可选，默认最新区块）
   * @returns 区块信息
   */
  async getBlock(blockNumber?: number): Promise<unknown> {
    const provider = await this.getProvider();
    try {
      const block = await (provider as { getBlock: (blockNumber?: number) => Promise<unknown> }).getBlock(blockNumber);
      return block;
    } catch (error) {
      throw new Error(
        `获取区块信息失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 获取交易信息
   * @param txHash 交易哈希
   * @returns 交易信息
   */
  async getTransaction(txHash: string): Promise<unknown> {
    const provider = await this.getProvider();
    try {
      const tx = await (provider as { getTransaction: (hash: string) => Promise<unknown> }).getTransaction(txHash);
      return tx;
    } catch (error) {
      throw new Error(
        `获取交易信息失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 获取交易收据
   * @param txHash 交易哈希
   * @returns 交易收据
   */
  async getTransactionReceipt(txHash: string): Promise<unknown> {
    const provider = await this.getProvider();
    try {
      const receipt = await (provider as { getTransactionReceipt: (hash: string) => Promise<unknown> }).getTransactionReceipt(txHash);
      return receipt;
    } catch (error) {
      throw new Error(
        `获取交易收据失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/**
 * 创建 Web3 客户端实例（便捷函数）
 * @param config Web3 配置选项
 * @returns Web3 客户端实例
 */
export function createWeb3Client(config: Web3Config = {}): Web3Client {
  return new Web3Client(config);
}

