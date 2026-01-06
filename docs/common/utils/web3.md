# Web3 操作库

提供 Web3 相关的操作功能，如钱包连接、合约交互、交易处理等。支持浏览器钱包（如 MetaMask）和服务端操作。

**环境兼容性：** 客户端/服务端混合使用（钱包连接、签名等功能需要在浏览器环境使用，RPC 调用、合约交互等功能可以在服务端使用）

## 快速开始

```typescript
import { createWeb3Client } from "@dreamer/dweb/utils/web3";

// 创建 Web3 客户端
const web3 = createWeb3Client({
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
  chainId: 1,
});

// 连接钱包（浏览器环境）
const accounts = await web3.connectWallet();

// 获取余额（wei）
const balance = await web3.getBalance(accounts[0]);
// 转换为 ETH：使用 fromWei 工具函数
import { fromWei } from "@dreamer/dweb/utils/web3";
const balanceEth = fromWei(balance, "ether");
```

#### 钱包连接

```typescript
import { createWeb3Client } from "@dreamer/dweb/utils/web3";

const web3 = createWeb3Client();

// 连接钱包（浏览器环境，如 MetaMask）
try {
  const accounts = await web3.connectWallet();
  console.log("已连接账户:", accounts);
} catch (error) {
  console.error("连接失败:", error);
}

// 获取当前已连接的账户
const accounts = await web3.getAccounts();
```

#### 余额查询

```typescript
import { createWeb3Client } from "@dreamer/dweb/utils/web3";

const web3 = createWeb3Client({
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
});

const address = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";

// 获取余额（wei）
const balanceWei = await web3.getBalance(address);

// 转换为 ETH：使用 fromWei 工具函数
import { fromWei } from "@dreamer/dweb/utils/web3";
const balanceEth = fromWei(balanceWei, "ether");
```

#### 发送交易

```typescript
import { createWeb3Client } from "@dreamer/dweb/utils/web3";

const web3 = createWeb3Client({
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
  privateKey: "YOUR_PRIVATE_KEY", // 服务端操作需要私钥
});

// 发送交易
const txHash = await web3.sendTransaction({
  to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  value: "1000000000000000000", // 1 ETH (wei)
});

// 等待交易确认
const receipt = await web3.waitForTransaction(txHash, 1);
```

#### 合约交互

```typescript
import { createWeb3Client } from "@dreamer/dweb/utils/web3";

const web3 = createWeb3Client({
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
  privateKey: "YOUR_PRIVATE_KEY",
  // 可选：在配置中设置默认的合约地址和 ABI
  address: "0x...", // 默认合约地址
  abi: [...], // 默认合约 ABI
});

// 调用合约函数（写入操作）
// 默认会等待交易确认并返回交易收据
try {
  const receipt = await web3.callContract({
    address: "0x...", // 可选：如果配置中已设置，可以不传
    abi: [...], // 可选：如果配置中已设置，可以不传
    functionName: "transfer",
    args: ["0x...", "1000000000000000000"],
    value: "0",
  });
  // receipt 包含交易收据，如果 receipt.status === "success" 表示交易成功
  console.log("交易成功:", receipt);
} catch (error) {
  // 如果用户取消交易，会抛出 "交易已取消" 错误
  if (error.message === "交易已取消") {
    console.log("用户取消了交易");
  } else {
    console.error("调用合约失败:", error);
  }
}

// 如果只需要交易哈希，不等待确认
const txHash = await web3.callContract({
  address: "0x...",
  functionName: "transfer",
  args: ["0x...", "1000000000000000000"],
  value: "0",
}, false); // 第二个参数设为 false，不等待确认

// 读取合约数据（只读操作）
const result = await web3.readContract({
  address: "0x...",
  functionName: "balanceOf",
  args: ["0x..."],
});
```

#### 消息签名

```typescript
import { createWeb3Client } from "@dreamer/dweb/utils/web3";

const web3 = createWeb3Client({
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
  privateKey: "YOUR_PRIVATE_KEY",
});

// 签名消息
const signature = await web3.signMessage("Hello, Web3!");

// 验证签名
const isValid = await web3.verifyMessage(
  "Hello, Web3!",
  signature,
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
);
```

#### 单位转换

```typescript
import { fromWei, toWei } from "@dreamer/dweb/utils/web3";

// Wei 转 Ether
const eth = fromWei("1000000000000000000", "ether"); // "1.0"

// Ether 转 Wei
const wei = toWei("1", "ether"); // "1000000000000000000"

// 支持的单位：wei, kwei, mwei, gwei, szabo, finney, ether
const gwei = toWei("1", "gwei"); // "1000000000"
```

#### 地址验证和格式化

