import type { ConsoleContext } from "@dreamer/dweb";

const NAMES = new Set(["张三", "李四", "王五"]);

export const meta = {
  description: "Greet a teammate from the staff plugin",
  actions: {
    run: { description: "Print a greeting for 张三, 李四, or 王五" },
  },
};

/**
 * Usage: dweb-cli run staff/hello --name 张三
 * Default name is 张三.
 */
export function run(ctx: ConsoleContext): void {
  const raw = typeof ctx.options.name === "string"
    ? ctx.options.name
    : (ctx.args[0] ?? "张三");
  const name = NAMES.has(raw) ? raw : "张三";
  console.log(`你好，${name}！（staff 插件）`);
}
