import type { ConsoleContext } from "@dreamer/dweb";

/**
 * Directory-level middleware for commands under routes/team/.
 * Wraps team/hello and team/list; does not run for hello/world.
 */
export default async function teamMiddleware(
  ctx: ConsoleContext,
  next: () => Promise<number>,
): Promise<number> {
  console.log(`[team] start ${ctx.name}`);
  try {
    return await next();
  } finally {
    console.log(`[team] done ${ctx.name}`);
  }
}