```typescript
import {
  isAddress,
  toChecksumAddress,
  formatAddress,
  shortenAddress,
} from "@dreamer/dweb/utils/web3";

// 验证地址格式（包含校验和验证）
const isValid = isAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"); // true

// 转换为校验和地址
const checksummed = toChecksumAddress(
  "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
); // "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"

// 格式化地址（添加 0x 前缀，转换为校验和地址）
const formatted = formatAddress("742d35cc6634c0532925a3b844bc9e7595f0beb");
// "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"

// 缩短地址显示（用于 UI）
const short = shortenAddress("0x742d35cc6634c0532925a3b844bc9e7595f0beb");
// "0x742d...0beb"
```

#### 哈希和编码

```typescript
import {
  keccak256,
  solidityKeccak256,
  hexToBytes,
  bytesToHex,
  hexToNumber,
  numberToHex,
} from "@dreamer/dweb/utils/web3";

// Keccak-256 哈希
const hash = await keccak256("hello world"); // "0x..."

// Solidity Keccak-256 哈希（处理 ABI 编码）
const solidityHash = await solidityKeccak256(
  ["address", "uint256"],
  ["0x...", "100"],
);

// 十六进制和字节数组转换
const bytes = hexToBytes("0x48656c6c6f"); // Uint8Array([72, 101, 108, 108, 111])
const hex = bytesToHex(bytes); // "0x48656c6c6f"

// 十六进制和数字转换
const num = hexToNumber("0xff"); // 255
const hexNum = numberToHex(255); // "0xff"
```

#### 字符串工具

```typescript
import {
  stripHexPrefix,
  addHexPrefix,
  padLeft,
  padRight,
} from "@dreamer/dweb/utils/web3";

// 移除/添加 0x 前缀
const withoutPrefix = stripHexPrefix("0xff"); // "ff"
const withPrefix = addHexPrefix("ff"); // "0xff"

// 填充
const leftPadded = padLeft("ff", 4); // "00ff"
const rightPadded = padRight("ff", 4); // "ff00"
```

#### 验证工具

```typescript
import { isPrivateKey, isTxHash, generateWallet } from "@dreamer/dweb/utils/web3";

// 验证私钥格式
const isValidKey = isPrivateKey("0x..."); // true

// 验证交易哈希格式
const isValidHash = isTxHash("0x..."); // true

// 生成新钱包（返回地址和私钥）
const wallet = generateWallet();
console.log(wallet.address); // '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
console.log(wallet.privateKey); // '0x...'
```

#### 合约工具

```typescript
import {
  computeContractAddress,
} from "@dreamer/dweb/utils/web3";

// 计算合约地址（CREATE）
const contractAddress = await computeContractAddress(
  "0x...",
  0, // nonce
);
```

#### Web3Client API

**构造函数**

```typescript
const web3 = createWeb3Client({
  rpcUrl?: string; // RPC 节点 URL
  chainId?: number; // 链 ID
  network?: string; // 网络名称
  privateKey?: string; // 私钥（服务端操作）
  abi?: Abi; // 可选：默认合约 ABI（如果设置，调用合约时可以不传 abi）
  address?: string; // 可选：默认合约地址（如果设置，调用合约时可以不传 address）
});
```

**方法**

- `connectWallet()` - 连接钱包（浏览器环境）
- `getAccounts()` - 获取当前连接的账户
- `getBalance(address)` - 获取余额（wei）
- `getTransactionCount(address)` - 获取交易计数（nonce）
- `sendTransaction(options)` - 发送交易
- `waitForTransaction(txHash, confirmations?)` - 等待交易确认
- `callContract(options)` - 调用合约函数（写入）
- `readContract(options)` - 读取合约数据（只读）
- `signMessage(message)` - 签名消息
- `verifyMessage(message, signature, address)` - 验证消息签名
- `getGasPrice()` - 获取 Gas 价格
- `estimateGas(options)` - 估算 Gas
- `getTransaction(txHash)` - 获取交易信息
- `getTransactionReceipt(txHash)` - 获取交易收据
- `getBlock(blockNumber)` - 获取区块信息

#### 事件监听方法

