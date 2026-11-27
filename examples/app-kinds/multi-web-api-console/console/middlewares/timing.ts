import type { ConsoleContext } from "@dreamer/dweb";

/**
 * Example global console middleware (onion): times the command.
 * Use `info` so the line is visible at the default logger.level (`info`).
 * `ctx.log.debug(...)` is hidden unless you set `logger.level: "debug"`.
 */
export default async function timing(
  ctx: ConsoleContext,
  next: () => Promise<number>,
): Promise<number> {
  const t0 = Date.now();
  try {
    return await next();
  } finally {
    ctx.log.info(`console ${ctx.name} took ${Date.now() - t0}ms`);
  }
}
