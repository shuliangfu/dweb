import { createEffect, createSignal, onCleanup } from "@dreamer/view";
import { Client } from "@dreamer/websocket/client";

// import "../assets/index.css";

/**
 * 页面 Tailwind 类名（全部提取为静态对象，便于生产构建扫描）
 */
const classes = {
  page: "py-5",
  hero:
    "mb-10 rounded-xl bg-linear-to-br from-[#667eea] to-[#764ba2] px-5 py-15 text-center text-white",
  heroTitle: "mb-4 text-4xl",
  heroDesc: "text-xl text-white/90",
  section: "mb-10",
  sectionTitle: "mb-8 text-center",
  featureGrid: "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4",
  featureCard: "rounded-lg bg-white p-6 shadow-md",
  featureCardTitle: "mb-2.5 text-[#667eea]",
  socketSection: "rounded-xl border border-gray-200 bg-white p-6 shadow-md",
  /** socket 模块（WebSocket 示例）的外边距：与上方计数器模块的间距 */
  socketSectionOuter: "mt-8",
  socketTitle: "mb-4 text-center text-[#667eea]",
  socketDesc: "mb-4 text-center text-sm text-gray-500",
  statusBadgeWrap: "mb-4 flex items-center justify-center gap-2",
  inputWrap: "mb-4 flex gap-2",
  statusBadge: "inline-flex rounded-full px-3 py-1 text-sm font-medium",
  input:
    "flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-none focus:border-[#667eea] focus:outline-none focus:ring-2 focus:ring-[#667eea]/30",
  sendBtn:
    "rounded-lg border-0 bg-[#667eea] px-4 py-2 text-white shadow-none transition-colors hover:bg-[#5a6fd6]",
  messageBox:
    "max-h-48 overflow-y-auto rounded border border-gray-100 bg-gray-50 p-3",
  messageEmpty: "text-center text-gray-400",
  messageList: "space-y-2",
  messageSent: "text-right text-blue-600",
  messageReceived: "text-left text-gray-700",
};

/** 是否输出调试日志（开发时设为 true） */
const DEBUG = false;
const debugLog = (...args: unknown[]) => {
  if (
    DEBUG &&
    typeof globalThis !== "undefined" &&
    (globalThis as { console?: Console }).console
  ) {
    (globalThis as { console: Console }).console.log(
      "[WebSocket 调试]",
      ...args,
    );
  }
};

/** 单条消息：发送或接收 */
interface ChatMessage {
  /** 类型：发送 / 接收 */
  type: "sent" | "received";
  /** 内容 */
  text: string;
  /** 时间戳 */
  at: number;
}

/** 连接状态 */
type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

/** 状态徽章 Tailwind 类名（按连接状态，静态提取） */
const statusBadgeClasses: Record<ConnectionStatus, string> = {
  idle: "bg-gray-100 text-gray-800",
  connecting: "bg-yellow-100 text-yellow-800",
  connected: "bg-green-100 text-green-800",
  disconnected: "bg-gray-100 text-gray-800",
  error: "bg-red-100 text-red-800",
};

/**
 * 将 HTTP(S) URL 转为 WebSocket URL
 */
