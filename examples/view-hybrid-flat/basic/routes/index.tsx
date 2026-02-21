import { Client } from "@dreamer/socket-io/client";
import { createEffect, createSignal, onCleanup } from "@dreamer/view";

/**
 * 页面 UnoCSS 类名（全部提取为静态对象，便于 unocssPlugin 扫描）
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
  /** socket 模块（Socket.IO 示例）的外边距：与上方计数器模块的间距 */
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

/** 连接状态 */
type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

/** 状态徽章 UnoCSS 类名（按连接状态） */
const statusBadgeClasses: Record<ConnectionStatus, string> = {
  idle: "bg-gray-100 text-gray-800",
  connecting: "bg-yellow-100 text-yellow-800",
  connected: "bg-green-100 text-green-800",
  disconnected: "bg-gray-100 text-gray-800",
  error: "bg-red-100 text-red-800",
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
      "[Socket.IO 调试]",
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

/**
 * 首页组件（View 细粒度渲染）
 * 路由: /
 * - 仅依赖 count 的 UI 包在 {() => (...)} 中，count 变化时只重跑该块
 * - 仅依赖 status/input/messages 的 Socket.IO 区块同理，避免整页重跑
 * 包含 Socket.IO 客户端示例：连接状态、发送消息、接收消息
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
    console.log("clientRef.current", new Date().toISOString());

    const origin = typeof globalThis !== "undefined" &&
        (globalThis as { location?: Location }).location
      ? (globalThis as { location: Location }).location.origin
      : "http://localhost:3015";

    debugLog(
      "连接目标:",
      origin,
      "→ 握手 URL:",
      `${origin.replace(/\/$/, "")}/socket.io/`,
    );

    const client = new Client({
      url: origin,
      namespace: "/",
      autoConnect: true,
      autoReconnect: true,
      // 仅用 WebSocket，避免回退到 long-polling 导致请求过多、多 session
      transports: ["websocket"],
    });
    clientRef.current = client;
    debugLog("Client 已创建，开始连接…");

    const onConnect = () => {
      debugLog("✓ connect 事件触发，已连接");
      setStatus("connected");
    };
    const onDisconnect = (reason?: unknown) => {
      debugLog("✗ disconnect 事件触发，原因:", reason);
      setStatus("disconnected");
    };
    const onConnectError = (err: unknown) => {
      debugLog("✗ connect_error 事件触发:", err);
      setStatus("error");
    };
    const onReconnecting = (attempt?: number) => {
      debugLog("↻ reconnecting 事件触发，自动重连中…", "第", attempt, "次");
      setStatus("connecting");
    };
    const onReconnectFailed = () => {
      debugLog("✗ reconnect_failed 事件触发，重连已放弃");
      setStatus("error");
    };
    // 监听服务端推送的 chat-response 事件（需服务端配合发送）
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

    client.on("connect", onConnect);
    client.on("disconnect", onDisconnect);
    client.on("connect_error", onConnectError);
    client.on("reconnecting", onReconnecting);
    client.on("reconnect_failed", onReconnectFailed);
    client.on("chat-response", onChatResponse);

    setStatus("connecting");
    debugLog("事件监听器已注册，status → connecting");

    onCleanup(() => {
      client.off("connect", onConnect);
      client.off("disconnect", onDisconnect);
      client.off("connect_error", onConnectError);
      client.off("reconnecting", onReconnecting);
      client.off("reconnect_failed", onReconnectFailed);
      client.off("chat-response", onChatResponse);
      client.disconnect();
      clientRef.current = null;
    });
  });

  /** 发送一条消息到服务端（事件名 chat-message，需服务端监听并可选回发 chat-response） */
  const handleSend = () => {
    const text = input().trim();
    if (!text) return;
    const client = clientRef.current;
    if (client?.isConnected()) {
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
          这是一个使用 @dreamer/dweb 框架构建的 View + UnoCSS 示例项目
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
            <h3 class={classes.featureCardTitle}>UnoCSS</h3>
            <p>即时按需的原子化 CSS 引擎</p>
          </div>
        </div>
      </section>

      {/* View 细粒度：仅此块依赖 count()，仅 count 变化时重跑该槽位 */}
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

      {/* View 细粒度 + Socket.IO：整块包成 {() => (...)}，仅此槽位随 status/input/messages 更新，避免整页重跑；与 view-hybrid/basic 的 WebSocket 区块写法一致 */}
      <section class={`${classes.socketSection} ${classes.socketSectionOuter}`}>
        <h2 class={classes.socketTitle}>Socket.IO 客户端示例</h2>
        <p class={classes.socketDesc}>
          使用 @dreamer/socket-io 的 Client：连接、自动重连、发送
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
