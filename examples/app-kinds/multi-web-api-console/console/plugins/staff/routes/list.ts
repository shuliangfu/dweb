import type { ConsoleContext } from "@dreamer/dweb";

export const meta = {
  description: "List teammates from the staff plugin",
  actions: {
    run: { description: "Print 张三, 李四, and 王五" },
  },
};

/** Usage: dweb-cli run staff/list */
export function run(_ctx: ConsoleContext): void {
  console.log("张三、李四、王五（staff 插件）");
}