```typescript
import { createWeb3Client } from "@dreamer/dweb/utils/web3";

const web3 = createWeb3Client({
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
});

// 监听新区块
const offBlock = web3.onBlock((blockNumber, block) => {
  console.log(`新区块: ${blockNumber}`, block);
});

// 取消区块监听
offBlock();

// 监听交易
const offTransaction = web3.onTransaction((txHash, tx) => {
  console.log(`新交易: ${txHash}`, tx);
});

// 取消交易监听
offTransaction();

// 监听合约事件（如 ERC20 Transfer 事件）
// 方式1：只监听新事件（从当前区块开始）
const offEvent = web3.onContractEvent(
  "0x...", // 合约地址
  "Transfer", // 事件名称
  (event) => {
    console.log("Transfer 事件:", event);
  },
  {
    abi: [
      "event Transfer(address indexed from, address indexed to, uint256 value)",
    ], // 可选：合约 ABI
  },
);

// 方式2：从指定区块开始监听（先扫描历史事件，然后继续监听新事件）
const offEventWithHistory = web3.onContractEvent(
  "0x...", // 合约地址
  "Transfer", // 事件名称
  (event) => {
    console.log("Transfer 事件:", event);
  },
  {
    fromBlock: 1000, // 从区块 1000 开始（会先扫描历史事件）
    toBlock: 2000, // 可选：限制历史扫描范围（默认到当前区块）
    abi: [
      "event Transfer(address indexed from, address indexed to, uint256 value)",
    ],
  },
);

// 取消合约事件监听
offEvent();
offEventWithHistory();

// 监听账户变化（钱包环境）
const offAccounts = web3.onAccountsChanged((accounts) => {
  console.log("账户变化:", accounts);
});

// 监听链切换（钱包环境）
const offChain = web3.onChainChanged((chainId) => {
  console.log("链切换:", chainId);
});

// 取消所有监听
web3.offBlock();
web3.offTransaction();
web3.offContractEvent("0x...", "Transfer");
web3.offAccountsChanged();
web3.offChainChanged();
```

#### 自动重连机制

所有事件监听（区块监听、交易监听、合约事件监听）都支持自动重连功能。当连接中断时，系统会自动尝试重新连接。

**特性：**
- **自动检测**：监听 provider 错误事件和操作失败，自动检测连接中断
- **指数退避**：重连延迟随重连次数递增（延迟 = 基础延迟 × 重连次数）
- **智能重置**：成功接收到事件后自动重置重连计数
- **最大重连次数**：默认最多重连 10 次，可配置
- **自动清理**：如果没有监听器了，自动停止重连

**配置重连参数：**

```typescript
import { createWeb3Client } from "@dreamer/dweb/utils/web3";

const web3 = createWeb3Client({
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
});

// 设置重连配置
// delay: 重连延迟（毫秒，默认 3000）
// maxAttempts: 最大重连次数（默认 10）
web3.setReconnectConfig(5000, 20); // 5秒延迟，最多重连20次

// 监听新区块（连接中断时会自动重连）
const offBlock = web3.onBlock((blockNumber, block) => {
  console.log(`新区块: ${blockNumber}`, block);
});
```

**重连行为：**
- 当 provider 发生错误时，自动触发重连
- 当获取区块/交易/事件失败时，自动触发重连
- 重连时会重置 provider，强制重新创建连接
- 重连成功后，监听器会继续正常工作

#### 其他常用方法

```typescript
import { createWeb3Client } from "@dreamer/dweb/utils/web3";

const web3 = createWeb3Client({
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
});

// 获取当前区块号
const blockNumber = await web3.getBlockNumber();

// 获取网络信息
const network = await web3.getNetwork();
// { chainId: 1, name: "mainnet" }

// 获取链 ID
const chainId = await web3.getChainId();

// 获取 Gas 限制
const gasLimit = await web3.getGasLimit();

// 获取费用数据（EIP-1559）
const feeData = await web3.getFeeData();
// { gasPrice: "...", maxFeePerGas: "...", maxPriorityFeePerGas: "..." }

// 批量获取账户余额
const balances = await web3.getBalances([
  "0x...",
  "0x...",
  "0x...",
]);

// 获取区块中的交易
const transactions = await web3.getBlockTransactions(1000, true);

// 获取地址的交易历史
const txHistory = await web3.getAddressTransactions(
  "0x...",
  1000, // 起始区块（可选）
  2000, // 结束区块（可选）
);

// 检查地址是否为合约地址
const isContract = await web3.isContract("0x...");
```

#### 扫描合约方法交易

扫描合约指定方法的所有调用交易，支持分页和参数解析。

