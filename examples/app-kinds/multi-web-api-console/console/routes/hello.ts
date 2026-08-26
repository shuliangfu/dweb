import type { ConsoleContext } from "@dreamer/dweb";

export const meta = {
  description: "Hello console commands",
  actions: {
    world: { description: "Print a greeting (supports --name)" },
  },
};

export function world(ctx: ConsoleContext): void {
  const name = typeof ctx.options.name === "string" ? ctx.options.name : "dweb";
  console.log(`Hello, ${name}!`);
}
