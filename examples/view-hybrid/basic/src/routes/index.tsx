import {
  createEffect,
  createRef,
  createSignal,
  onCleanup,
} from "@dreamer/view";
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

/** e2e 用：页面 load 注入的标记，断言 data-value 为 PAGE_LOAD_MARKER */
export interface HomeLoadData {
  pageLoadMarker: string;
}

export function load(_ctx: LoadContext): Promise<HomeLoadData> {
  return Promise.resolve({
    pageLoadMarker: "page-load-ok",
  });
}

interface HomeProps {
  data?: HomeLoadData;
}

export default function Home({ data }: HomeProps) {
  const [count, setCount] = createSignal(0);
  const [status, setStatus] = createSignal<ConnectionStatus>("idle");
  const [messages, setMessages] = createSignal<ChatMessage[]>([]);
  /**
   * 非受控输入 + `createRef`：`ref={messageInputRef}` 由编译器处理。
   *
   * **为何以前在 dweb Hybrid 里读不到 `ref.current`？** 旧版编译器对「对象 ref」仅在
   * `el.isConnected === true` 时赋值；路由页在嵌套 `insertReactive` 里挂载时，input 常尚未接入
   * document，`ref.current` 会一直为 `null`。`view/examples` 里 gallery 等多是往**已在文档里的**
   * 容器 `mount`，append 时往往已 `isConnected`，所以不容易踩坑。
   *
   * **现行为：** compileSource 路径下对象 ref 走 `scheduleFunctionRef`。`deno.json` 使用 `jsx: "react-jsx"` 时
   * JSX 经 `jsx()`→VNode→`mountVNodeTree`，ref 在 `vnode-mount` 中同样用 `scheduleFunctionRef` 绑定。
   * 输入区仍勿与 `value={signal()}` 放在同一段会随输入刷新的 `{() => ...}` 内，以免失焦。
   */
  const messageInputRef = createRef<HTMLInputElement>(null);
  const clientRef: { current: Client | null } = { current: null };

  /**
   * 发送一条消息到服务端（事件名 chat-message，需服务端监听并可选回发 chat-response）。
   *
   * 调试说明：`console.log` 仅在**浏览器 DevTools 控制台**输出，不会出现在运行 `deno task dev` 的终端里。
   */
  const handleSend = () => {
    const el = messageInputRef.current;
    const text = (el?.value ?? "").trim();
    if (!text) return;
    const client = clientRef.current;
    if (client?.connected) {
      debugLog("→ chat-message 发送:", text);
      client.emit("chat-message", { text });
      setMessages((prev) => [...prev, { type: "sent", text, at: Date.now() }]);
      if (el) el.value = "";
    } else {
      debugLog("→ 发送失败：未连接");
      setMessages((prev) => [
        ...prev,
        { type: "sent", text: `[未连接] ${text}`, at: Date.now() },
      ]);
      if (el) el.value = "";
    }
  };

  createEffect(() => {
    // 仅浏览器端创建并连接 WebSocket 客户端；SSR 时跳过，避免服务进程内自连 /ws
    if (typeof (globalThis as { window?: unknown }).window === "undefined") {
      return;
    }

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

  const statusLabel: Record<ConnectionStatus, string> = {
    idle: "未连接",
    connecting: "连接中…",
    connected: "已连接",
    disconnected: "已断开",
    error: "连接失败",
  };

  return (
    <div class={classes.page}>
      {/* e2e: 验证页面 load 数据注入 */}
      <span
        data-testid="page-load"
        data-value={data?.pageLoadMarker ?? ""}
        aria-hidden="true"
      />
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

      {/* data-testid / data-counter-value 供 e2e 精确定位计数器，避免与其它 section 按钮混淆 */}
      <section class={classes.socketSection} data-testid="e2e-counter">
        <h2 class={classes.socketTitle}>计数器示例</h2>
        <p class={classes.socketDesc}>View 细粒度渲染：仅此块随 count 更新</p>
        {() => (
          <div class="flex flex-col items-center justify-center gap-4">
            <span
              class="text-2xl font-semibold"
              data-counter-value={String(count())}
            >
              count: {count()}
            </span>
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

      {
        /*
         * WebSocket 区：status、消息列表各自 `{() => ...}`，输入框静态挂载。
         * 勿把 `value={signal()}` 的 input 放进会随该 signal 更新的同一段动态子树，否则会失焦。
         */
      }
      <section class={`${classes.socketSection} ${classes.socketSectionOuter}`}>
        <h2 class={classes.socketTitle}>WebSocket 客户端示例</h2>
        <p class={classes.socketDesc}>
          使用 @dreamer/websocket/client 的 Client：连接、自动重连、发送
          chat-message、接收 chat-response
        </p>
        {() => (
          <div class={classes.statusBadgeWrap}>
            <span
              class={`${classes.statusBadge} ${statusBadgeClasses[status()]}`}
            >
              {statusLabel[status()]}
            </span>
          </div>
        )}
        <div class={classes.inputWrap}>
          <input
            ref={messageInputRef}
            type="text"
            class={classes.input}
            placeholder="输入消息并发送 (chat-message)"
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
        {() => (
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
        )}
      </section>
    </div>
  );
}
