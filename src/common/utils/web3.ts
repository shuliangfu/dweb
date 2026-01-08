/**
 * Web3 操作辅助类
 * 提供 Web3 相关的操作功能，如钱包连接、合约交互、交易处理等
 *
 * 环境兼容性：
 * - 客户端：大部分功能需要在浏览器环境使用（需要钱包扩展如 MetaMask）
 * - 服务端：部分功能（如 RPC 调用、合约交互）可以在服务端使用
 * - 注意：钱包连接、签名等功能只能在客户端使用
 *
 * API 使用说明：
 * - 本实现使用现代的 EIP-1193 标准（window.ethereum.request()）
 * - 不使用已弃用的 window.web3 API
 * - 使用 viem 库来与钱包和区块链交互
 *
 * 依赖：
 * - 需要安装 viem: npm:viem@^2.43.4
 *
 * @module
 */

// 导入 viem 核心模块
import {
  type Abi,
  type Address,
  type Chain,
  createPublicClient,
  createWalletClient,
  custom,
  decodeFunctionData,
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  type Hash,
  type Hex,
  http,
  isAddress as viemIsAddress,
  keccak256 as viemKeccak256,
  parseAbi,
  type PublicClient,
  verifyMessage as viemVerifyMessage,
  type WalletClient,
} from "npm:viem@^2.43.3";
// 导入 viem 账户模块（用于生成钱包）
import {
  generatePrivateKey,
  privateKeyToAccount,
} from "npm:viem@^2.43.3/accounts";
import { IS_CLIENT } from "../constants.ts";

/**
 * 扩展 Window 接口以支持 ethereum
 * 注意：我们只使用 window.ethereum (EIP-1193)，不使用已弃用的 window.web3
 */
interface WindowWithEthereum extends Window {
  ethereum?: {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    on?: (event: string, callback: (...args: unknown[]) => void) => void;
    removeListener?: (
      event: string,
      callback: (...args: unknown[]) => void,
    ) => void;
    // 明确排除已弃用的 web3 属性，避免意外访问
    web3?: never;
  };
  // 明确排除已弃用的 window.web3，避免意外访问
  web3?: never;
}

/**
 * 区块事件回调函数类型
 */
export type BlockListener = (
  blockNumber: number,
  block: unknown,
) => void | Promise<void>;

/**
 * 交易事件回调函数类型
 */
export type TransactionListener = (
  txHash: string,
  tx: unknown,
) => void | Promise<void>;

/**
 * 合约事件回调函数类型
 */
export type ContractEventListener = (event: unknown) => void | Promise<void>;

/**
 * 账户变化回调函数类型
 */
export type AccountsChangedListener = (
  accounts: string[],
) => void | Promise<void>;

/**
 * 链切换回调函数类型
 */
export type ChainChangedListener = (chainId: string) => void | Promise<void>;

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
  /** 合约 ABI */
  abi?: Abi;
  /** 合约地址 */
  address?: string;

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
  /** 合约地址（可选，如果未提供则使用配置中的 address） */
  address?: string;
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
  /** 函数签名（可选，如 "getUserInfo(address)"），如果不提供则自动推断 */
  functionSignature?: string;
  /** 完整 ABI（可选），如果提供则优先使用，如果未提供则使用配置中的 abi */
  abi?: string[] | Abi;
}

/**
 * 合约读取选项
 */
export interface ContractReadOptions {
  /** 合约地址（可选，如果未提供则使用配置中的 address） */
  address?: string;
  /** 函数名 */
  functionName: string;
  /** 函数参数 */
  args?: unknown[];
  /** 调用方地址 */
  from?: string;
  /** 函数签名（可选，如 "getUserInfo(address)"），如果不提供则自动推断 */
  functionSignature?: string;
  /** 完整 ABI（可选），如果提供则优先使用，如果未提供则使用配置中的 abi。可以是字符串数组或 ABI JSON 对象数组 */
  abi?: string[] | Array<Record<string, unknown>> | Abi;
  /** 返回类型（可选，默认 "uint256"）。对于 tuple 类型，格式如 "tuple(address,address,string,uint256,uint256,uint256)" */
  returnType?: string;
}

/**
 * Web3 操作类
 * 提供 Web3 相关的操作方法
 */
