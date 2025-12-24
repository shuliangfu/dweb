### Web3 操作库

提供 Web3 相关的操作功能，如钱包连接、合约交互、交易处理等。支持浏览器钱包（如 MetaMask）和服务端操作。

#### 快速开始

```typescript
import { createWeb3Client } from "@dreamer/dweb/extensions";

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
import { createWeb3Client } from "@dreamer/dweb/extensions";

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
import { createWeb3Client } from "@dreamer/dweb/extensions";

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
import { createWeb3Client } from "@dreamer/dweb/extensions";

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
import { createWeb3Client } from "@dreamer/dweb/extensions";

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
import { createWeb3Client } from "@dreamer/dweb/extensions";

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
import { fromWei, toWei } from "@dreamer/dweb/extensions";

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
} from "@dreamer/dweb/extensions";

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
} from "@dreamer/dweb/extensions";

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
} from "@dreamer/dweb/extensions";

// 移除/添加 0x 前缀
const withoutPrefix = stripHexPrefix("0xff"); // "ff"
const withPrefix = addHexPrefix("ff"); // "0xff"

// 填充
const leftPadded = padLeft("ff", 4); // "00ff"
const rightPadded = padRight("ff", 4); // "ff00"
```

#### 验证工具

```typescript
import { isPrivateKey, isTxHash } from "@dreamer/dweb/extensions";

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
} from "@dreamer/dweb/extensions";

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
