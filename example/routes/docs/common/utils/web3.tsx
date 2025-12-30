/**
 * 工具函数 - Web3 文档页面
 * 展示 DWeb 框架的 Web3 工具函数和使用方法
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "Web3 工具函数 - DWeb 框架文档",
  description:
    "DWeb 框架的 Web3 操作库，提供钱包连接、合约交互、交易处理、事件监听等功能",
};

export default function Web3Page(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 快速开始
  const quickStartCode = `import { createWeb3Client } from "@dreamer/dweb/utils";

// 创建 Web3 客户端
const web3 = createWeb3Client({
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
  chainId: 1,
});

// 连接钱包（浏览器环境）
const accounts = await web3.connectWallet();

// 获取余额
const balance = await web3.getBalanceInEth(accounts[0]);`;

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

// 获取余额（ETH）
const balanceEth = await web3.getBalanceInEth(address);

// 批量获取余额
const balances = await web3.getBalances([
  "0x...",
  "0x...",
  "0x...",
]);`;

  // 发送交易
  const transactionCode = `import { createWeb3Client } from "@dreamer/dweb/utils";

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
);`;

  // 事件监听
  const eventCode = `import { createWeb3Client } from "@dreamer/dweb/utils";

const web3 = createWeb3Client({
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
});

// 监听新区块
const offBlock = web3.onBlock((blockNumber, block) => {
  console.log(\`新区块: \${blockNumber}\`, block);
});

// 取消区块监听
offBlock();

// 监听交易
const offTransaction = web3.onTransaction((txHash, tx) => {
  console.log(\`新交易: \${txHash}\`, tx);
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
web3.offChainChanged();`;

  // 代币操作
  const tokenCode = `import { createWeb3Client } from "@dreamer/dweb/utils";

const web3 = createWeb3Client({
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
});

// 获取 ERC20 代币余额
const tokenBalance = await web3.getTokenBalance(
  "0x...", // 代币合约地址
  "0x...", // 持有者地址
);

// 获取 ERC20 代币信息
const tokenInfo = await web3.getTokenInfo("0x...");
// { name: "...", symbol: "...", decimals: 18, totalSupply: "..." }`;

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

// 获取历史区块
const blocks = await web3.getHistoryBlocks(1000, 2000);

// 获取区块中的交易
const transactions = await web3.getBlockTransactions(1000, true);

// 获取地址的交易历史
const txHistory = await web3.getAddressTransactions(
  "0x...",
  1000, // 起始区块（可选）
  2000, // 结束区块（可选）
);`;

  // 合约事件日志
  const eventLogsCode = `import { createWeb3Client } from "@dreamer/dweb/utils";

const web3 = createWeb3Client({
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
});

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
);`;

  // 其他常用方法
  const otherMethodsCode = `import { createWeb3Client } from "@dreamer/dweb/utils";

const web3 = createWeb3Client({
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
});

// 获取 Gas 限制
const gasLimit = await web3.getGasLimit();

// 获取费用数据（EIP-1559）
const feeData = await web3.getFeeData();
// { gasPrice: "...", maxFeePerGas: "...", maxPriorityFeePerGas: "..." }

// 检查地址是否为合约地址
const isContract = await web3.isContract("0x...");

// 获取合约代码
const code = await web3.getCode("0x...");

// 获取存储槽的值
const storageValue = await web3.getStorageAt("0x...", "0x0");`;

  // 工具函数
  const utilsCode = `import {
  fromWei,
  toWei,
  isAddress,
  formatAddress,
  shortenAddress,
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
const short = shortenAddress("0x742d35cc6634c0532925a3b844bc9e7595f0beb");

// 哈希和编码
const hash = await keccak256("hello world");
const bytes = hexToBytes("0x48656c6c6f");
const hex = bytesToHex(bytes);`;

  return (
    <article className="prose dark:prose-invert max-w-none">
      <h1>Web3 工具函数</h1>

      <p>
        Web3 操作库提供完整的 Web3
        相关功能，包括钱包连接、合约交互、交易处理、事件监听等。支持浏览器钱包（如
        MetaMask）和服务端操作。
      </p>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 my-6">
        <p className="text-blue-800 dark:text-blue-200 m-0">
          <strong>环境兼容性：</strong>
          客户端/服务端混合使用（钱包连接、签名等功能需要在浏览器环境使用，RPC
          调用、合约交互等功能可以在服务端使用）
        </p>
      </div>

      {/* 快速开始 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          快速开始
        </h2>
        <CodeBlock language="typescript" code={quickStartCode} />
      </section>

      {/* 钱包连接 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          钱包连接
        </h2>
        <CodeBlock language="typescript" code={walletCode} />
      </section>

      {/* 余额查询 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          余额查询
        </h2>
        <CodeBlock language="typescript" code={balanceCode} />
      </section>

      {/* 发送交易 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          发送交易
        </h2>
        <CodeBlock language="typescript" code={transactionCode} />
      </section>

      {/* 合约交互 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          合约交互
        </h2>
        <CodeBlock language="typescript" code={contractCode} />
      </section>

      {/* 事件监听 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          事件监听
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          支持监听新区块、交易、合约事件以及钱包账户变化和链切换。
        </p>
        <CodeBlock language="typescript" code={eventCode} />
      </section>

      {/* 代币操作 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          代币操作
        </h2>
        <CodeBlock language="typescript" code={tokenCode} />
      </section>

      {/* 区块和交易历史 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          区块和交易历史
        </h2>
        <CodeBlock language="typescript" code={historyCode} />
      </section>

      {/* 合约事件日志 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          合约事件日志
        </h2>
        <CodeBlock language="typescript" code={eventLogsCode} />
      </section>

      {/* 其他常用方法 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          其他常用方法
        </h2>
        <CodeBlock language="typescript" code={otherMethodsCode} />
      </section>

      {/* 工具函数 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          工具函数
        </h2>
        <CodeBlock language="typescript" code={utilsCode} />
      </section>

      {/* API 参考 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          API 参考
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          createWeb3Client
        </h3>
        <CodeBlock
          code={`const web3 = createWeb3Client({
  rpcUrl?: string; // RPC 节点 URL
  chainId?: number; // 链 ID
  network?: string; // 网络名称
  privateKey?: string; // 私钥（服务端操作）
});`}
          language="typescript"
        />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          主要方法
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mt-6 mb-3">
              基础方法
            </h4>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>
                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  connectWallet()
                </code>{" "}
                - 连接钱包（浏览器环境）
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  getAccounts()
                </code>{" "}
                - 获取当前连接的账户
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  getBalance(address)
                </code>{" "}
                - 获取余额（wei）
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  getBalanceInEth(address)
                </code>{" "}
                - 获取余额（ETH）
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  getBlockNumber()
                </code>{" "}
                - 获取当前区块号
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  getNetwork()
                </code>{" "}
                - 获取网络信息
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mt-6 mb-3">
              交易方法
            </h4>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>
                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  sendTransaction(options)
                </code>{" "}
                - 发送交易
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  waitForTransaction(txHash, confirmations?)
                </code>{" "}
                - 等待交易确认
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  getTransaction(txHash)
                </code>{" "}
                - 获取交易信息
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  getGasPrice()
                </code>{" "}
                - 获取 Gas 价格
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  estimateGas(options)
                </code>{" "}
                - 估算 Gas
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mt-6 mb-3">
              合约方法
            </h4>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>
                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  callContract(options)
                </code>{" "}
                - 调用合约函数（写入）
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  readContract(options)
                </code>{" "}
                - 读取合约数据（只读）
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  callContractWithABI(...)
                </code>{" "}
                - 使用完整 ABI 调用合约
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  getContractEventLogs(...)
                </code>{" "}
                - 读取合约事件日志
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  isContract(address)
                </code>{" "}
                - 检查是否为合约地址
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mt-6 mb-3">
              事件监听方法
            </h4>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>
                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  onBlock(callback)
                </code>{" "}
                - 监听新区块
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  onTransaction(callback)
                </code>{" "}
                - 监听交易
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  onContractEvent(...)
                </code>{" "}
                - 监听合约事件
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  onAccountsChanged(callback)
                </code>{" "}
                - 监听账户变化
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  onChainChanged(callback)
                </code>{" "}
                - 监听链切换
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 相关文档 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          相关文档
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <a
              href="/docs/core/application"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Application
            </a>{" "}
            - 应用核心
          </li>
          <li>
            <a
              href="/docs/core/api"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              API 路由
            </a>{" "}
            - API 路由系统
          </li>
        </ul>
      </section>
    </article>
  );
}
