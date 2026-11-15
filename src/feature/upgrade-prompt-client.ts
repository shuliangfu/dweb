/// <reference lib="dom" />
/**
 * 浏览器端升级提示：用 `@dreamer/storage/client` 把已确认的应用版本记在 localStorage。
 *
 * 比较对象是本地记录与服务端当前版本，与路由、点击无关。
 * 首次访问（没有记录）只静默写入当前版本，不比较、不弹层；
 * 之后有缓存了再比较版本。要复测可把该键改成更旧的版本（例如 0.0.0）。
 */
import { BrowserStorage } from "@dreamer/storage/client";
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

/** 把 storage 或控制台里手写的值收成版本字符串。 */
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

/** 读取 localStorage 中的应用版本，兼容包封装格式和控制台手写的纯字符串。 */
export async function readStoredAppVersion(
  storage: BrowserStorage,
): Promise<string | null> {
  const fromPackage = normalizeStoredAppVersion(
    await storage.get(DWEB_APP_VERSION_STORAGE_KEY),
  );
  if (fromPackage) return fromPackage;
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

function reloadWithVersion(live: string): void {
  const url = new URL(globalThis.location.href);
  url.searchParams.set("_v", live);
  globalThis.location.replace(url.href);
}

function showUpgradeDialog(live: string, storage: BrowserStorage): void {
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
    void storage.set(DWEB_APP_VERSION_STORAGE_KEY, live).then(() => {
      reloadWithVersion(live);
    });
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

  const storage = new BrowserStorage({ adapter: "localStorage" });
  let stored: string | null = null;
  let ready = false;
  let shown = false;
  let pendingLive: string | null = null;

  const consider = (live: string): void => {
    const version = live.trim();
    if (!version) return;
    if (!ready) {
      pendingLive = version;
      return;
    }
    const action = resolveStoredUpgradeAction(stored, version);
    if (action === "idle") return;
    if (action === "seed") {
      void storage.set(DWEB_APP_VERSION_STORAGE_KEY, version).then(() => {
        stored = version;
      });
      return;
    }
    if (shown) return;
    shown = true;
    showUpgradeDialog(version, storage);
  };

  const poll = (): void => {
    fetch(DWEB_VERSION_PATH, { cache: "no-store", credentials: "same-origin" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data && typeof data.version === "string") consider(data.version);
      })
      .catch(() => {});
  };

  void readStoredAppVersion(storage).then((value) => {
    stored = value;
    ready = true;
    const injected = typeof g.__APP_VERSION__ === "string"
      ? g.__APP_VERSION__
      : "";
    if (injected) consider(injected);
    if (pendingLive) consider(pendingLive);
  });

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
