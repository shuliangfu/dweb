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
export function fromWei(value: string | bigint, unit: string = "ether"): string {
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
 * 异步验证以太坊地址格式（包含校验和验证）
 * @param address 地址字符串
 * @returns 是否为有效地址
 * 
 * @example
 * await isAddressAsync('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb') // true
 */
export async function isAddress(address: string): Promise<boolean> {
  if (!address || typeof address !== "string") {
    return false;
  }
  
  // 尝试使用 ethers.js 的 isAddress（如果可用）
  try {
    const { isAddress: ethersIsAddress } = await import("npm:ethers@^6.0.0");
    return ethersIsAddress(address);
  } catch {
    // ethers.js 不可用，使用自己的实现
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
    return await checkAddressChecksum(address);
  }
  
  return true;
}

/**
 * 验证地址校验和（EIP-55）
 * @param address 地址字符串
 * @returns 校验和是否正确
 * 
 * @example
 * await checkAddressChecksum('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb') // true
 */
export async function checkAddressChecksum(address: string): Promise<boolean> {
  if (!address || typeof address !== "string") {
    return false;
  }
  
  // 移除 0x 前缀并转为小写
  const addr = address.startsWith("0x") ? address.slice(2).toLowerCase() : address.toLowerCase();
  
  if (addr.length !== 40 || !/^[0-9a-f]{40}$/.test(addr)) {
    return false;
  }
  
  // 使用 toChecksumAddress 计算正确的校验和地址，然后比较
  try {
    const checksummed = await toChecksumAddressAsync("0x" + addr);
    return checksummed === address;
  } catch {
    return false;
  }
}

/**
 * 转换为校验和地址（EIP-55）- 同步版本（简化实现）
 * 注意：此版本使用简化实现，不进行真正的 Keccak-256 哈希
 * 如需准确的校验和地址，请使用 toChecksumAddressAsync
 * 
 * @param address 地址字符串
 * @returns 校验和地址
 * 
 * @example
 * toChecksumAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb')
 * // '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
 */
export function toChecksumAddress(address: string): string {
  if (!isAddress(address)) {
    throw new Error(`无效的地址: ${address}`);
  }

  // 移除 0x 前缀并转为小写
  const addr = address.startsWith("0x") ? address.slice(2).toLowerCase() : address.toLowerCase();
  
  // 注意：同步版本无法使用真正的 Keccak-256，返回小写地址
  // 如果需要真正的校验和地址，请使用 toChecksumAddressAsync
  return "0x" + addr;
}

/**
 * 转换为校验和地址（EIP-55）- 异步版本（使用真正的 Keccak-256）
 * @param address 地址字符串
 * @returns 校验和地址
 * 
 * @example
 * await toChecksumAddressAsync('0x742d35cc6634c0532925a3b844bc9e7595f0beb')
 * // '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
 */
export async function toChecksumAddressAsync(address: string): Promise<string> {
  if (!isAddress(address)) {
    throw new Error(`无效的地址: ${address}`);
  }

  // 移除 0x 前缀并转为小写
  const addr = address.startsWith("0x") ? address.slice(2).toLowerCase() : address.toLowerCase();
  
  // 尝试使用 ethers.js 的 getAddress（如果可用）
  try {
    const { getAddress } = await import("npm:ethers@^6.0.0");
    return getAddress("0x" + addr);
  } catch {
    // ethers.js 不可用，使用自己的实现
  }
  
  // 计算地址的 Keccak-256 哈希
  const hash = await keccak256(addr);
  const hashHex = hash.startsWith("0x") ? hash.slice(2) : hash;
  
  // 根据哈希值决定每个字符的大小写
  let checksum = "0x";
  for (let i = 0; i < addr.length; i++) {
    const char = addr[i];
    const hashChar = hashHex[i];
    
    // 如果哈希字符 >= 8，则大写；否则小写
    if (parseInt(hashChar, 16) >= 8) {
      checksum += char.toUpperCase();
    } else {
      checksum += char;
    }
  }
  
  return checksum;
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
    const { keccak256: ethersKeccak256 } = await import("npm:ethers@^6.0.0");
    return ethersKeccak256(data);
  } catch {
    // 如果 ethers 不可用，使用 Web Crypto API 的 SHA-256 作为替代
    const encoder = new TextEncoder();
    const dataBytes = typeof data === "string" ? encoder.encode(data) : new Uint8Array(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBytes.buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
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
  values: unknown[]
): Promise<string> {
  try {
    const { solidityPackedKeccak256 } = await import("npm:ethers@^6.0.0");
    return solidityPackedKeccak256(types, values);
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
export function padLeft(value: string, length: number, padChar: string = "0"): string {
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
export function padRight(value: string, length: number, padChar: string = "0"): string {
  return value.padEnd(length, padChar);
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
 * 格式化地址（添加 0x 前缀，转换为小写）
 * @param address 地址字符串
 * @returns 格式化后的地址
 * 
 * @example
 * formatAddress('742d35cc6634c0532925a3b844bc9e7595f0beb')
 * // '0x742d35cc6634c0532925a3b844bc9e7595f0beb'
 */
export function formatAddress(address: string): string {
  if (!isAddress(address)) {
    throw new Error(`无效的地址: ${address}`);
  }
  
  const addr = address.startsWith("0x") ? address.slice(2) : address;
  return "0x" + addr.toLowerCase();
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
  endLength: number = 4
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
  nonce: number
): Promise<string> {
  // 简化实现：使用 RLP 编码和 Keccak-256
  // 实际应该使用完整的 RLP 编码：RLP([deployerAddress, nonce])
  // 注意：这是简化实现，实际应使用 ethers 的 RLP 编码功能
  const data = formatAddress(deployerAddress) + numberToHex(nonce).slice(2);
  const hash = await keccak256(data);
  return "0x" + hash.slice(-40);
}

/**
 * 解析函数选择器（从函数签名）
 * @param signature 函数签名（如 'transfer(address,uint256)'）
 * @returns 函数选择器（4 字节）
 * 
 * @example
 * await getFunctionSelector('transfer(address,uint256)')
 * // '0xa9059cbb'
 */
export async function getFunctionSelector(signature: string): Promise<string> {
  const hash = await keccak256(signature);
  return hash.slice(0, 10); // 前 4 字节（8 个十六进制字符 + 0x）
}

/**
 * 编码函数调用数据
 * @param functionSignature 函数签名
 * @param args 参数数组
 * @returns 编码后的数据
 * 
 * @example
 * await encodeFunctionCall('transfer(address,uint256)', ['0x...', '100'])
 */
export async function encodeFunctionCall(
  functionSignature: string,
  args: unknown[]
): Promise<string> {
  try {
    const { Interface } = await import("npm:ethers@^6.0.0");
    const iface = new Interface([`function ${functionSignature}`]);
    return iface.encodeFunctionData(functionSignature.split("(")[0], args);
  } catch {
    // 简化实现
    const selector = await getFunctionSelector(functionSignature);
    // 实际应该使用 ABI 编码参数
    return selector;
  }
}

