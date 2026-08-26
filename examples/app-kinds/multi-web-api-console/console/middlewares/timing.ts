import type { ConsoleContext } from "@dreamer/dweb";

/**
 * Example global console middleware (onion): times the command.
 */
export default async function timing(
  ctx: ConsoleContext,
  next: () => Promise<number>,
): Promise<number> {
  const t0 = Date.now();
  try {
    return await next();
  } finally {
    ctx.log.debug(`console ${ctx.name} took ${Date.now() - t0}ms`);
  }
}
