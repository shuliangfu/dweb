/**
 * 浏览器端升级提示：用 localStorage 直接读写已确认的应用版本。
 *
 * 比较对象是本地记录与服务端当前版本，与路由、点击无关。
 * 首次访问（没有记录）只静默写入当前版本，不比较、不弹层；
 * 之后有缓存了再比较版本。要复测可把该键改成更旧的版本（例如 0.0.0）。
 */
import {
  DWEB_APP_VERSION_STORAGE_KEY,
  DWEB_VERSION_PATH,
  DWEB_VERSION_STREAM_PATH,
} from "../utils/constants.ts";
import { isProjectVersionGreater } from "../utils/project-version.ts";

export type UpgradePromptAction = "seed" | "prompt" | "idle";

interface UpgradePromptGlobals {
  __DWEB_UPGRADE_PROMPT__?: boolean;
  __APP_VERSION__?: string;
  __DWEB_UPGRADE_PROMPT_MESSAGES__?: {
    title?: string;
    message?: string;
    confirm?: string;
  };
}

/** 把 localStorage 或控制台里手写的值收成版本字符串。 */
export function normalizeStoredAppVersion(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (value && typeof value === "object") {
    const record = value as { value?: unknown; version?: unknown };
    if (typeof record.value === "string") {
      return normalizeStoredAppVersion(record.value);
    }
    if (typeof record.version === "string") {
      return normalizeStoredAppVersion(record.version);
    }
  }
  return null;
}

/**
 * 根据本地记录与线上版本决定动作。
 *
 * @param stored 本地已记录的版本；没有记录时传 `null`
 * @param live 服务端当前版本
 */
export function resolveStoredUpgradeAction(
  stored: string | null,
  live: string,
): UpgradePromptAction {
  const liveVersion = live.trim();
  if (!liveVersion) return "idle";
  if (stored == null || stored.trim() === "") {
    return "seed";
  }
  return isProjectVersionGreater(liveVersion, stored) ? "prompt" : "idle";
}

/**
 * 读取 localStorage 中的应用版本。
 * 兼容直接写入的纯字符串，以及先前 `@dreamer/storage` 封装的 JSON。
 */
export function readStoredAppVersion(): string | null {
  try {
    const raw = globalThis.localStorage?.getItem(DWEB_APP_VERSION_STORAGE_KEY);
    if (!raw) return null;
    try {
      return normalizeStoredAppVersion(JSON.parse(raw)) ??
        normalizeStoredAppVersion(raw);
    } catch {
      return normalizeStoredAppVersion(raw);
    }
  } catch {
    return null;
  }
}

/** 把已确认的版本以纯字符串写入 localStorage。 */
export function writeStoredAppVersion(version: string): void {
  globalThis.localStorage.setItem(DWEB_APP_VERSION_STORAGE_KEY, version);
}

function reloadWithVersion(live: string): void {
  const url = new URL(globalThis.location.href);
  url.searchParams.set("_v", live);
  globalThis.location.replace(url.href);
}

function showUpgradeDialog(live: string): void {
  const messages =
    (globalThis as UpgradePromptGlobals).__DWEB_UPGRADE_PROMPT_MESSAGES__ ||
    {};
  const wrap = document.createElement("div");
  wrap.setAttribute("role", "dialog");
  wrap.setAttribute("aria-modal", "true");
  wrap.style.cssText =
    "position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45)";
  const box = document.createElement("div");
  box.style.cssText =
    "max-width:26rem;margin:1rem;padding:1.25rem 1.5rem;border-radius:0.75rem;background:#fff;color:#0f172a;box-shadow:0 10px 25px rgba(0,0,0,.15);font-family:system-ui,sans-serif";
  const heading = document.createElement("h2");
  heading.style.cssText = "margin:0 0 .5rem;font-size:1.125rem;font-weight:600";
  heading.textContent = messages.title || "";
  const paragraph = document.createElement("p");
  paragraph.style.cssText =
    "margin:0 0 1rem;font-size:.9375rem;line-height:1.5";
  paragraph.textContent = messages.message || "";
  const button = document.createElement("button");
  button.type = "button";
  button.style.cssText =
    "display:inline-flex;margin-left:auto;padding:.5rem 1rem;border:0;border-radius:.5rem;background:#2563eb;color:#fff;font-size:.875rem;cursor:pointer";
  button.textContent = messages.confirm || "OK";
  button.addEventListener("click", () => {
    writeStoredAppVersion(live);
    reloadWithVersion(live);
  });
  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;justify-content:flex-end";
  actions.appendChild(button);
  box.appendChild(heading);
  box.appendChild(paragraph);
  box.appendChild(actions);
  wrap.appendChild(box);
  (document.body || document.documentElement).appendChild(wrap);
  button.focus();
}

/**
 * 在客户端入口启动升级监视：SSE 为主，5 分钟轮询与可见性变化兜底。
 * 未开启引导标志或没有 localStorage 时直接返回。
 */
export function startUpgradePrompt(): void {
  const g = globalThis as UpgradePromptGlobals;
  if (!g.__DWEB_UPGRADE_PROMPT__) return;
  if (typeof document === "undefined") return;
  try {
    if (typeof globalThis.localStorage === "undefined") return;
  } catch {
    return;
  }

  let stored = readStoredAppVersion();
  let shown = false;

  const consider = (live: string): void => {
    const version = live.trim();
    if (!version) return;
    const action = resolveStoredUpgradeAction(stored, version);
    if (action === "idle") return;
    if (action === "seed") {
      writeStoredAppVersion(version);
      stored = version;
      return;
    }
    if (shown) return;
    shown = true;
    showUpgradeDialog(version);
  };

  const poll = (): void => {
    fetch(DWEB_VERSION_PATH, { cache: "no-store", credentials: "same-origin" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data && typeof data.version === "string") consider(data.version);
      })
      .catch(() => {});
  };

  const injected = typeof g.__APP_VERSION__ === "string"
    ? g.__APP_VERSION__
    : "";
  if (injected) consider(injected);

  try {
    const source = new EventSource(DWEB_VERSION_STREAM_PATH);
    source.addEventListener("version", (event) => {
      consider((event as MessageEvent).data as string);
    });
  } catch {
    poll();
  }
  setInterval(poll, 3e5);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") poll();
  });
}
