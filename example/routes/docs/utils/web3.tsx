/**
 * 工具函数 - Web3 文档页面
 * 展示 DWeb 框架的 Web3 工具函数和使用方法
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "Web3 工具函数 - DWeb 框架文档",
  description:
    "DWeb 框架的 Web3 操作库，提供钱包连接、合约交互、交易处理、事件监听等功能",
};

export default function Web3Page() {
  // 快速开始
  const quickStartCode =
    `import { createWeb3Client } from "@dreamer/dweb/utils";

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
import { fromWei } from "@dreamer/dweb/utils";
const balanceEth = fromWei(balance, "ether");`;

  // 钱包连接
  const walletCode = `import { createWeb3Client } from "@dreamer/dweb/utils";

const web3 = createWeb3Client();

// 连接钱包（浏览器环境，如 MetaMask）
try {
  const accounts = await web3.connectWallet();
  console.log("已连接账户:", accounts);
} catch (error) {
  console.error("连接失败:", error);
}

// 获取当前已连接的账户
const accounts = await web3.getAccounts();`;

  // 余额查询
  const balanceCode = `import { createWeb3Client } from "@dreamer/dweb/utils";

const web3 = createWeb3Client({
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
});

const address = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";

// 获取余额（wei）
const balanceWei = await web3.getBalance(address);

// 转换为 ETH：使用 fromWei 工具函数
import { fromWei } from "@dreamer/dweb/utils";
const balanceEth = fromWei(balanceWei, "ether");

// 批量获取余额
const balances = await web3.getBalances([
  "0x...",
  "0x...",
  "0x...",
]);`;

  // 发送交易
  const transactionCode =
    `import { createWeb3Client } from "@dreamer/dweb/utils";

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

// 获取交易信息
const tx = await web3.getTransaction(txHash);

// 获取交易收据
const receipt = await web3.getTransactionReceipt(txHash);`;

  // 合约交互
  const contractCode = `import { createWeb3Client } from "@dreamer/dweb/utils";

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

// 调用合约函数（写入操作）
const result = await web3.callContract({
  address: "0x...", // 合约地址
  abi: [
    "function transfer(address to, uint256 amount) returns (bool)",
  ], // 合约 ABI
  functionName: "transfer", // 函数名
  args: ["0x...", "100"], // 参数
  value: "0",
  gasLimit: "100000",
});`;

  // 事件监听
  const eventCode = `import { createWeb3Client } from "@dreamer/dweb/utils";

const web3 = createWeb3Client({
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
});

// 设置重连配置（可选）
// delay: 重连延迟（毫秒，默认 3000）
// maxAttempts: 最大重连次数（默认 10）
web3.setReconnectConfig(5000, 20); // 5秒延迟，最多重连20次

// 监听新区块（支持自动重连）
const offBlock = web3.onBlock((blockNumber, block) => {
  console.log(\`新区块: \${blockNumber}\`, block);
});

// 取消区块监听
offBlock();

// 监听交易（支持自动重连）
const offTransaction = web3.onTransaction((txHash, tx) => {
  console.log(\`新交易: \${txHash}\`, tx);
});

// 取消交易监听
offTransaction();

// 监听合约事件（如 ERC20 Transfer 事件，支持自动重连）
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
web3.offChainChanged();`;

  // 区块和交易历史
  const historyCode = `import { createWeb3Client } from "@dreamer/dweb/utils";

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

// 获取区块中的交易
const transactions = await web3.getBlockTransactions(1000, true);

// 获取地址的交易历史
const txHistory = await web3.getAddressTransactions(
  "0x...",
  1000, // 起始区块（可选）
  2000, // 结束区块（可选）
);`;

  // 扫描合约方法交易
  const scanMethodCode =
    `import { createWeb3Client } from "@dreamer/dweb/utils";

const web3 = createWeb3Client({
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
});

// 扫描 register 方法的所有调用（支持分页）
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

// 返回结果包含：
// - transactions: 交易数组（包含解析后的参数）
// - total: 总交易数
// - page: 当前页码
// - pageSize: 每页数量
// - totalPages: 总页数

// 遍历所有页
let currentPage = 1;
while (currentPage <= result.totalPages) {
  const pageResult = await web3.scanContractMethodTransactions(
    "0x...",
    "register(address,string)",
    { page: currentPage, pageSize: 20 },
  );

  for (const tx of pageResult.transactions) {
    console.log(\`交易: \${tx.hash}\`);
    if (tx.args) {
      console.log(\`参数: \${tx.args}\`);
    }
  }

  currentPage++;
}`;

  // 其他常用方法
  const otherMethodsCode =
    `import { createWeb3Client } from "@dreamer/dweb/utils";

const web3 = createWeb3Client({
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
});

// 获取 Gas 限制
const gasLimit = await web3.getGasLimit();

// 获取费用数据（EIP-1559）
const feeData = await web3.getFeeData();
// { gasPrice: "...", maxFeePerGas: "...", maxPriorityFeePerGas: "..." }

// 检查地址是否为合约地址
const isContract = await web3.isContract("0x...");`;

  // 工具函数
  const utilsCode = `import {
  fromWei,
  toWei,
  isAddress,
  formatAddress,
  shortenAddress,
  generateWallet,
  isPrivateKey,
  isTxHash,
  keccak256,
  hexToBytes,
  bytesToHex,
} from "@dreamer/dweb/utils";

// 单位转换
const eth = fromWei("1000000000000000000", "ether"); // "1.0"
const wei = toWei("1", "ether"); // "1000000000000000000"

// 地址验证和格式化
const isValid = isAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb");
const formatted = formatAddress("742d35cc6634c0532925a3b844bc9e7595f0beb");
// "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" (校验和格式)
const short = shortenAddress("0x742d35cc6634c0532925a3b844bc9e7595f0beb");

// 生成新钱包
const wallet = generateWallet();
console.log(wallet.address); // '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
console.log(wallet.privateKey); // '0x...'

// 验证工具
const isValidKey = isPrivateKey("0x..."); // true
const isValidHash = isTxHash("0x..."); // true

// 哈希和编码
const hash = await keccak256("hello world");
const bytes = hexToBytes("0x48656c6c6f");
const hex = bytesToHex(bytes);`;

  const createWeb3ClientCode = `const web3 = createWeb3Client({
  rpcUrl?: string; // RPC 节点 URL
  chainId?: number; // 链 ID
  network?: string; // 网络名称
  privateKey?: string; // 私钥（服务端操作）
});`;

  const content = {
    title: "Web3 工具函数",
    description:
      "Web3 操作库提供完整的 Web3 相关功能，包括钱包连接、合约交互、交易处理、事件监听等。支持浏览器钱包（如 MetaMask）和服务端操作。",
    sections: [
      {
        title: "",
        blocks: [
          {
            type: "alert",
            level: "info",
            content:
              "**环境兼容性**：客户端/服务端混合使用（钱包连接、签名等功能需要在浏览器环境使用，RPC 调用、合约交互等功能可以在服务端使用）",
          },
        ],
      },
      {
        title: "快速开始",
        blocks: [
          {
            type: "code",
            code: quickStartCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "钱包连接",
        blocks: [
          {
            type: "code",
            code: walletCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "余额查询",
        blocks: [
          {
            type: "code",
            code: balanceCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "发送交易",
        blocks: [
          {
            type: "code",
            code: transactionCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "合约交互",
        blocks: [
          {
            type: "code",
            code: contractCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "事件监听",
        blocks: [
          {
            type: "text",
            content:
              "支持监听新区块、交易、合约事件以及钱包账户变化和链切换。所有事件监听都支持自动重连功能。",
          },
          {
            type: "alert",
            level: "success",
            content:
              "**自动重连特性**：当连接中断时，区块监听、交易监听和合约事件监听会自动尝试重新连接。支持指数退避策略和最大重连次数限制。",
          },
          {
            type: "alert",
            level: "info",
            content:
              "**历史事件支持**：合约事件监听支持指定 `fromBlock` 参数。当指定起始区块时，系统会先扫描历史事件并触发回调，然后继续监听新事件。历史事件扫描是异步的，不会阻塞新事件的监听。",
          },
          {
            type: "code",
            code: eventCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "区块和交易历史",
        blocks: [
          {
            type: "code",
            code: historyCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "扫描合约方法交易",
        blocks: [
          {
            type: "text",
            content:
              "扫描合约指定方法的所有调用交易，支持分页和参数解析。适用于获取合约方法的完整调用历史，如用户注册记录等。",
          },
          {
            type: "code",
            code: scanMethodCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "其他常用方法",
        blocks: [
          {
            type: "code",
            code: otherMethodsCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "工具函数",
        blocks: [
          {
            type: "code",
            code: utilsCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "API 参考",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "createWeb3Client",
            blocks: [
              {
                type: "code",
                code: createWeb3ClientCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "主要方法",
            blocks: [
              {
                type: "subsection",
                level: 4,
                title: "基础方法",
                blocks: [
                  {
                    type: "list",
                    ordered: false,
                    items: [
                      "**`connectWallet()`** - 连接钱包（浏览器环境）",
                      "**`getAccounts()`** - 获取当前连接的账户",
                      "**`getBalance(address)`** - 获取余额（wei）",
                      "**`getBlockNumber()`** - 获取当前区块号",
                      "**`getNetwork()`** - 获取网络信息",
                    ],
                  },
                ],
              },
              {
                type: "subsection",
                level: 4,
                title: "交易方法",
                blocks: [
                  {
                    type: "list",
                    ordered: false,
                    items: [
                      "**`sendTransaction(options)`** - 发送交易",
                      "**`waitForTransaction(txHash, confirmations?)`** - 等待交易确认",
                      "**`getTransaction(txHash)`** - 获取交易信息",
                      "**`getGasPrice()`** - 获取 Gas 价格",
                      "**`estimateGas(options)`** - 估算 Gas",
                    ],
                  },
                ],
              },
              {
                type: "subsection",
                level: 4,
                title: "合约方法",
                blocks: [
                  {
                    type: "list",
                    ordered: false,
                    items: [
                      "**`callContract(options, waitForConfirmation?)`** - 调用合约函数（写入）",
                      "  - `waitForConfirmation`: 是否等待交易确认（默认 `true`）",
                      "  - 如果 `waitForConfirmation` 为 `true`，返回交易收据（包含 `status` 字段）",
                      "  - 如果 `waitForConfirmation` 为 `false`，返回交易哈希",
                      '  - 如果用户取消交易，会抛出 "交易已取消" 错误',
                      "  - `options.address` 和 `options.abi` 可选，如果未提供会使用配置中的默认值",
                      "**`readContract(options)`** - 读取合约数据（只读）",
                      "**`scanContractMethodTransactions(...)`** - 扫描合约指定方法的交易（支持分页）",
                      "**`isContract(address)`** - 检查是否为合约地址",
                    ],
                  },
                ],
              },
              {
                type: "subsection",
                level: 4,
                title: "事件监听方法",
                blocks: [
                  {
                    type: "list",
                    ordered: false,
                    items: [
                      "**`onBlock(callback)`** - 监听新区块（支持自动重连）",
                      "**`onTransaction(callback)`** - 监听交易（支持自动重连）",
                      "**`onContractEvent(...)`** - 监听合约事件（支持自动重连）",
                      "**`onAccountsChanged(callback)`** - 监听账户变化",
                      "**`onChainChanged(callback)`** - 监听链切换",
                      "**`setReconnectConfig(delay?, maxAttempts?)`** - 设置重连配置",
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        title: "相关文档",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "[Application](/docs/core/application) - 应用核心",
              "[API 路由](/docs/core/api) - API 路由系统",
            ],
          },
        ],
      },
    ],
  };

  return (
    <DocRenderer
      content={content as Parameters<typeof DocRenderer>[0]["content"]}
    />
  );
}