```typescript
import { createWeb3Client } from "@dreamer/dweb/utils/web3";

const web3 = createWeb3Client({
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
});

// 扫描 register 方法的所有调用
const result = await web3.scanContractMethodTransactions(
  "0x...", // 合约地址
  "register(address,string)", // 函数签名
  {
    fromBlock: 1000, // 起始区块（可选，默认最近 10000 个区块）
    toBlock: 2000, // 结束区块（可选，默认最新区块）
    page: 1, // 页码（默认 1）
    pageSize: 20, // 每页数量（默认 20）
    abi: [
      // 可选：完整 ABI，用于解析函数参数
      "function register(address user, string name)",
    ],
  },
);

// 返回结果
// {
//   transactions: [
//     {
//       hash: "0x...",
//       from: "0x...",
//       to: "0x...",
//       blockNumber: 1500,
//       blockHash: "0x...",
//       timestamp: 1234567890,
//       gasUsed: "21000",
//       gasPrice: "20000000000",
//       value: "0",
//       data: "0x...",
//       args: ["0x...", "用户名"], // 解析后的函数参数（如果提供了 ABI）
//       receipt: {...}, // 交易收据（可选）
//     },
//     // ...
//   ],
//   total: 100, // 总交易数
//   page: 1, // 当前页码
//   pageSize: 20, // 每页数量
//   totalPages: 5, // 总页数
// }

// 遍历所有页
let currentPage = 1;
let hasMore = true;

while (hasMore) {
  const result = await web3.scanContractMethodTransactions(
    "0x...",
    "register(address,string)",
    {
      page: currentPage,
      pageSize: 20,
    },
  );

  console.log(`第 ${currentPage} 页，共 ${result.totalPages} 页`);
  console.log(`找到 ${result.transactions.length} 条交易`);

  // 处理交易
  for (const tx of result.transactions) {
    console.log(`交易哈希: ${tx.hash}`);
    if (tx.args) {
      console.log(`参数:`, tx.args);
    }
  }

  // 检查是否还有下一页
  hasMore = currentPage < result.totalPages;
  currentPage++;
}
```

**完整方法列表**

**基础方法：**
- `connectWallet()` - 连接钱包（浏览器环境）
- `getAccounts()` - 获取当前连接的账户
- `getBalance(address)` - 获取余额（wei）
- `getBalances(addresses[])` - 批量获取余额
- `getTransactionCount(address)` - 获取交易计数（nonce）
- `getBlockNumber()` - 获取当前区块号
- `getNetwork()` - 获取网络信息
- `getChainId()` - 获取链 ID
- `getGasLimit(blockNumber?)` - 获取 Gas 限制
- `getFeeData()` - 获取费用数据（EIP-1559）

**交易方法：**
- `sendTransaction(options)` - 发送交易
- `waitForTransaction(txHash, confirmations?)` - 等待交易确认
- `getTransaction(txHash)` - 获取交易信息
- `getTransactionReceipt(txHash)` - 获取交易收据
- `getGasPrice()` - 获取 Gas 价格
- `estimateGas(options)` - 估算 Gas

**合约方法：**
- `callContract(options, waitForConfirmation?)` - 调用合约函数（写入）
  - `waitForConfirmation`: 是否等待交易确认（默认 `true`）
  - 如果 `waitForConfirmation` 为 `true`，返回交易收据（包含 `status` 字段）
  - 如果 `waitForConfirmation` 为 `false`，返回交易哈希
  - 如果用户取消交易，会抛出 "交易已取消" 错误
  - `options.address` 和 `options.abi` 可选，如果未提供会使用配置中的默认值
- `readContract(options)` - 读取合约数据（只读）
- `isContract(address)` - 检查是否为合约地址

**区块方法：**
- `getBlock(blockNumber?)` - 获取区块信息
- `getBlockTransactions(blockNumber, includeTransactions?)` - 获取区块中的交易
- `getAddressTransactions(address, fromBlock?, toBlock?)` - 获取地址的交易历史
- `scanContractMethodTransactions(contractAddress, functionSignature, options?)` - 扫描合约指定方法的交易信息（支持分页和参数解析）

**事件监听方法：**
- `onBlock(callback)` - 监听新区块，返回取消函数（支持自动重连）
- `offBlock()` - 取消所有区块监听
- `onTransaction(callback)` - 监听交易，返回取消函数（支持自动重连）
- `offTransaction()` - 取消所有交易监听
- `onContractEvent(address, eventName, callback, options?)` - 监听合约事件，返回取消函数（支持自动重连）
  - `options.abi` - 合约 ABI（可选）
  - `options.fromBlock` - 起始区块号（可选，如果指定则先扫描历史事件，然后继续监听新事件）
  - `options.toBlock` - 结束区块号（可选，仅在 fromBlock 指定时有效，用于限制历史扫描范围）
- `offContractEvent(address, eventName?)` - 取消合约事件监听
- `onAccountsChanged(callback)` - 监听账户变化（钱包环境），返回取消函数
- `offAccountsChanged()` - 取消账户变化监听
- `onChainChanged(callback)` - 监听链切换（钱包环境），返回取消函数
- `offChainChanged()` - 取消链切换监听
- `setReconnectConfig(delay?, maxAttempts?)` - 设置重连配置（延迟和最大重连次数）

**注意：**
- 事件监听默认只监听新事件（从当前区块开始）
- 对于旧区块的事件，需要指定 `fromBlock` 参数，系统会先扫描历史事件，然后继续监听新事件
- 历史事件扫描是异步的，不会阻塞新事件的监听

**签名方法：**
- `signMessage(message)` - 签名消息
- `verifyMessage(message, signature, address)` - 验证消息签名