function toWsUrl(origin: string, path: string): string {
  const u = origin.replace(/^http/, "ws");
  return `${u.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * 首页组件
 * 路由: /
 * 包含 WebSocket 客户端示例：连接状态、发送消息、接收消息
 */
/** 首页元数据（常量），用于生成 <title> / <meta> */
export const metadata = {
  title: "首页 - Dweb Basic",
  description: "Dweb 示例项目首页",
};
export default function Home() {
  const clientRef: { current: Client | null } = { current: null };
  const [count, setCount] = createSignal(0);
  const [status, setStatus] = createSignal<ConnectionStatus>("idle");
  const [messages, setMessages] = createSignal<ChatMessage[]>([]);
  const [input, setInput] = createSignal("");

  createEffect(() => {
    // 仅在浏览器环境创建客户端（避免 SSR 时访问 location）
    const origin = typeof globalThis !== "undefined" &&
        (globalThis as { location?: Location }).location
      ? (globalThis as { location: Location }).location.origin
      : "http://localhost:3012";
    const wsUrl = toWsUrl(origin, "/ws");

    debugLog("连接目标:", wsUrl);

    const client = new Client({
      url: wsUrl,
      autoReconnect: true,
    });
    clientRef.current = client;
    debugLog("Client 已创建，开始连接…");

    const onOpen = () => {
      debugLog("✓ open 事件触发，已连接");
      setStatus("connected");
    };
    const onClose = (_data?: { code?: number; reason?: string }) => {
      debugLog("✗ close 事件触发");
      setStatus("disconnected");
    };
    const onError = (_err: unknown) => {
      debugLog("✗ error 事件触发");
      setStatus("error");
    };
    const onReconnectAttempt = (_attempt?: number) => {
      debugLog("↻ reconnect_attempt 事件触发，自动重连中…");
      setStatus("connecting");
    };
    const onReconnectFailed = () => {
      debugLog("✗ reconnect_failed 事件触发，重连已放弃");
      setStatus("error");
    };
    const onChatResponse = (data: { text?: string; message?: string }) => {
      const text = typeof data === "string"
        ? data
        : (data?.text ?? data?.message ?? JSON.stringify(data));
      debugLog("← chat-response 收到:", text);
      setMessages((prev) => [
        ...prev,
        { type: "received", text, at: Date.now() },
      ]);
    };

    client.on("open", onOpen);
    client.on("close", onClose);
    client.on("error", onError);
    client.on("reconnect_attempt", onReconnectAttempt);
    client.on("reconnect_failed", onReconnectFailed);
    client.on("chat-response", onChatResponse);

    setStatus("connecting");
    debugLog("事件监听器已注册，status → connecting");

    onCleanup(() => {
      client.off("open", onOpen);
      client.off("close", onClose);
      client.off("error", onError);
      client.off("reconnect_attempt", onReconnectAttempt);
      client.off("reconnect_failed", onReconnectFailed);
      client.off("chat-response", onChatResponse);
      client.disconnect();
      clientRef.current = null;
    });
  }, []);

  /** 发送一条消息到服务端（事件名 chat-message，需服务端监听并可选回发 chat-response） */
  const handleSend = () => {
    const text = input().trim();
    if (!text) return;
    const client = clientRef.current;
    if (client?.connected) {
      debugLog("→ chat-message 发送:", text);
      client.emit("chat-message", { text });
      setMessages((prev) => [...prev, { type: "sent", text, at: Date.now() }]);
      setInput("");
    } else {
      debugLog("→ 发送失败：未连接");
      setMessages((prev) => [
        ...prev,
        { type: "sent", text: `[未连接] ${text}`, at: Date.now() },
      ]);
      setInput("");
    }
  };

  const statusLabel: Record<ConnectionStatus, string> = {
    idle: "未连接",
    connecting: "连接中…",
    connected: "已连接",
    disconnected: "已断开",
    error: "连接失败",
  };

  return (
    <div class={classes.page}>
      <section class={classes.hero}>
        <h1 class={classes.heroTitle}>欢迎使用 Dweb 框架</h1>
        <p class={classes.heroDesc}>
          这是一个使用 @dreamer/dweb 框架构建的 View 示例项目
        </p>
      </section>

      <section class={classes.section}>
        <h2 class="mb-8 text-center text-2xl font-bold tracking-wide bg-clip-text text-transparent bg-linear-to-r from-[#667eea] to-[#764ba2]">
          特性
        </h2>
        <div class={classes.featureGrid}>
          <div class={classes.featureCard}>
            <h3 class={classes.featureCardTitle}>文件路由</h3>
            <p>基于文件系统的路由，无需手动配置</p>
          </div>
          <div class={classes.featureCard}>
            <h3 class={classes.featureCardTitle}>SSR 渲染</h3>
            <p>服务端渲染，提供最佳首屏性能</p>
          </div>
          <div class={classes.featureCard}>
            <h3 class={classes.featureCardTitle}>TypeScript</h3>
            <p>完整的 TypeScript 支持</p>
          </div>
          <div class={classes.featureCard}>
            <h3 class={classes.featureCardTitle}>View</h3>
            <p>轻量级响应式视图引擎</p>
          </div>
        </div>
      </section>

      <section class={classes.socketSection}>
        <h2 class={classes.socketTitle}>计数器示例</h2>
        <p class={classes.socketDesc}>View 细粒度渲染：仅此块随 count 更新</p>
        {() => (
          <div class="flex flex-col items-center justify-center gap-4">
            <span class="text-2xl font-semibold">count: {count()}</span>
            <div class="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                class="rounded-lg border-0 bg-[#667eea] px-4 py-2 text-white hover:opacity-90"
                onClick={() => setCount(count() + 1)}
              >
                加一
              </button>
              <button
                type="button"
                class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
                onClick={() => setCount(count() - 1)}
              >
                减一
              </button>
              <button
                type="button"
                class="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-gray-600 hover:bg-gray-200"
                onClick={() => setCount(0)}
              >
                重置
              </button>
            </div>
          </div>
        )}
      </section>

      {/* WebSocket 客户端示例：整块包成动态子节点，仅此槽位随 status/input/messages 更新，避免整页重跑（含其他 section）；mt-8 与上方计数器模块留出间距 */}
      <section class={`${classes.socketSection} ${classes.socketSectionOuter}`}>
        <h2 class={classes.socketTitle}>WebSocket 客户端示例</h2>
        <p class={classes.socketDesc}>
          使用 @dreamer/websocket/client 的 Client：连接、自动重连、发送
          chat-message、接收 chat-response
        </p>
        {() => (
          <>
            <div class={classes.statusBadgeWrap}>
              <span
                class={`${classes.statusBadge} ${statusBadgeClasses[status()]}`}
              >
                {statusLabel[status()]}
              </span>
            </div>
            <div class={classes.inputWrap}>
              <input
                type="text"
                class={classes.input}
                placeholder="输入消息并发送 (chat-message)"
                value={input()}
                onInput={(e) => setInput((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <button
                type="button"
                class={classes.sendBtn}
                onClick={handleSend}
              >
                发送
              </button>
            </div>
            <div class={classes.messageBox}>
              {messages().length === 0
                ? (
                  <p class={classes.messageEmpty}>
                    暂无消息。发送后显示在这里。
                  </p>
                )
                : (
                  <ul class={classes.messageList}>
                    {messages().map((msg, i) => (
                      <li
                        key={`${msg.at}-${i}`}
                        class={msg.type === "sent"
                          ? classes.messageSent
                          : classes.messageReceived}
                      >
                        {msg.type === "sent" ? "→ " : "← "}
                        {msg.text}
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
