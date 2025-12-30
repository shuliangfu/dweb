# Web3 操作库

提供 Web3 相关的操作功能，如钱包连接、合约交互、交易处理等。支持浏览器钱包（如 MetaMask）和服务端操作。

**环境兼容性：** 客户端/服务端混合使用（钱包连接、签名等功能需要在浏览器环境使用，RPC 调用、合约交互等功能可以在服务端使用）

## 快速开始

```typescript
import { createWeb3Client } from "@dreamer/dweb/utils";

// 创建 Web3 客户端
const web3 = createWeb3Client({
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
  chainId: 1,
});

// 连接钱包（浏览器环境）
const accounts = await web3.connectWallet();

// 获取余额
const balance = await web3.getBalanceInEth(accounts[0]);
```

#### 钱包连接

```typescript
import { createWeb3Client } from "@dreamer/dweb/utils";

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
import { createWeb3Client } from "@dreamer/dweb/utils";

const web3 = createWeb3Client({
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
});

const address = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";

// 获取余额（wei）
const balanceWei = await web3.getBalance(address);

// 获取余额（ETH）
const balanceEth = await web3.getBalanceInEth(address);
```

#### 发送交易

```typescript
import { createWeb3Client } from "@dreamer/dweb/utils";

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
import { createWeb3Client } from "@dreamer/dweb/utils";

const web3 = createWeb3Client({
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
  privateKey: "YOUR_PRIVATE_KEY",
});

// 调用合约函数（写入操作）
const txHash = await web3.callContract({
  address: "0x...",
  functionName: "transfer",
  args: ["0x...", "1000000000000000000"],
  value: "0",
});

// 读取合约数据（只读操作）
const result = await web3.readContract({
  address: "0x...",
  functionName: "balanceOf",
  args: ["0x..."],
});
```

#### 消息签名

```typescript
import { createWeb3Client } from "@dreamer/dweb/utils";

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
import { fromWei, toWei } from "@dreamer/dweb/utils";

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
  isAddressAsync,
  toChecksumAddress,
  toChecksumAddressAsync,
  formatAddress,
  shortenAddress,
} from "@dreamer/dweb/utils";

// 验证地址格式（同步，基本检查）
const isValid = isAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"); // true

// 验证地址（异步，包含校验和验证）
const isValidFull = await isAddressAsync(
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
); // true

// 转换为校验和地址（异步，推荐）
const checksummed = await toChecksumAddressAsync(
  "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
); // "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"

// 格式化地址（添加 0x 前缀，转小写）
const formatted = formatAddress("742d35cc6634c0532925a3b844bc9e7595f0beb");
// "0x742d35cc6634c0532925a3b844bc9e7595f0beb"

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
} from "@dreamer/dweb/utils";

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
} from "@dreamer/dweb/utils";

// 移除/添加 0x 前缀
const withoutPrefix = stripHexPrefix("0xff"); // "ff"
const withPrefix = addHexPrefix("ff"); // "0xff"

// 填充
const leftPadded = padLeft("ff", 4); // "00ff"
const rightPadded = padRight("ff", 4); // "ff00"
```

#### 验证工具

```typescript
import { isPrivateKey, isTxHash } from "@dreamer/dweb/utils";

// 验证私钥格式
const isValidKey = isPrivateKey("0x..."); // true

// 验证交易哈希格式
const isValidHash = isTxHash("0x..."); // true
```

#### 合约工具

```typescript
import {
  computeContractAddress,
  getFunctionSelector,
  encodeFunctionCall,
} from "@dreamer/dweb/utils";

// 计算合约地址（CREATE）
const contractAddress = await computeContractAddress(
  "0x...",
  0, // nonce
);

// 获取函数选择器
const selector = await getFunctionSelector("transfer(address,uint256)");
// "0xa9059cbb"

// 编码函数调用数据
const encoded = await encodeFunctionCall("transfer(address,uint256)", [
  "0x...",
  "100",
]);
```

#### Web3Client API

**构造函数**

```typescript
const web3 = createWeb3Client({
  rpcUrl?: string; // RPC 节点 URL
  chainId?: number; // 链 ID
  network?: string; // 网络名称
  privateKey?: string; // 私钥（服务端操作）
});
```

**方法**

