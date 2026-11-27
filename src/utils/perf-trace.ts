/**
 * Optional phase tracer for CLI, dev, build, and start.
 * Enable with env DWEB_PERF=1 (also accepts true / yes / on).
 * Set DWEB_PERF_EPOCH to Date.now() milliseconds at the outermost
 * launcher so parent and child processes share one timeline.
 *
 * @module
 */

function readEnv(name: string): string | undefined {
  try {
    const deno = (globalThis as {
      Deno?: { env?: { get?: (key: string) => string | undefined } };
    }).Deno;
    const value = deno?.env?.get?.(name);
    if (typeof value === "string") return value;
  } catch {
    // Permission denied or Deno.env unavailable
  }
  try {
    const proc = (globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }).process;
    return proc?.env?.[name];
  } catch {
    return undefined;
  }
}

function isPerfEnabled(): boolean {
  const value = (readEnv("DWEB_PERF") ?? "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" ||
    value === "on";
}

/** Whether phase tracing is active in this process. */
export const perfEnabled = isPerfEnabled();

type Mark = { name: string; at: number };

const marks: Mark[] = [];
let epochMs = 0;
let dumped = false;

function nowMs(): number {
  return Date.now() - epochMs;
}

function ensureEpoch(): void {
  if (!perfEnabled || epochMs > 0) return;
  const raw = readEnv("DWEB_PERF_EPOCH");
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    epochMs = parsed;
    return;
  }
  epochMs = Date.now();
}

/** Record a named phase boundary (no-op unless DWEB_PERF is set). */
export function perfMark(name: string): void {
  if (!perfEnabled) return;
  ensureEpoch();
  marks.push({ name, at: nowMs() });
}

/**
 * Print the recorded stages to stderr.
 * Safe to call more than once; a later call prints any new marks too.
 */
export function perfDump(label: string): void {
  if (!perfEnabled) return;
  ensureEpoch();
  const lines: string[] = [];
  lines.push(`[dweb-perf] begin ${label}`);
  let prev = 0;
  for (const mark of marks) {
    const delta = mark.at - prev;
    const share = mark.at > 0 ? (delta / mark.at) * 100 : 0;
    lines.push(
      `[dweb-perf] ${label}  stage=${mark.name}  t=${
        mark.at.toFixed(1)
      }ms  delta=${delta.toFixed(1)}ms  share=${share.toFixed(1)}%`,
    );
    prev = mark.at;
  }
  const total = marks.length > 0 ? marks[marks.length - 1]!.at : nowMs();
  lines.push(`[dweb-perf] end ${label}  total=${total.toFixed(1)}ms`);
  console.error(lines.join("\n"));
  dumped = true;
}

/** Dump once on the way out if the caller forgot. */
export function perfDumpOnce(label: string): void {
  if (!perfEnabled || dumped) return;
  perfDump(label);
}

/**
 * Elapsed milliseconds from process start (or a parent CLI re-exec epoch)
 * to now. Always on — used for the Dev listen-line startup duration.
 * Prefer `DWEB_DEV_STARTED_AT` (ms epoch) from a parent process so a
 * `dweb-cli run` re-exec includes the first process; otherwise use this
 * isolate's start (`Date.now() - performance.now()`).
 *
 * This is not the DWEB_PERF phase tracer and does not include the first
 * client compile after listen.
 */
export function getDevStartElapsedMs(): number {
  const raw = readEnv("DWEB_DEV_STARTED_AT") ?? readEnv("DWEB_PERF_EPOCH");
  const parsed = raw ? Number(raw) : NaN;
  const epoch = Number.isFinite(parsed) && parsed > 0
    ? parsed
    : Date.now() - performance.now();
  return Math.max(0, Math.round(Date.now() - epoch));
}
