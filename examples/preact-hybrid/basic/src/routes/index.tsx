import { Client } from "@dreamer/socket-io/client";
import { useEffect, useRef, useState } from "preact/hooks";

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
  socketTitle: "mb-4 text-center text-[#667eea]",
  socketDesc: "mb-4 text-center text-sm text-gray-500",
  statusBadgeWrap: "mb-4 flex items-center justify-center gap-2",
  inputWrap: "mb-4 flex gap-2",
  statusBadge: "inline-flex rounded-full px-3 py-1 text-sm font-medium",
  input:
    "flex-1 rounded border border-gray-300 px-3 py-2 focus:border-[#667eea] focus:outline-none focus:ring-1 focus:ring-[#667eea]",
  sendBtn: "rounded bg-[#667eea] px-4 py-2 text-white hover:bg-[#5a6fd6]",
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
    DEBUG && typeof globalThis !== "undefined" && (globalThis as any).console
  ) {
    (globalThis as any).console.log("[Socket.IO 调试]", ...args);
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

/**
 * 首页组件
 * 路由: /
 * 包含 Socket.IO 客户端示例：连接状态、发送消息、接收消息
 */
export default function Home() {
  const clientRef = useRef<Client | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    // 仅在浏览器环境创建客户端（避免 SSR 时访问 location）
    const origin = typeof globalThis !== "undefined" && globalThis.location
      ? globalThis.location.origin
      : "http://localhost:3000";

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
      setMessages((
        prev,
      ) => [...prev, { type: "received", text, at: Date.now() }]);
    };

    client.on("connect", onConnect);
    client.on("disconnect", onDisconnect);
    client.on("connect_error", onConnectError);
    client.on("reconnecting", onReconnecting);
    client.on("reconnect_failed", onReconnectFailed);
    client.on("chat-response", onChatResponse);

    setStatus("connecting");
    debugLog("事件监听器已注册，status → connecting");

    return () => {
      client.off("connect", onConnect);
      client.off("disconnect", onDisconnect);
      client.off("connect_error", onConnectError);
      client.off("reconnecting", onReconnecting);
      client.off("reconnect_failed", onReconnectFailed);
      client.off("chat-response", onChatResponse);
      client.disconnect();
      clientRef.current = null;
    };
  }, []);

  /** 发送一条消息到服务端（事件名 chat-message，需服务端监听并可选回发 chat-response） */
  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    const client = clientRef.current;
    if (client?.isConnected()) {
      debugLog("→ chat-message 发送:", text);
      client.emit("chat-message", { text });
      setMessages((prev) => [...prev, { type: "sent", text, at: Date.now() }]);
      setInput("");
    } else {
      debugLog("→ 发送失败：未连接");
      setMessages((
        prev,
      ) => [...prev, {
        type: "sent",
        text: `[未连接] ${text}`,
        at: Date.now(),
      }]);
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

  /** 状态徽章颜色（使用 CSS 变量，避免 Tailwind 动态类名被 purge） */
  const statusStyles: Record<
    ConnectionStatus,
    { backgroundColor: string; color: string }
  > = {
    idle: {
      backgroundColor: "var(--color-gray-100)",
      color: "var(--color-gray-800)",
    },
    connecting: {
      backgroundColor: "var(--color-yellow-100)",
      color: "var(--color-yellow-800)",
    },
    connected: {
      backgroundColor: "var(--color-green-100)",
      color: "var(--color-green-800)",
    },
    disconnected: {
      backgroundColor: "var(--color-gray-100)",
      color: "var(--color-gray-800)",
    },
    error: {
      backgroundColor: "var(--color-red-100)",
      color: "var(--color-red-800)",
    },
  };

  return (
    <div class={classes.page}>
      <section class={classes.hero}>
        <h1 class={classes.heroTitle}>欢迎使用 Dweb 框架</h1>
        <p class={classes.heroDesc}>
          这是一个使用 @dreamer/dweb 框架构建的 Preact 示例项目
        </p>
      </section>

      <section class={classes.section}>
        <h2 class={classes.sectionTitle}>特性</h2>
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
            <h3 class={classes.featureCardTitle}>Preact</h3>
            <p>轻量级 React 替代方案</p>
          </div>
        </div>
      </section>

      {/* Socket.IO 客户端示例 */}
      <section class={classes.socketSection}>
        <h2 class={classes.socketTitle}>Socket.IO 客户端示例</h2>
        <p class={classes.socketDesc}>
          使用 @dreamer/socket-io 的 Client：连接、自动重连、发送
          chat-message、接收 chat-response
        </p>
        <div class={classes.statusBadgeWrap}>
          <span
            class={classes.statusBadge}
            style={statusStyles[status]}
          >
            {statusLabel[status]}
          </span>
        </div>
        <div class={classes.inputWrap}>
          <input
            type="text"
            class={classes.input}
            placeholder="输入消息并发送 (chat-message)"
            value={input}
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
          {messages.length === 0
            ? (
              <p class={classes.messageEmpty}>
                暂无消息。发送后显示在这里。
              </p>
            )
            : (
              <ul class={classes.messageList}>
                {messages.map((msg, i) => (
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
      </section>
    </div>
  );
}