- `connectWallet()` - 连接钱包（浏览器环境）
- `getAccounts()` - 获取当前连接的账户
- `getBalance(address)` - 获取余额（wei）
- `getBalanceInEth(address)` - 获取余额（ETH）
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
import { createWeb3Client } from "@dreamer/dweb/utils";

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
const offEvent = web3.onContractEvent(
  "0x...", // 合约地址
  "Transfer", // 事件名称
  (event) => {
    console.log("Transfer 事件:", event);
  },
  [
    "event Transfer(address indexed from, address indexed to, uint256 value)",
  ], // 可选：合约 ABI
);

// 取消合约事件监听
offEvent();

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

#### 其他常用方法

```typescript
import { createWeb3Client } from "@dreamer/dweb/utils";

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

// 获取 ERC20 代币余额
const tokenBalance = await web3.getTokenBalance(
  "0x...", // 代币合约地址
  "0x...", // 持有者地址
);

// 获取 ERC20 代币信息
const tokenInfo = await web3.getTokenInfo("0x...");
// { name: "...", symbol: "...", decimals: 18, totalSupply: "..." }

// 获取历史区块
const blocks = await web3.getHistoryBlocks(1000, 2000);

// 获取区块中的交易
const transactions = await web3.getBlockTransactions(1000, true);

// 获取地址的交易历史
const txHistory = await web3.getAddressTransactions(
  "0x...",
  1000, // 起始区块（可选）
  2000, // 结束区块（可选）
);

// 使用完整 ABI 调用合约
const result = await web3.callContractWithABI(
  "0x...", // 合约地址
  [
    "function transfer(address to, uint256 amount) returns (bool)",
  ], // 完整 ABI
  "transfer", // 函数名
  ["0x...", "100"], // 参数
  {
    readOnly: false, // 是否为只读操作
    value: "0",
    gasLimit: "100000",
  },
);

// 读取合约事件日志
const logs = await web3.getContractEventLogs(
  "0x...", // 合约地址
  "Transfer", // 事件名称
  [
    "event Transfer(address indexed from, address indexed to, uint256 value)",
  ], // 事件 ABI
  1000, // 起始区块（可选）
  2000, // 结束区块（可选）
  { from: "0x..." }, // 事件参数过滤器（可选）
);

// 检查地址是否为合约地址
const isContract = await web3.isContract("0x...");

// 获取合约代码
const code = await web3.getCode("0x...");

// 获取存储槽的值
const storageValue = await web3.getStorageAt("0x...", "0x0");
```

**完整方法列表**

**基础方法：**
- `connectWallet()` - 连接钱包（浏览器环境）
- `getAccounts()` - 获取当前连接的账户
- `getBalance(address)` - 获取余额（wei）
- `getBalanceInEth(address)` - 获取余额（ETH）
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
- `callContract(options)` - 调用合约函数（写入）
- `readContract(options)` - 读取合约数据（只读）
- `callContractWithABI(address, abi, functionName, args, options)` - 使用完整 ABI 调用合约
- `getContractEventLogs(address, eventName, abi, fromBlock?, toBlock?, filter?)` - 读取合约事件日志
- `isContract(address)` - 检查是否为合约地址
- `getCode(address)` - 获取合约代码
- `getStorageAt(address, slot)` - 获取存储槽的值

**代币方法：**
- `getTokenBalance(tokenAddress, ownerAddress)` - 获取 ERC20 代币余额
- `getTokenInfo(tokenAddress)` - 获取 ERC20 代币信息

**区块方法：**
- `getBlock(blockNumber?)` - 获取区块信息
- `getHistoryBlocks(fromBlock, toBlock?)` - 获取历史区块
- `getBlockTransactions(blockNumber, includeTransactions?)` - 获取区块中的交易
- `getAddressTransactions(address, fromBlock?, toBlock?)` - 获取地址的交易历史

**事件监听方法：**
- `onBlock(callback)` - 监听新区块，返回取消函数
- `offBlock()` - 取消所有区块监听
- `onTransaction(callback)` - 监听交易，返回取消函数
- `offTransaction()` - 取消所有交易监听
- `onContractEvent(address, eventName, callback, abi?)` - 监听合约事件，返回取消函数
- `offContractEvent(address, eventName?)` - 取消合约事件监听
- `onAccountsChanged(callback)` - 监听账户变化（钱包环境），返回取消函数
- `offAccountsChanged()` - 取消账户变化监听
- `onChainChanged(callback)` - 监听链切换（钱包环境），返回取消函数
- `offChainChanged()` - 取消链切换监听

**签名方法：**
- `signMessage(message)` - 签名消息
- `verifyMessage(message, signature, address)` - 验证消息签名