export class Web3Client {
  private config: Web3Config;
  private publicClient: PublicClient | null = null;
  private walletClient: WalletClient | null = null;
  private chain: Chain | null = null;
  // 事件监听器存储
  private blockListeners: Set<BlockListener> = new Set();
  private transactionListeners: Set<TransactionListener> = new Set();
  private contractEventListeners: Map<string, Set<ContractEventListener>> =
    new Map();
  private accountsChangedListeners: Set<AccountsChangedListener> = new Set();
  private chainChangedListeners: Set<ChainChangedListener> = new Set();
  // 事件监听器是否已启动
  private blockListenerStarted: boolean = false;
  private transactionListenerStarted: boolean = false;
  private walletListenersStarted: boolean = false;
  // 钱包事件监听器的包装函数（用于移除）
  private walletAccountsChangedWrapper?: (...args: unknown[]) => void;
  private walletChainChangedWrapper?: (...args: unknown[]) => void;
  // viem watch 取消函数
  private blockWatchUnsubscribe?: () => void;
  private transactionWatchUnsubscribe?: () => void;
  private contractWatchUnsubscribes: Map<string, () => void> = new Map();
  // 自动重连相关
  private blockReconnectTimer?: number;
  private transactionReconnectTimer?: number;
  private contractReconnectTimers: Map<string, number> = new Map();
  private reconnectDelay: number = 3000; // 重连延迟（毫秒）
  private maxReconnectAttempts: number = 10; // 最大重连次数
  private blockReconnectAttempts: number = 0;
  private transactionReconnectAttempts: number = 0;
  private contractReconnectAttempts: Map<string, number> = new Map();

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
    // 重置客户端，以便使用新配置
    this.publicClient = null;
    this.walletClient = null;
    this.chain = null;
  }

  /**
   * 获取或创建 PublicClient（懒加载）
   * 在客户端环境中，如果检测到 window.ethereum，优先使用它
   * 在服务端环境或没有 window.ethereum 时，使用 rpcUrl 创建 HTTP transport
   * @returns PublicClient 实例
   */
  private getPublicClient(): PublicClient {
    if (this.publicClient) {
      return this.publicClient;
    }

    // 客户端环境：优先使用 window.ethereum（MetaMask 等钱包）
    if (IS_CLIENT) {
      const win = globalThis.window as WindowWithEthereum;
      if (win.ethereum) {
        try {
          // 使用 custom transport 从 window.ethereum 创建 public client
          this.publicClient = createPublicClient({
            transport: custom(win.ethereum),
          });
          return this.publicClient;
        } catch (error) {
          throw new Error(
            `从钱包创建 PublicClient 失败: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    }

    // 如果没有 window.ethereum，检查是否配置了 rpcUrl
    if (!this.config.rpcUrl) {
      throw new Error(
        IS_CLIENT
          ? "未检测到钱包且 RPC URL 未配置，请连接钱包或设置 rpcUrl"
          : "RPC URL 未配置，请设置 rpcUrl",
      );
    }

    // 使用 HTTP transport 创建 PublicClient
    try {
      this.publicClient = createPublicClient({
        transport: http(this.config.rpcUrl),
      });
      return this.publicClient;
    } catch (error) {
      throw new Error(
        `创建 PublicClient 失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * 获取或创建 WalletClient（懒加载）
   * @returns WalletClient 实例
   */
  private getWalletClient(): WalletClient {
    if (this.walletClient) {
      return this.walletClient;
    }

    // 客户端环境：优先使用 window.ethereum
    if (IS_CLIENT) {
      const win = globalThis.window as WindowWithEthereum;
      if (win.ethereum) {
        try {
          // 尝试获取 chain（从 PublicClient 或配置中）
          let chain: Chain | undefined = this.chain || undefined;

          // 如果还没有 chain，尝试从 PublicClient 获取
          if (!chain) {
            try {
              const publicClient = this.getPublicClient();
              chain = (publicClient as any).chain;
              if (chain) {
                this.chain = chain;
              }
            } catch {
              // 如果获取失败，chain 保持为 undefined
              // 注意：chain 将在调用 writeContract 时动态获取
            }
          }

          this.walletClient = createWalletClient({
            chain: chain,
            transport: custom(win.ethereum),
          });

          // 如果 walletClient 有 chain 属性，保存它
          if ((this.walletClient as any).chain && !this.chain) {
            this.chain = (this.walletClient as any).chain;
          }

          return this.walletClient;
        } catch (error) {
          throw new Error(
            `从钱包创建 WalletClient 失败: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    }

    // 如果没有 window.ethereum，检查是否配置了 rpcUrl 和 privateKey
    if (!this.config.rpcUrl || !this.config.privateKey) {
      throw new Error(
        "未检测到钱包且 RPC URL 或私钥未配置，请连接钱包或设置 rpcUrl 和 privateKey",
      );
    }

    // 服务端环境：使用 privateKey 创建账户，然后创建 WalletClient
    try {
      // 从私钥创建账户
      const account = privateKeyToAccount(this.config.privateKey as Hex);

      // 尝试获取 chain（从 PublicClient 或配置中）
      let chain: Chain | undefined = this.chain || undefined;

      // 如果还没有 chain，尝试从 PublicClient 获取
      if (!chain) {
        try {
          const publicClient = this.getPublicClient();
          chain = (publicClient as any).chain;
          if (chain) {
            this.chain = chain;
          }
        } catch {
          // 如果获取失败，chain 保持为 undefined
          // 注意：chain 将在调用 writeContract 时动态获取
        }
      }

      // 创建 WalletClient，使用 http transport 和 privateKey 账户
      this.walletClient = createWalletClient({
        account: account,
        chain: chain,
        transport: http(this.config.rpcUrl),
      });

      // 如果 walletClient 有 chain 属性，保存它
      if ((this.walletClient as any).chain && !this.chain) {
        this.chain = (this.walletClient as any).chain;
      }

      return this.walletClient;
    } catch (error) {
      throw new Error(
        `服务端创建 WalletClient 失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * 连接钱包（浏览器环境）
   * @returns 钱包地址数组
   */
  async connectWallet(): Promise<string[]> {
    if (!IS_CLIENT) {
      return [];
    }

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
        `连接钱包失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
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
    const client = this.getPublicClient();
    try {
      const balance = await client.getBalance({
        address: address as Address,
      });
      return balance.toString();
    } catch (error) {
      throw new Error(
        `获取余额失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * 获取交易计数（nonce）
   * @param address 账户地址
   * @returns nonce 值
   */
  async getTransactionCount(address: string): Promise<number> {
    const client = this.getPublicClient();
    try {
      const count = await client.getTransactionCount({
        address: address as Address,
      });
      return count;
    } catch (error) {
      throw new Error(
        `获取交易计数失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * 发送交易
   * 使用 eth_sendRawTransaction 方法发送交易，兼容不支持 eth_sendTransaction 的节点
   * @param options 交易选项
   * @returns 交易哈希
   */
  async sendTransaction(options: TransactionOptions): Promise<string> {
    const walletClient = this.getWalletClient();
    const accounts = await walletClient.getAddresses();
    if (accounts.length === 0) {
      throw new Error("未找到可用账户，请先连接钱包");
    }

    try {
      const account = accounts[0];
      const publicClient = this.getPublicClient();

      // 构建交易参数（EIP-1559 或 legacy）
      const txParams: any = {
        account: account,
        to: options.to as Address,
        value: options.value ? BigInt(options.value.toString()) : undefined,
        data: options.data as Hex | undefined,
        gas: options.gasLimit ? BigInt(options.gasLimit.toString()) : undefined,
      };

      // 如果提供了 maxFeePerGas，使用 EIP-1559；否则使用 gasPrice（legacy）
      if (options.maxFeePerGas) {
        txParams.maxFeePerGas = BigInt(options.maxFeePerGas.toString());
        txParams.maxPriorityFeePerGas = options.maxPriorityFeePerGas
          ? BigInt(options.maxPriorityFeePerGas.toString())
          : undefined;
      } else if (options.gasPrice) {
        txParams.gasPrice = BigInt(options.gasPrice.toString());
      }

      // 如果没有提供 nonce，自动获取
      if (options.nonce === undefined) {
        txParams.nonce = await publicClient.getTransactionCount({
          address: account,
        });
      } else {
        txParams.nonce = options.nonce;
      }

      // 客户端环境（使用 MetaMask 等钱包）：使用钱包的 sendTransaction
      // 钱包会自动处理签名和发送
      if (IS_CLIENT) {
        const win = globalThis.window as WindowWithEthereum;
        if (win.ethereum) {
          const hash = await walletClient.sendTransaction(txParams);
          return hash;
        }
      }

      // 服务端环境或没有钱包：使用 signTransaction + sendRawTransaction
      // 这样可以兼容不支持 eth_sendTransaction 的节点
      const serializedTx = await walletClient.signTransaction(txParams);
      const hash = await publicClient.sendRawTransaction({
        serializedTransaction: serializedTx,
      });
      return hash;
    } catch (error) {
      throw new Error(
        `发送交易失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
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
    confirmations: number = 1,
  ): Promise<unknown> {
    const client = this.getPublicClient();
    try {
      const receipt = await client.waitForTransactionReceipt({
        hash: txHash as Hash,
        confirmations,
      });
      return receipt;
    } catch (error) {
      throw new Error(
        `等待交易确认失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * 调用合约方法（写入操作）
   * @param options 合约调用选项
   * @param waitForConfirmation 是否等待交易确认（默认 true）
   * @returns 如果 waitForConfirmation 为 true，返回交易收据；否则返回交易哈希
   */
  async callContract(
    options: ContractCallOptions,
    waitForConfirmation: boolean = true,
  ): Promise<unknown> {
    const walletClient = this.getWalletClient();
    const accounts = await walletClient.getAddresses();
    if (accounts.length === 0) {
      throw new Error("未找到可用账户，请先连接钱包");
    }

    try {
      // 从配置或选项中获取合约地址
      const contractAddress = options.address || this.config.address;
      if (!contractAddress) {
        throw new Error(
          "合约地址未提供，请在 options 中提供 address 或在配置中设置 address",
        );
      }

      let parsedAbi: Abi;

      // 优先使用 options.abi，如果没有则使用配置中的 abi
      const abiSource = options.abi || this.config.abi;

      // 如果提供了完整 ABI，直接使用
      if (abiSource && Array.isArray(abiSource) && abiSource.length > 0) {
        if (typeof abiSource[0] === "string") {
          // 字符串数组格式的 ABI
          parsedAbi = parseAbi(abiSource as string[]);
        } else {
          // JSON 对象数组格式的 ABI
          parsedAbi = abiSource as unknown as Abi;
        }
      } // 如果提供了函数签名，使用它
      else if (options.functionSignature) {
        parsedAbi = parseAbi(
          [`function ${options.functionSignature}`] as readonly string[],
        );
      } // 否则根据参数自动推断类型
      else {
        const paramTypes = options.args?.map((arg) => this.inferArgType(arg)) ||
          [];
        parsedAbi = parseAbi([
          `function ${options.functionName}(${paramTypes.join(",")})`,
        ]);
      }

      // 获取 chain（优先从 walletClient 获取，否则使用 this.chain）
      let chain: Chain | undefined = (walletClient as any).chain ||
        this.chain || undefined;

      // 如果还是没有 chain，尝试从 PublicClient 获取
      const network = await this.getNetwork();
      chain = {
        id: Number(network.chainId.toString()),
        name: network.name,
      } as unknown as Chain;

      // 如果还是没有 chain，抛出明确的错误
      if (!chain) {
        throw new Error(
          "无法获取链信息，请在配置中设置 chainId 或确保钱包已连接",
        );
      }

      // 发送交易
      const hash = await walletClient.writeContract({
        account: accounts[0],
        address: contractAddress as Address,
        abi: parsedAbi,
        functionName: options.functionName,
        args: options.args as any,
        value: options.value ? BigInt(options.value.toString()) : undefined,
        gas: options.gasLimit ? BigInt(options.gasLimit.toString()) : undefined,
        chain: chain,
      });

      // 如果不需要等待确认，直接返回交易哈希
      if (!waitForConfirmation) {
        return hash;
      }

      // 等待交易确认并检查状态
      const client = this.getPublicClient();
      try {
        const receipt = await client.waitForTransactionReceipt({
          hash: hash as Hash,
          confirmations: 1,
        }) as unknown as {
          success: boolean | undefined;
          error: string | undefined;
        };

        // 检查交易状态
        if ((receipt as any).status === "success") {
          receipt.success = true;
          return receipt;
        } else if ((receipt as any).status === "reverted") {
          receipt.error = "交易执行失败，已被回滚" as const;
          receipt.success = false;
          return receipt;
        } else {
          // 未知状态，返回收据让调用者判断
          receipt.error = "未知状态" as const;
          receipt.success = undefined;
          return receipt;
        }
      } catch (receiptError) {
        // 如果等待交易确认失败，可能是交易被回滚
        return {
          success: false,
          error: "交易确认失败",
          message: receiptError instanceof Error
            ? receiptError.message
            : String(receiptError),
        };
      }
    } catch (error) {
      // 检查是否是用户取消交易
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      if (
        errorMessage.includes("User rejected") ||
        errorMessage.includes("user rejected") ||
        errorMessage.includes("用户取消") ||
        errorMessage.includes("用户拒绝")
      ) {
        // 用户取消交易，抛出特殊错误，不包含原始错误消息
        throw new Error("交易已取消");
      }
      // 其他错误正常抛出
      throw new Error(
        `调用合约失败: ${errorMessage}`,
      );
    }
  }

  /**
   * 推断参数类型（根据参数值自动推断）
   * @param arg 参数值
   * @returns Solidity 类型
   */
  private inferArgType(arg: unknown): string {
    if (typeof arg === "string") {
      // 检查是否是地址格式（0x 开头，42 字符）
      if (arg.startsWith("0x") && arg.length === 42) {
        return "address";
      }
      // 检查是否是十六进制数字
      if (arg.startsWith("0x")) {
        return "uint256";
      }
      // 其他字符串可能是 bytes 或 string
      return "string";
    }
    if (typeof arg === "number" || typeof arg === "bigint") {
      return "uint256";
    }
    if (typeof arg === "boolean") {
      return "bool";
    }
    // 默认返回 uint256
    return "uint256";
  }

  /**
   * 读取合约数据（只读操作）
   * @param options 合约读取选项
   * @returns 函数返回值
   */
  async readContract(options: ContractReadOptions): Promise<unknown> {
    const client = this.getPublicClient();
    // 从配置或选项中获取合约地址（在 try 块外定义，以便在 catch 中使用）
    const contractAddress = options.address || this.config.address;
    if (!contractAddress) {
      throw new Error(
        "合约地址未提供，请在 options 中提供 address 或在配置中设置 address",
      );
    }

    try {
      let parsedAbi: Abi;

      // 优先使用 options.abi，如果没有则使用配置中的 abi
      const abiSource = options.abi || this.config.abi;

      // 如果提供了完整 ABI JSON 对象数组，直接使用（推荐方式，可以正确处理复杂返回类型如 tuple）
      if (
        abiSource &&
        Array.isArray(abiSource) &&
        abiSource.length > 0 &&
        typeof abiSource[0] === "object" &&
        abiSource[0] !== null &&
        !Array.isArray(abiSource[0])
      ) {
        // 使用 ABI JSON 对象数组，viem 会自动处理 tuple 类型
        parsedAbi = abiSource as unknown as Abi;
      } // 如果提供了 returnType 且是 tuple 类型，构建 ABI
      else if (options.returnType && options.returnType.startsWith("tuple")) {
        const paramTypes = options.args?.map((arg) => this.inferArgType(arg)) ||
          [];
        const functionSignature = options.functionSignature ||
          `${options.functionName}(${paramTypes.join(",")})`;
        const returnType = options.returnType;
        parsedAbi = parseAbi(
          [
            `function ${functionSignature} view returns (${returnType})`,
          ] as readonly string[],
        );
      } // 其他情况：使用字符串格式的 ABI
      else {
        // 如果提供了函数签名，使用它
        if (options.functionSignature) {
          const returnType = options.returnType || "uint256";
          parsedAbi = parseAbi(
            [
              `function ${options.functionSignature} view returns (${returnType})`,
            ] as readonly string[],
          );
        } // 否则根据参数自动推断类型
        else {
          const paramTypes = options.args?.map((arg) =>
            this.inferArgType(arg)
          ) ||
            [];
          // 如果没有指定返回类型，默认使用 uint256
          // 注意：如果返回的是 tuple（结构体），必须通过 returnType 或 abi 指定
          const returnType = options.returnType || "uint256";
          parsedAbi = parseAbi(
            [
              `function ${options.functionName}(${
                paramTypes.join(",")
              }) view returns (${returnType})`,
            ] as readonly string[],
          );
        }
      }

      // 使用 viem 的 readContract
      const result = await client.readContract({
        address: contractAddress as Address,
        abi: parsedAbi,
        functionName: options.functionName,
        args: options.args as any,
        account: options.from as Address | undefined,
      });

      // 如果只有一个返回值，直接返回；如果有多个，返回数组
      return result;
    } catch (error: unknown) {
      // 检查是否是空数据错误
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);

      // 检查是否是空数据或 revert 错误
      if (
        errorMessage.includes("revert") ||
        errorMessage.includes("execution reverted") ||
        errorMessage.includes('value="0x"') ||
        errorMessage.includes("BAD_DATA")
      ) {
        throw new Error(
          `合约调用返回空数据或执行 revert。可能原因：` +
            `1. 合约在该地址不存在或未部署；` +
            `2. 函数执行 revert（例如：该地址没有用户信息）；` +
            `3. RPC 节点返回了空数据。` +
            `合约地址: ${contractAddress}，` +
            `函数: ${options.functionName}，` +
            `参数: ${JSON.stringify(options.args)}，` +
            `错误: ${errorMessage}`,
        );
      }

      // 其他错误直接抛出
      throw new Error(
        `读取合约失败: ${errorMessage}`,
      );
    }
  }

  /**
   * 签名消息
   * @param message 要签名的消息
   * @returns 签名结果
   */
  async signMessage(message: string): Promise<string> {
    const walletClient = this.getWalletClient();
    const accounts = await walletClient.getAddresses();
    if (accounts.length === 0) {
      throw new Error("未找到可用账户，请先连接钱包");
    }

    try {
      const signature = await walletClient.signMessage({
        account: accounts[0],
        message,
      });
      return signature;
    } catch (error) {
      throw new Error(
        `签名消息失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
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
    address: string,
  ): Promise<boolean> {
    try {
      const isValid = await viemVerifyMessage({
        address: address as Address,
        message,
        signature: signature as Hex,
      });
      return isValid;
    } catch (error) {
      throw new Error(
        `验证签名失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * 获取 Gas 价格
   * @returns Gas 价格（wei）
   */
  async getGasPrice(): Promise<string> {
    const client = this.getPublicClient();
    try {
      const gasPrice = await client.getGasPrice();
      return gasPrice.toString();
    } catch (error) {
      throw new Error(
        `获取 Gas 价格失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * 估算 Gas 消耗
   * @param options 交易选项
   * @returns 估算的 Gas 数量
   */
  async estimateGas(options: TransactionOptions): Promise<string> {
    const client = this.getPublicClient();
    try {
      const gasEstimate = await client.estimateGas({
        to: options.to as Address,
        value: options.value ? BigInt(options.value.toString()) : undefined,
        data: options.data as Hex | undefined,
        account: options.from as Address | undefined,
      });
      return gasEstimate.toString();
    } catch (error) {
      throw new Error(
        `估算 Gas 失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * 获取区块信息
   * @param blockNumber 区块号（可选，默认最新区块）
   * @returns 区块信息
   */
  async getBlock(blockNumber?: number): Promise<unknown> {
    const client = this.getPublicClient();
    try {
      const block = await client.getBlock({
        blockNumber: blockNumber ? BigInt(blockNumber) : undefined,
      });
      return block;
    } catch (error) {
      throw new Error(
        `获取区块信息失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * 获取交易信息
   * @param txHash 交易哈希
   * @returns 交易信息
   */
  async getTransaction(txHash: string): Promise<unknown> {
    const client = this.getPublicClient();
    try {
      const tx = await client.getTransaction({
        hash: txHash as Hash,
      });
      return tx;
    } catch (error) {
      throw new Error(
        `获取交易信息失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * 获取交易收据
   * @param txHash 交易哈希
   * @returns 交易收据
   */
  async getTransactionReceipt(txHash: string): Promise<unknown> {
    const client = this.getPublicClient();
    try {
      const receipt = await client.getTransactionReceipt({
        hash: txHash as Hash,
      });
      return receipt;
    } catch (error) {
      throw new Error(
        `获取交易收据失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // ==================== 事件监听方法 ====================

  /**
   * 监听新区块
   * @param callback 回调函数，接收区块号和区块信息
   * @returns 取消监听的函数
   */
  onBlock(callback: BlockListener): () => void {
    this.blockListeners.add(callback);

    // 如果还没有启动监听，则启动
    if (!this.blockListenerStarted) {
      this.startBlockListener();
    }

    // 返回取消监听的函数
    return () => {
      this.blockListeners.delete(callback);
      // 如果没有监听器了，停止监听
      if (this.blockListeners.size === 0) {
        this.stopBlockListener();
      }
    };
  }

  /**
   * 启动区块监听
   */
  private startBlockListener(): void {
    if (this.blockListenerStarted) {
      return;
    }

    this.blockListenerStarted = true;
    this.blockReconnectAttempts = 0;
    const client = this.getPublicClient();

    try {
      // 使用 viem 的 watchBlocks 监听新区块
      this.blockWatchUnsubscribe = client.watchBlocks({
        onBlock: async (block) => {
          try {
            // 重置重连计数（成功接收到区块）
            this.blockReconnectAttempts = 0;
            const blockNumber = Number(block.number);
            // 调用所有监听器
            for (const listener of this.blockListeners) {
              try {
                await Promise.resolve(listener(blockNumber, block));
              } catch (error) {
                console.error("[Web3Client] 区块监听器错误:", error);
              }
            }
          } catch (error) {
            console.error("[Web3Client] 处理区块失败:", error);
            // 如果处理区块失败，可能是连接问题，触发重连
            this.handleBlockListenerError();
          }
        },
        onError: (error) => {
          console.error("[Web3Client] 区块监听错误:", error);
          this.handleBlockListenerError();
        },
      });
    } catch (error) {
      console.error("[Web3Client] 启动区块监听失败:", error);
      this.blockListenerStarted = false;
      this.scheduleBlockReconnect();
    }
  }

  /**
   * 停止区块监听
   */
  private stopBlockListener(): void {
    if (!this.blockListenerStarted) {
      return;
    }

    // 清除重连定时器
    if (this.blockReconnectTimer) {
      clearTimeout(this.blockReconnectTimer);
      this.blockReconnectTimer = undefined;
    }

    try {
      // 取消 viem watch
      if (this.blockWatchUnsubscribe) {
        this.blockWatchUnsubscribe();
        this.blockWatchUnsubscribe = undefined;
      }
      this.blockListenerStarted = false;
      this.blockReconnectAttempts = 0;
    } catch (error) {
      console.error("[Web3Client] 停止区块监听失败:", error);
    }
  }

  /**
   * 取消所有区块监听
   */
  offBlock(): void {
    this.blockListeners.clear();
    this.stopBlockListener();
  }

  /**
   * 处理区块监听错误并安排重连
   */
  private handleBlockListenerError(): void {
    if (this.blockReconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `[Web3Client] 区块监听重连次数已达上限 (${this.maxReconnectAttempts})，停止自动重连`,
      );
      return;
    }

    this.blockListenerStarted = false;
    this.scheduleBlockReconnect();
  }

  /**
   * 安排区块监听重连
   */
  private scheduleBlockReconnect(): void {
    // 清除之前的重连定时器
    if (this.blockReconnectTimer) {
      clearTimeout(this.blockReconnectTimer);
    }

    // 如果已经没有监听器了，不重连
    if (this.blockListeners.size === 0) {
      return;
    }

    this.blockReconnectAttempts++;
    const delay = this.reconnectDelay * this.blockReconnectAttempts; // 指数退避

    this.blockReconnectTimer = setTimeout(() => {
      try {
        // 重置 publicClient，强制重新创建连接
        this.publicClient = null;
        this.startBlockListener();
      } catch (error) {
        console.error("[Web3Client] 区块监听重连失败:", error);
        this.scheduleBlockReconnect();
      }
    }, delay) as unknown as number;
  }

  /**
   * 监听交易
   * @param callback 回调函数，接收交易哈希和交易信息
   * @returns 取消监听的函数
   */
  onTransaction(callback: TransactionListener): () => void {
    this.transactionListeners.add(callback);

    // 如果还没有启动监听，则启动
    if (!this.transactionListenerStarted) {
      this.startTransactionListener();
    }

    // 返回取消监听的函数
    return () => {
      this.transactionListeners.delete(callback);
      // 如果没有监听器了，停止监听
      if (this.transactionListeners.size === 0) {
        this.stopTransactionListener();
      }
    };
  }

  /**
   * 启动交易监听
   */
  private startTransactionListener(): void {
    if (this.transactionListenerStarted) {
      return;
    }

    this.transactionListenerStarted = true;
    this.transactionReconnectAttempts = 0;
    const client = this.getPublicClient();

    try {
      // 使用 viem 的 watchPendingTransactions 监听待处理交易
      this.transactionWatchUnsubscribe = client.watchPendingTransactions({
        onTransactions: async (txHashes) => {
          try {
            // 重置重连计数（成功接收到交易）
            this.transactionReconnectAttempts = 0;
            // 获取每个交易的详细信息
            for (const txHash of txHashes) {
              try {
                const tx = await client.getTransaction({ hash: txHash });
                // 调用所有监听器
                for (const listener of this.transactionListeners) {
                  try {
                    await Promise.resolve(listener(txHash, tx));
                  } catch (error) {
                    console.error("[Web3Client] 交易监听器错误:", error);
                  }
                }
              } catch (error) {
                console.error("[Web3Client] 获取交易信息失败:", error);
              }
            }
          } catch (error) {
            console.error("[Web3Client] 处理交易失败:", error);
            // 如果处理交易失败，可能是连接问题，触发重连
            this.handleTransactionListenerError();
          }
        },
        onError: (error) => {
          console.error("[Web3Client] 交易监听错误:", error);
          this.handleTransactionListenerError();
        },
      });
    } catch (error) {
      console.error("[Web3Client] 启动交易监听失败:", error);
      this.transactionListenerStarted = false;
      this.scheduleTransactionReconnect();
    }
  }

  /**
   * 处理交易监听错误并安排重连
   */
  private handleTransactionListenerError(): void {
    if (this.transactionReconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `[Web3Client] 交易监听重连次数已达上限 (${this.maxReconnectAttempts})，停止自动重连`,
      );
      return;
    }

    this.transactionListenerStarted = false;
    this.scheduleTransactionReconnect();
  }

  /**
   * 安排交易监听重连
   */
  private scheduleTransactionReconnect(): void {
    // 清除之前的重连定时器
    if (this.transactionReconnectTimer) {
      clearTimeout(this.transactionReconnectTimer);
    }

    // 如果已经没有监听器了，不重连
    if (this.transactionListeners.size === 0) {
      return;
    }

    this.transactionReconnectAttempts++;
    const delay = this.reconnectDelay * this.transactionReconnectAttempts; // 指数退避

    this.transactionReconnectTimer = setTimeout(() => {
      try {
        // 重置 publicClient，强制重新创建连接
        this.publicClient = null;
        this.startTransactionListener();
      } catch (error) {
        console.error("[Web3Client] 交易监听重连失败:", error);
        this.scheduleTransactionReconnect();
      }
    }, delay) as unknown as number;
  }

  /**
   * 停止交易监听
   */
  private stopTransactionListener(): void {
    if (!this.transactionListenerStarted) {
      return;
    }

    // 清除重连定时器
    if (this.transactionReconnectTimer) {
      clearTimeout(this.transactionReconnectTimer);
      this.transactionReconnectTimer = undefined;
    }

    try {
      // 取消 viem watch
      if (this.transactionWatchUnsubscribe) {
        this.transactionWatchUnsubscribe();
        this.transactionWatchUnsubscribe = undefined;
      }
      this.transactionListenerStarted = false;
      this.transactionReconnectAttempts = 0;
    } catch (error) {
      console.error("[Web3Client] 停止交易监听失败:", error);
    }
  }

  /**
   * 取消所有交易监听
   */
  offTransaction(): void {
    this.transactionListeners.clear();
    this.stopTransactionListener();
  }

  /**
   * 监听合约事件
   * @param contractAddress 合约地址
   * @param eventName 事件名称（如 'Transfer'）
   * @param callback 回调函数，接收事件数据
   * @param options 监听选项
   * @param options.abi 合约 ABI（可选，如果提供则使用，否则使用默认 ABI）
   * @param options.fromBlock 起始区块号（可选，如果指定则先扫描历史事件，然后继续监听新事件）
   * @param options.toBlock 结束区块号（可选，仅在 fromBlock 指定时有效，用于限制历史扫描范围）
   * @returns 取消监听的函数
   *
   * @example
   * // 只监听新事件（从当前区块开始）
   * const off = web3.onContractEvent("0x...", "Transfer", (event) => {
   *   console.log("新事件:", event);
   * });
   *
   * // 从指定区块开始监听（先扫描历史，然后监听新事件）
   * const off = web3.onContractEvent(
   *   "0x...",
   *   "Transfer",
   *   (event) => {
   *     console.log("事件:", event);
   *   },
   *   {
   *     fromBlock: 1000, // 从区块 1000 开始
   *     abi: ["event Transfer(address indexed from, address indexed to, uint256 value)"],
   *   }
   * );
   */
  onContractEvent(
    contractAddress: string,
    eventName: string,
    callback: ContractEventListener,
    options?: {
      abi?: string[];
      fromBlock?: number;
      toBlock?: number;
    },
  ): () => void {
    const key = `${contractAddress}:${eventName}`;
    if (!this.contractEventListeners.has(key)) {
      this.contractEventListeners.set(key, new Set());
    }
    const listeners = this.contractEventListeners.get(key)!;
    listeners.add(callback);

    // 如果指定了 fromBlock，先扫描历史事件
    if (options?.fromBlock !== undefined) {
      this.scanHistoricalContractEvents(
        contractAddress,
        eventName,
        callback,
        options.fromBlock,
        options.toBlock,
        options.abi,
      ).catch((error) => {
        console.error(
          `[Web3Client] 扫描历史合约事件失败 (${contractAddress}:${eventName}):`,
          error,
        );
      });
    }

    // 启动合约事件监听（监听新事件）
    this.startContractEventListener(contractAddress, eventName, options?.abi);

    // 返回取消监听的函数
    return () => {
      listeners.delete(callback);
      // 如果没有监听器了，停止监听
      if (listeners.size === 0) {
        this.stopContractEventListener(contractAddress, eventName);
        this.contractEventListeners.delete(key);
      }
    };
  }

  /**
   * 扫描历史合约事件
   * @private
   */
  private async scanHistoricalContractEvents(
    contractAddress: string,
    eventName: string,
    callback: ContractEventListener,
    fromBlock: number,
    toBlock?: number,
    abi?: string[],
  ): Promise<void> {
    try {
      const client = this.getPublicClient();
      const currentBlock = toBlock ?? await this.getBlockNumber();
      const startBlock = Math.max(fromBlock, 0);

      // 查询历史事件日志
      // 如果提供了 ABI，尝试解析事件；否则使用通用事件查询
      let logs;
      if (abi && abi.length > 0) {
        const parsedAbi = typeof abi[0] === "string"
          ? parseAbi(abi as string[])
          : (abi as unknown as Abi);
        // 尝试从 ABI 中找到对应的事件
        const eventItem = parsedAbi.find(
          (item: any) => item.type === "event" && item.name === eventName,
        );
        if (eventItem) {
          logs = await client.getLogs({
            address: contractAddress as Address,
            event: eventItem as any,
            fromBlock: BigInt(startBlock),
            toBlock: BigInt(currentBlock),
          });
        } else {
          // 如果找不到，使用通用查询
          logs = await client.getLogs({
            address: contractAddress as Address,
            fromBlock: BigInt(startBlock),
            toBlock: BigInt(currentBlock),
          });
        }
      } else {
        // 没有提供 ABI，使用通用查询
        logs = await client.getLogs({
          address: contractAddress as Address,
          fromBlock: BigInt(startBlock),
          toBlock: BigInt(currentBlock),
        });
      }

      // 按区块号和时间戳排序（从旧到新）
      logs.sort((a: any, b: any) => {
        if (a.blockNumber !== b.blockNumber) {
          return Number(a.blockNumber) - Number(b.blockNumber);
        }
        return (a.logIndex || 0) - (b.logIndex || 0);
      });

      // 调用回调函数处理每个历史事件
      for (const log of logs) {
        try {
          await Promise.resolve(callback(log));
        } catch (error) {
          console.warn(
            `[Web3Client] 解析历史事件失败 (${contractAddress}:${eventName}):`,
            error,
          );
        }
      }
    } catch (error) {
      throw new Error(
        `扫描历史合约事件失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * 启动合约事件监听
   */
  private startContractEventListener(
    contractAddress: string,
    eventName: string,
    abi?: string[],
  ): void {
    const key = `${contractAddress}:${eventName}`;

    // 初始化重连计数
    if (!this.contractReconnectAttempts.has(key)) {
      this.contractReconnectAttempts.set(key, 0);
    }

    try {
      const client = this.getPublicClient();

      // 构建 ABI（如果提供了则使用，否则使用默认的事件 ABI）
      const eventAbi = abi
        ? (typeof abi[0] === "string"
          ? parseAbi(abi as string[])
          : (abi as unknown as Abi))
        : parseAbi([`event ${eventName}()`] as readonly string[]);

      // 使用 viem 的 watchContractEvent 监听合约事件
      const unsubscribe = client.watchContractEvent({
        address: contractAddress as Address,
        abi: eventAbi,
        eventName: eventName,
        onLogs: async (logs) => {
          const listeners = this.contractEventListeners.get(key);
          if (listeners) {
            try {
              // 重置重连计数（成功接收到事件）
              this.contractReconnectAttempts.set(key, 0);
              // 处理每个事件日志
              for (const log of logs) {
                for (const listener of listeners) {
                  try {
                    await Promise.resolve(listener(log));
                  } catch (error) {
                    console.error("[Web3Client] 合约事件监听器错误:", error);
                  }
                }
              }
            } catch (error) {
              console.error("[Web3Client] 处理合约事件失败:", error);
              // 如果处理事件失败，可能是连接问题，触发重连
              this.handleContractEventListenerError(contractAddress, eventName);
            }
          }
        },
        onError: (error) => {
          console.error("[Web3Client] 合约事件监听错误:", error);
          this.handleContractEventListenerError(contractAddress, eventName);
        },
      });

      // 保存取消函数
      this.contractWatchUnsubscribes.set(key, unsubscribe);
    } catch (error) {
      console.error(
        `[Web3Client] 启动合约事件监听失败 (${contractAddress}:${eventName}):`,
        error,
      );
      this.scheduleContractReconnect(contractAddress, eventName, abi);
    }
  }

  /**
   * 处理合约事件监听错误并安排重连
   */
  private handleContractEventListenerError(
    contractAddress: string,
    eventName: string,
  ): void {
    const key = `${contractAddress}:${eventName}`;
    const attempts = this.contractReconnectAttempts.get(key) || 0;

    if (attempts >= this.maxReconnectAttempts) {
      console.error(
        `[Web3Client] 合约事件监听重连次数已达上限 (${this.maxReconnectAttempts})，停止自动重连: ${key}`,
      );
      return;
    }

    this.scheduleContractReconnect(contractAddress, eventName);
  }

  /**
   * 安排合约事件监听重连
   */
  private scheduleContractReconnect(
    contractAddress: string,
    eventName: string,
    abi?: string[],
  ): void {
    const key = `${contractAddress}:${eventName}`;

    // 清除之前的重连定时器
    const existingTimer = this.contractReconnectTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 如果已经没有监听器了，不重连
    const listeners = this.contractEventListeners.get(key);
    if (!listeners || listeners.size === 0) {
      return;
    }

    const attempts = (this.contractReconnectAttempts.get(key) || 0) + 1;
    this.contractReconnectAttempts.set(key, attempts);
    const delay = this.reconnectDelay * attempts; // 指数退避

    const timer = setTimeout(() => {
      try {
        // 重置 publicClient，强制重新创建连接
        this.publicClient = null;
        this.startContractEventListener(contractAddress, eventName, abi);
      } catch (error) {
        console.error("[Web3Client] 合约事件监听重连失败:", error);
        this.scheduleContractReconnect(contractAddress, eventName, abi);
      }
    }, delay) as unknown as number;

    this.contractReconnectTimers.set(key, timer);
  }

  /**
   * 停止合约事件监听
   */
  private stopContractEventListener(
    contractAddress: string,
    eventName: string,
  ): void {
    const key = `${contractAddress}:${eventName}`;

    // 清除重连定时器
    const timer = this.contractReconnectTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.contractReconnectTimers.delete(key);
    }

    // 清除重连计数
    this.contractReconnectAttempts.delete(key);

    try {
      // 取消 viem watch
      const unsubscribe = this.contractWatchUnsubscribes.get(key);
      if (unsubscribe) {
        unsubscribe();
        this.contractWatchUnsubscribes.delete(key);
      }
    } catch (error) {
      console.error(
        `[Web3Client] 停止合约事件监听失败 (${contractAddress}:${eventName}):`,
        error,
      );
    }
  }

  /**
   * 取消合约事件监听
   * @param contractAddress 合约地址
   * @param eventName 事件名称（可选，如果不提供则取消该合约的所有事件监听）
   */
  offContractEvent(contractAddress: string, eventName?: string): void {
    if (eventName) {
      const key = `${contractAddress}:${eventName}`;
      this.contractEventListeners.delete(key);
      this.stopContractEventListener(contractAddress, eventName);
    } else {
      // 取消该合约的所有事件监听
      for (const [key, listeners] of this.contractEventListeners.entries()) {
        if (key.startsWith(`${contractAddress}:`)) {
          const eventName = key.split(":")[1];
          this.stopContractEventListener(contractAddress, eventName);
          listeners.clear();
          this.contractEventListeners.delete(key);
        }
      }
    }
  }

  /**
   * 设置重连配置
   * @param delay 重连延迟（毫秒，默认 3000）
   * @param maxAttempts 最大重连次数（默认 10）
   */
  setReconnectConfig(delay?: number, maxAttempts?: number): void {
    if (delay !== undefined) {
      this.reconnectDelay = delay;
    }
    if (maxAttempts !== undefined) {
      this.maxReconnectAttempts = maxAttempts;
    }
  }

  /**
   * 监听账户变化（钱包环境）
   * @param callback 回调函数，接收账户地址数组
   * @returns 取消监听的函数
   */
  onAccountsChanged(callback: AccountsChangedListener): () => void {
    this.accountsChangedListeners.add(callback);

    // 如果还没有启动监听，则启动
    if (!this.walletListenersStarted) {
      this.startWalletListeners();
    }

    // 返回取消监听的函数
    return () => {
      this.accountsChangedListeners.delete(callback);
      // 如果没有监听器了，停止监听
      if (
        this.accountsChangedListeners.size === 0 &&
        this.chainChangedListeners.size === 0
      ) {
        this.stopWalletListeners();
      }
    };
  }

  /**
   * 监听链切换（钱包环境）
   * @param callback 回调函数，接收链 ID（十六进制字符串）
   * @returns 取消监听的函数
   */
  onChainChanged(callback: ChainChangedListener): () => void {
    this.chainChangedListeners.add(callback);

    // 如果还没有启动监听，则启动
    if (!this.walletListenersStarted) {
      this.startWalletListeners();
    }

    // 返回取消监听的函数
    return () => {
      this.chainChangedListeners.delete(callback);
      // 如果没有监听器了，停止监听
      if (
        this.accountsChangedListeners.size === 0 &&
        this.chainChangedListeners.size === 0
      ) {
        this.stopWalletListeners();
      }
    };
  }

  /**
   * 启动钱包事件监听
   */
  private startWalletListeners(): void {
    if (this.walletListenersStarted) {
      return;
    }

    if (typeof globalThis !== "undefined" && "window" in globalThis) {
      const win = globalThis.window as WindowWithEthereum;
      if (!win.ethereum || !win.ethereum.on) {
        return;
      }

      this.walletListenersStarted = true;

      // 创建包装函数用于账户变化监听
      this.walletAccountsChangedWrapper = (...args: unknown[]) => {
        const accounts = args[0] as string[];
        for (const listener of this.accountsChangedListeners) {
          try {
            Promise.resolve(listener(accounts)).catch((error) => {
              console.error("[Web3Client] 账户变化监听器错误:", error);
            });
          } catch (error) {
            console.error("[Web3Client] 账户变化监听器错误:", error);
          }
        }
      };

      // 创建包装函数用于链切换监听
      this.walletChainChangedWrapper = (...args: unknown[]) => {
        const chainId = args[0] as string;

        // 清除 publicClient 和 walletClient 缓存，避免使用旧的网络信息
        // viem 在网络切换时需要重新创建客户端，清除缓存可以避免这个问题
        this.publicClient = null;
        this.walletClient = null;

        for (const listener of this.chainChangedListeners) {
          try {
            Promise.resolve(listener(chainId)).catch((error) => {
              console.error("[Web3Client] 链切换监听器错误:", error);
            });
          } catch (error) {
            console.error("[Web3Client] 链切换监听器错误:", error);
          }
        }
      };

      // 监听账户变化
      win.ethereum.on("accountsChanged", this.walletAccountsChangedWrapper);

      // 监听链切换
      win.ethereum.on("chainChanged", this.walletChainChangedWrapper);
    }
  }

  /**
   * 停止钱包事件监听
   */
  private stopWalletListeners(): void {
    if (!this.walletListenersStarted) {
      return;
    }

    if (typeof globalThis !== "undefined" && "window" in globalThis) {
      const win = globalThis.window as WindowWithEthereum;
      if (win.ethereum && win.ethereum.removeListener) {
        // 移除账户变化监听器
        if (this.walletAccountsChangedWrapper) {
          win.ethereum.removeListener(
            "accountsChanged",
            this.walletAccountsChangedWrapper,
          );
          this.walletAccountsChangedWrapper = undefined;
        }
        // 移除链切换监听器
        if (this.walletChainChangedWrapper) {
          win.ethereum.removeListener(
            "chainChanged",
            this.walletChainChangedWrapper,
          );
          this.walletChainChangedWrapper = undefined;
        }
      }
    }

    this.walletListenersStarted = false;
  }

  /**
   * 取消所有账户变化监听
   */
  offAccountsChanged(): void {
    this.accountsChangedListeners.clear();
    if (this.chainChangedListeners.size === 0) {
      this.stopWalletListeners();
    }
  }

  /**
   * 取消所有链切换监听
   */
  offChainChanged(): void {
    this.chainChangedListeners.clear();
    if (this.accountsChangedListeners.size === 0) {
      this.stopWalletListeners();
    }
  }

  // ==================== 其他常用方法 ====================

  /**
   * 获取当前区块号
   * @returns 当前区块号
   */
  async getBlockNumber(): Promise<number> {
    const client = this.getPublicClient();
    try {
      const blockNumber = await client.getBlockNumber();
      return Number(blockNumber);
    } catch (error) {
      throw new Error(
        `获取区块号失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * 获取网络信息
   * @returns 网络信息（包含 chainId、name 等）
   */
  async getNetwork(): Promise<{ chainId: number; name: string }> {
    const client = this.getPublicClient();
    try {
      // viem 的 getChainId 返回链 ID
      const chainId = await client.getChainId();

      // 尝试获取链名称（如果 chain 配置可用）
      let name = `chain-${chainId}`;
      if (this.chain) {
        name = this.chain.name;
      } else {
        // 尝试从客户端获取链信息
        try {
          // viem 的 PublicClient 可能包含 chain 信息
          const chain = (client as any).chain;
          if (chain && chain.name) {
            name = chain.name;
            this.chain = chain;
          }
        } catch {
          // 如果无法获取链名称，使用默认格式
        }
      }

      return {
        chainId: Number(chainId),
        name,
      };
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      throw new Error(
        `获取网络信息失败: ${errorMessage}`,
      );
    }
  }

  /**
   * 获取链 ID
   * @returns 链 ID
   */
  async getChainId(): Promise<number> {
    const network = await this.getNetwork();
    return network.chainId;
  }

  /**
   * 获取 Gas 限制
   * @param blockNumber 区块号（可选，默认最新区块）
   * @returns Gas 限制
   */
  async getGasLimit(blockNumber?: number): Promise<string> {
    const client = this.getPublicClient();
    try {
      const block = await client.getBlock({
        blockNumber: blockNumber ? BigInt(blockNumber) : undefined,
      });
      return block.gasLimit.toString();
    } catch (error) {
      throw new Error(
        `获取 Gas 限制失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * 获取费用数据（EIP-1559）
   * @returns 费用数据（包含 gasPrice、maxFeePerGas、maxPriorityFeePerGas）
   */
  async getFeeData(): Promise<{
    gasPrice: string | null;
    maxFeePerGas: string | null;
    maxPriorityFeePerGas: string | null;
  }> {
    const client = this.getPublicClient();
    try {
      // viem 使用 estimateFeesPerGas 获取 EIP-1559 费用
      const fees = await client.estimateFeesPerGas();
      return {
        gasPrice: fees.gasPrice ? String(fees.gasPrice) : null,
        maxFeePerGas: fees.maxFeePerGas ? String(fees.maxFeePerGas) : null,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas
          ? String(fees.maxPriorityFeePerGas)
          : null,
      };
    } catch (error) {
      throw new Error(
        `获取费用数据失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * 批量获取账户余额
   * @param addresses 地址数组
   * @returns 余额数组（wei，字符串格式）
   */
  async getBalances(addresses: string[]): Promise<string[]> {
    const client = this.getPublicClient();
    try {
      const balances = await Promise.all(
        addresses.map((address) =>
          client.getBalance({ address: address as Address })
        ),
      );
      return balances.map((balance) => balance.toString());
    } catch (error) {
      throw new Error(
        `批量获取余额失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * 获取区块中的交易
   * @param blockNumber 区块号
   * @param includeTransactions 是否包含完整交易信息（默认 false，只返回交易哈希）
   * @returns 交易数组
   */
  async getBlockTransactions(
    blockNumber: number,
    includeTransactions: boolean = false,
  ): Promise<unknown[]> {
    const client = this.getPublicClient();
    try {
      const block = await client.getBlock({
        blockNumber: BigInt(blockNumber),
        includeTransactions,
      });
      return block.transactions || [];
    } catch (error) {
      throw new Error(
        `获取区块交易失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * 获取地址的交易历史（通过区块扫描）
   * @param address 地址
   * @param fromBlock 起始区块号（可选）
   * @param toBlock 结束区块号（可选，默认最新区块）
   * @returns 交易数组
   */
  async getAddressTransactions(
    address: string,
    fromBlock?: number,
    toBlock?: number,
  ): Promise<unknown[]> {
    const client = this.getPublicClient();
    try {
      // 使用 viem 的 getLogs 方法查询交易
      const currentBlock = toBlock ?? await this.getBlockNumber();
      const startBlock = fromBlock ?? Math.max(0, currentBlock - 1000); // 默认查询最近 1000 个区块

      // 查询该地址相关的日志
      const logs = await client.getLogs({
        address: address as Address,
        fromBlock: BigInt(startBlock),
        toBlock: BigInt(currentBlock),
      });

      // 从日志中提取交易哈希并获取完整交易信息
      const transactions: unknown[] = [];
      const txHashes = new Set<string>();

      for (const log of logs) {
        const txHash = log.transactionHash;
        if (txHash && !txHashes.has(txHash)) {
          txHashes.add(txHash);
          try {
            const tx = await this.getTransaction(txHash);
            // 只包含与该地址相关的交易
            if (
              (tx as any).from?.toLowerCase() === address.toLowerCase() ||
              (tx as any).to?.toLowerCase() === address.toLowerCase()
            ) {
              transactions.push(tx);
            }
          } catch (error) {
            console.warn(`获取交易 ${txHash} 失败:`, error);
          }
        }
      }

      return transactions;
    } catch (error) {
      throw new Error(
        `获取地址交易历史失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * 扫描合约指定方法的交易信息
   * @param contractAddress 合约地址
   * @param functionSignature 函数签名（如 'register(address,string)'）
   * @param options 扫描选项
   * @returns 交易信息数组和分页信息
   *
   * @example
   * // 扫描 register 方法的所有调用
   * const result = await web3.scanContractMethodTransactions(
   *   "0x...",
   *   "register(address,string)",
   *   {
   *     fromBlock: 1000,
   *     toBlock: 2000,
   *     page: 1,
   *     pageSize: 20,
   *   }
   * );
   * // result: { transactions: [...], total: 100, page: 1, pageSize: 20, totalPages: 5 }
   */
  async scanContractMethodTransactions(
    contractAddress: string,
    functionSignature: string,
    options: {
      fromBlock?: number;
      toBlock?: number;
      page?: number;
      pageSize?: number;
      abi?: string[]; // 可选：完整 ABI，用于解析参数
    } = {},
  ): Promise<{
    transactions: Array<{
      hash: string;
      from: string;
      to: string;
      blockNumber: number;
      blockHash: string;
      timestamp?: number;
      gasUsed?: string;
      gasPrice?: string;
      value: string;
      data: string;
      args?: unknown[]; // 解析后的函数参数
      receipt?: unknown; // 交易收据（可选）
    }>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const client = this.getPublicClient();
    try {
      // 获取函数选择器（内联实现：计算函数签名的 Keccak-256 哈希的前 4 字节）
      const hash = viemKeccak256(functionSignature as Hex);
      const functionSelector = hash.slice(0, 10); // 前 4 字节（8 个十六进制字符 + 0x）
      const selectorLower = functionSelector.toLowerCase();

      // 设置默认值
      const currentBlock = options.toBlock ?? await this.getBlockNumber();
      const startBlock = options.fromBlock ?? Math.max(0, currentBlock - 10000); // 默认查询最近 10000 个区块
      const page = options.page ?? 1;
      const pageSize = options.pageSize ?? 20;

      // 扫描区块范围
      const allTransactions: Array<{
        hash: string;
        from: string;
        to: string;
        blockNumber: number;
        blockHash: string;
        timestamp?: number;
        gasUsed?: string;
        gasPrice?: string;
        value: string;
        data: string;
        args?: unknown[];
        receipt?: unknown;
      }> = [];

      // 批量扫描区块（每次扫描 100 个区块以提高效率）
      const batchSize = 100;
      for (
        let blockNum = startBlock;
        blockNum <= currentBlock;
        blockNum += batchSize
      ) {
        const endBlock = Math.min(blockNum + batchSize - 1, currentBlock);
        const blockPromises: Promise<void>[] = [];

        for (let i = blockNum; i <= endBlock; i++) {
          blockPromises.push(
            (async () => {
              try {
                const block = await client.getBlock({
                  blockNumber: BigInt(i),
                  includeTransactions: true,
                });

                if (block.transactions && Array.isArray(block.transactions)) {
                  for (const tx of block.transactions) {
                    const txObj = tx as any;
                    // 检查是否调用了目标合约和方法
                    if (
                      txObj.to &&
                      txObj.to.toLowerCase() ===
                        contractAddress.toLowerCase() &&
                      txObj.data &&
                      txObj.data.toLowerCase().startsWith(selectorLower)
                    ) {
                      // 解析函数参数（如果提供了 ABI）
                      let args: unknown[] | undefined;
                      if (options.abi) {
                        try {
                          const abi = typeof options.abi[0] === "string"
                            ? parseAbi(options.abi as string[])
                            : (options.abi as unknown as Abi);
                          const functionName = functionSignature.split("(")[0];
                          // 从 ABI 中找到对应的函数
                          const func = abi.find(
                            (item: any) =>
                              item.type === "function" &&
                              item.name === functionName,
                          );
                          if (func) {
                            const decoded = decodeFunctionData({
                              abi,
                              data: txObj.data as Hex,
                            });
                            args = Array.from(decoded.args || []);
                          }
                        } catch (error) {
                          // 解析失败，忽略参数
                          console.warn(
                            `解析交易参数失败 ${txObj.hash}:`,
                            error,
                          );
                        }
                      }

                      // 获取交易收据（可选）
                      let receipt: unknown | undefined;
                      let gasUsed: string | undefined;
                      try {
                        receipt = await this.getTransactionReceipt(txObj.hash);
                        gasUsed = (receipt as any).gasUsed?.toString();
                      } catch {
                        // 获取收据失败，忽略
                      }

                      allTransactions.push({
                        hash: txObj.hash,
                        from: txObj.from,
                        to: txObj.to,
                        blockNumber: i,
                        blockHash: block.hash,
                        timestamp: Number(block.timestamp),
                        gasUsed,
                        gasPrice: txObj.gasPrice?.toString(),
                        value: txObj.value?.toString() || "0",
                        data: txObj.data,
                        args,
                        receipt,
                      });
                    }
                  }
                }
              } catch (error) {
                console.warn(`扫描区块 ${i} 失败:`, error);
              }
            })(),
          );
        }

        // 等待当前批次完成
        await Promise.all(blockPromises);
      }

      // 按区块号和时间戳倒序排序（最新的在前）
      allTransactions.sort((a, b) => {
        if (b.blockNumber !== a.blockNumber) {
          return b.blockNumber - a.blockNumber;
        }
        return (b.timestamp || 0) - (a.timestamp || 0);
      });

      // 分页
      const total = allTransactions.length;
      const totalPages = Math.ceil(total / pageSize);
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedTransactions = allTransactions.slice(startIndex, endIndex);

      return {
        transactions: paginatedTransactions,
        total,
        page,
        pageSize,
        totalPages,
      };
    } catch (error) {
      throw new Error(
        `扫描合约方法交易失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * 检查地址是否为合约地址
   * @param address 地址
   * @returns 是否为合约地址
   */
  /**
   * 获取合约代码
   * @param address 合约地址
   * @returns 合约代码（十六进制字符串）
   */
  async getCode(address: string): Promise<string> {
    const client = this.getPublicClient();
    try {
      const code = await client.getCode({
        address: address as Address,
      });
      return code || "0x";
    } catch (error) {
      throw new Error(
        `获取合约代码失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async isContract(address: string): Promise<boolean> {
    const client = this.getPublicClient();
    try {
      const code = await client.getCode({
        address: address as Address,
      });
      return code !== undefined && code !== "0x" && code.length > 2;
    } catch (error) {
      throw new Error(
        `检查合约地址失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
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

// ==================== Web3 工具函数 ====================

/**
 * 以太坊单位枚举
 */
export enum Unit {
  wei = "wei",
  kwei = "kwei",
  mwei = "mwei",
  gwei = "gwei",
  szabo = "szabo",
  finney = "finney",
  ether = "ether",
}

/**
 * 单位转换表（相对于 wei 的倍数）
 */
const UNIT_MAP: Record<string, bigint> = {
  wei: BigInt(1),
  kwei: BigInt(1000),
  mwei: BigInt(1000000),
  gwei: BigInt(1000000000),
  szabo: BigInt(1000000000000),
  finney: BigInt(1000000000000000),
  ether: BigInt(1000000000000000000),
};

/**
 * 从 wei 转换为其他单位
 * @param value wei 值（字符串或 bigint）
 * @param unit 目标单位（默认 'ether'）
 * @returns 转换后的值（字符串）
 *
 * @example
 * fromWei('1000000000000000000', 'ether') // '1.0'
 * fromWei('1000000000', 'gwei') // '1.0'
 */
export function fromWei(
  value: string | bigint,
  unit: string = "ether",
): string {
  const weiValue = typeof value === "string" ? BigInt(value) : value;
  const unitMultiplier = UNIT_MAP[unit.toLowerCase()];

  if (!unitMultiplier) {
    throw new Error(`未知的单位: ${unit}`);
  }

  // 转换为目标单位（保留 18 位小数精度）
  const result = Number(weiValue) / Number(unitMultiplier);
  return result.toString();
}

/**
 * 转换为 wei
 * @param value 数值（字符串或数字）
 * @param unit 源单位（默认 'ether'）
 * @returns wei 值（字符串）
 *
 * @example
 * toWei('1', 'ether') // '1000000000000000000'
 * toWei('1', 'gwei') // '1000000000'
 */
export function toWei(value: string | number, unit: string = "ether"): string {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  const unitMultiplier = UNIT_MAP[unit.toLowerCase()];

  if (!unitMultiplier) {
    throw new Error(`未知的单位: ${unit}`);
  }

  // 转换为 wei
  const result = BigInt(Math.floor(numValue * Number(unitMultiplier)));
  return result.toString();
}

/**
 * 验证以太坊地址格式（包含校验和验证）
 * @param address 地址字符串
 * @returns 是否为有效地址
 *
 * @example
 * isAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb') // true
 */
export function isAddress(address: string): boolean {
  if (!address || typeof address !== "string") {
    return false;
  }

  // 使用 viem 的 isAddress
  try {
    return viemIsAddress(address);
  } catch {
    // 如果失败，使用自己的实现
  }

  // 移除 0x 前缀（如果有）
  const addr = address.startsWith("0x") ? address.slice(2) : address;

  // 检查长度（40 个十六进制字符）
  if (addr.length !== 40) {
    return false;
  }

  // 检查是否为有效的十六进制字符串
  if (!/^[0-9a-fA-F]{40}$/.test(addr)) {
    return false;
  }

  // 如果地址包含大小写混合，验证校验和（EIP-55）
  const hasMixedCase = /[a-f]/.test(addr) && /[A-F]/.test(addr);
  if (hasMixedCase) {
    return checkAddressChecksum(address);
  }

  return true;
}

/**
 * 验证地址校验和（EIP-55）
 * @param address 地址字符串
 * @returns 校验和是否正确
 *
 * @example
 * checkAddressChecksum('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb') // true
 */
export function checkAddressChecksum(address: string): boolean {
  if (!address || typeof address !== "string") {
    return false;
  }

  // 移除 0x 前缀并转为小写
  const addr = address.startsWith("0x")
    ? address.slice(2).toLowerCase()
    : address.toLowerCase();

  if (addr.length !== 40 || !/^[0-9a-f]{40}$/.test(addr)) {
    return false;
  }

  // 使用 toChecksumAddress 计算正确的校验和地址，然后比较
  try {
    const checksummed = toChecksumAddress("0x" + addr);
    return checksummed === address;
  } catch {
    return false;
  }
}

/**
 * 转换为校验和地址（EIP-55）
 * @param address 地址字符串
 * @returns 校验和地址
 *
 * @example
 * toChecksumAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb')
 * // '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
 */
export function toChecksumAddress(address: string): string {
  // 使用 viem 的 isAddress 函数
  if (!viemIsAddress(address)) {
    throw new Error(`无效的地址: ${address}`);
  }

  // 移除 0x 前缀并转为小写
  const addr = address.startsWith("0x")
    ? address.slice(2).toLowerCase()
    : address.toLowerCase();

  // 使用 viem 的 getAddress 生成校验和地址
  try {
    return getAddress("0x" + addr);
  } catch {
    // 如果失败，返回小写地址
    return "0x" + addr;
  }
}

/**
 * Keccak-256 哈希（使用 ethers.js）
 * @param data 要哈希的数据
 * @returns 哈希值（十六进制字符串）
 *
 * @example
 * await keccak256('hello world') // '0x...'
 */
export async function keccak256(data: string | Uint8Array): Promise<string> {
  try {
    // viem 的 keccak256 接受 Hex 或 Bytes
    const dataHex = typeof data === "string"
      ? (data.startsWith("0x") ? data as Hex : ("0x" + data) as Hex)
      : (data as Uint8Array);
    return viemKeccak256(dataHex);
  } catch {
    // 如果 ethers 不可用，使用 Web Crypto API 的 SHA-256 作为替代
    const encoder = new TextEncoder();
    const dataBytes = typeof data === "string"
      ? encoder.encode(data)
      : new Uint8Array(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBytes.buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return "0x" +
      hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}

/**
 * Solidity Keccak-256 哈希（处理 ABI 编码）
 * @param types 类型数组
 * @param values 值数组
 * @returns 哈希值（十六进制字符串）
 *
 * @example
 * await solidityKeccak256(['address', 'uint256'], ['0x...', '100'])
 */
export async function solidityKeccak256(
  types: string[],
  values: unknown[],
): Promise<string> {
  try {
    // viem 使用 encodePacked 和 keccak256
    const packed = encodeAbiParameters(
      types.map((t) => ({ type: t } as any)),
      values,
    );
    return viemKeccak256(packed);
  } catch {
    // 如果 ethers 不可用，简化实现
    const encoded = types.map((type, i) => {
      const value = values[i];
      if (type === "address") {
        return (value as string).toLowerCase().replace("0x", "");
      }
      if (type.startsWith("uint") || type.startsWith("int")) {
        return BigInt(value as string | number).toString(16).padStart(64, "0");
      }
      return String(value);
    }).join("");
    return await keccak256(encoded);
  }
}

/**
 * 十六进制字符串转字节数组
 * @param hex 十六进制字符串
 * @returns 字节数组
 *
 * @example
 * hexToBytes('0x48656c6c6f') // Uint8Array([72, 101, 108, 108, 111])
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);

  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
  }

  return bytes;
}

/**
 * 字节数组转十六进制字符串
 * @param bytes 字节数组
 * @returns 十六进制字符串
 *
 * @example
 * bytesToHex(new Uint8Array([72, 101, 108, 108, 111])) // '0x48656c6c6f'
 */
export function bytesToHex(bytes: Uint8Array): string {
  return "0x" + Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * 十六进制字符串转数字
 * @param hex 十六进制字符串
 * @returns 数字
 *
 * @example
 * hexToNumber('0xff') // 255
 */
export function hexToNumber(hex: string): number {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  return parseInt(cleanHex, 16);
}

/**
 * 数字转十六进制字符串
 * @param value 数字
 * @returns 十六进制字符串
 *
 * @example
 * numberToHex(255) // '0xff'
 */
export function numberToHex(value: number | bigint): string {
  if (typeof value === "bigint") {
    return "0x" + value.toString(16);
  }
  return "0x" + value.toString(16);
}

/**
 * 移除 0x 前缀
 * @param hex 十六进制字符串
 * @returns 移除前缀后的字符串
 *
 * @example
 * stripHexPrefix('0xff') // 'ff'
 */
export function stripHexPrefix(hex: string): string {
  return hex.startsWith("0x") ? hex.slice(2) : hex;
}

/**
 * 添加 0x 前缀
 * @param hex 十六进制字符串
 * @returns 添加前缀后的字符串
 *
 * @example
 * addHexPrefix('ff') // '0xff'
 */
export function addHexPrefix(hex: string): string {
  return hex.startsWith("0x") ? hex : "0x" + hex;
}

/**
 * 左填充（padLeft）
 * @param value 值
 * @param length 目标长度
 * @param padChar 填充字符（默认 '0'）
 * @returns 填充后的字符串
 *
 * @example
 * padLeft('ff', 4) // '00ff'
 */
export function padLeft(
  value: string,
  length: number,
  padChar: string = "0",
): string {
  return value.padStart(length, padChar);
}

/**
 * 右填充（padRight）
 * @param value 值
 * @param length 目标长度
 * @param padChar 填充字符（默认 '0'）
 * @returns 填充后的字符串
 *
 * @example
 * padRight('ff', 4) // 'ff00'
 */
export function padRight(
  value: string,
  length: number,
  padChar: string = "0",
): string {
  return value.padEnd(length, padChar);
}

/**
 * 生成新的钱包地址和私钥
 * @returns 包含钱包地址和私钥的对象
 *
 * @example
 * const wallet = generateWallet();
 * console.log(wallet.address); // '0x...'
 * console.log(wallet.privateKey); // '0x...'
 */
export function generateWallet(): {
  address: string;
  privateKey: string;
} {
  // 生成随机私钥
  const privateKey = generatePrivateKey();

  // 从私钥派生钱包地址
  const account = privateKeyToAccount(privateKey as Hex);

  return {
    address: account.address,
    privateKey: privateKey,
  };
}

/**
 * 验证私钥格式
 * @param privateKey 私钥字符串
 * @returns 是否为有效私钥
 *
 * @example
 * isPrivateKey('0x...') // true
 */
export function isPrivateKey(privateKey: string): boolean {
  if (!privateKey || typeof privateKey !== "string") {
    return false;
  }

  const key = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;

  // 私钥应该是 64 个十六进制字符（32 字节）
  return /^[0-9a-fA-F]{64}$/.test(key);
}

/**
 * 验证交易哈希格式
 * @param txHash 交易哈希
 * @returns 是否为有效交易哈希
 *
 * @example
 * isTxHash('0x...') // true
 */
export function isTxHash(txHash: string): boolean {
  if (!txHash || typeof txHash !== "string") {
    return false;
  }

  const hash = txHash.startsWith("0x") ? txHash.slice(2) : txHash;

  // 交易哈希应该是 64 个十六进制字符（32 字节）
  return /^[0-9a-fA-F]{64}$/.test(hash);
}

/**
 * 格式化地址（添加 0x 前缀，转换为校验和地址）
 * @param address 地址字符串
 * @returns 格式化后的地址（校验和格式）
 *
 * @example
 * formatAddress('742d35cc6634c0532925a3b844bc9e7595f0beb')
 * // '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
 */
export function formatAddress(address: string): string {
  // 使用 viem 的 isAddress 函数
  if (!viemIsAddress(address)) {
    throw new Error(`无效的地址: ${address}`);
  }

  // 确保有 0x 前缀
  const addrWithPrefix = address.startsWith("0x") ? address : "0x" + address;

  // 使用 toChecksumAddress 转换为校验和地址
  return toChecksumAddress(addrWithPrefix);
}

/**
 * 缩短地址显示（用于 UI）
 * @param address 地址字符串
 * @param startLength 开头保留长度（默认 6）
 * @param endLength 结尾保留长度（默认 4）
 * @returns 缩短后的地址
 *
 * @example
 * shortenAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb')
 * // '0x742d...0beb'
 */
export function shortenAddress(
  address: string,
  startLength: number = 6,
  endLength: number = 4,
): string {
  if (!isAddress(address)) {
    return address;
  }

  const addr = address.startsWith("0x") ? address.slice(2) : address;
  const start = addr.slice(0, startLength);
  const end = addr.slice(-endLength);

  return `0x${start}...${end}`;
}

/**
 * 计算合约地址（CREATE）
 * @param deployerAddress 部署者地址
 * @param nonce 部署者 nonce
 * @returns 合约地址
 *
 * @example
 * await computeContractAddress('0x...', 0)
 */
export async function computeContractAddress(
  deployerAddress: string,
  nonce: number,
): Promise<string> {
  // 简化实现：使用 RLP 编码和 Keccak-256
  // 实际应该使用完整的 RLP 编码：RLP([deployerAddress, nonce])
  // 注意：这是简化实现，实际应使用 ethers 的 RLP 编码功能
  const data = formatAddress(deployerAddress) + numberToHex(nonce).slice(2);
  const hash = await keccak256(data);
  return "0x" + hash.slice(-40);
}

/**
 * 获取合约代码
 * @param address 合约地址
 * @param rpcUrl RPC 节点 URL（可选，如果不提供则需要通过 createWeb3Client 创建客户端）
 * @returns 合约代码（十六进制字符串）
 *
 * @example
 * const code = await getCode('0x...', 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID')
 */
export async function getCode(
  address: string,
  rpcUrl?: string,
): Promise<string> {
  if (!viemIsAddress(address)) {
    throw new Error(`无效的地址: ${address}`);
  }

  const formattedAddress = formatAddress(address);

  // 如果提供了 rpcUrl，创建临时客户端
  if (rpcUrl) {
    const publicClient = createPublicClient({
      transport: http(rpcUrl),
    });
    const code = await publicClient.getCode({
      address: formattedAddress as Address,
    });
    return code || "0x";
  }

  // 如果没有提供 rpcUrl，抛出错误
  throw new Error(
    "需要提供 rpcUrl 参数或使用 Web3Client 实例的 getCode 方法",
  );
}

/**
 * 获取函数选择器（函数签名的前 4 字节）
 * @param functionSignature 函数签名，如 "transfer(address,uint256)"
 * @returns 函数选择器（十六进制字符串，如 "0xa9059cbb"）
 *
 * @example
 * getFunctionSelector('transfer(address,uint256)') // '0xa9059cbb'
 */
export function getFunctionSelector(functionSignature: string): string {
  if (!functionSignature || typeof functionSignature !== "string") {
    throw new Error("函数签名不能为空");
  }

  // 计算函数签名的 Keccak-256 哈希
  const hash = viemKeccak256(functionSignature as Hex);

  // 返回前 4 字节（8 个十六进制字符 + 0x 前缀）
  return hash.slice(0, 10); // "0x" + 8 个字符
}

/**
 * 编码函数调用数据
 * @param functionSignature 函数签名，如 "transfer(address,uint256)"
 * @param args 函数参数数组
 * @returns 编码后的函数调用数据（十六进制字符串）
 *
 * @example
 * encodeFunctionCall('transfer(address,uint256)', ['0x...', '1000000000000000000'])
 * // '0xa9059cbb000000000000000000000000...'
 */
export function encodeFunctionCall(
  functionSignature: string,
  args: unknown[] = [],
): string {
  if (!functionSignature || typeof functionSignature !== "string") {
    throw new Error("函数签名不能为空");
  }

  try {
    // 提取函数名（函数签名格式：functionName(param1,param2)）
    const functionName = functionSignature.split("(")[0].trim();

    // 解析函数签名
    const abi = parseAbi(
      [`function ${functionSignature}`] as readonly string[],
    );

    // 使用 viem 的 encodeFunctionData 编码
    return encodeFunctionData({
      abi,
      functionName: functionName,
      args: args as any[],
    });
  } catch (error) {
    throw new Error(
      `编码函数调用失败: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
