import type { AppPlugin } from "@dreamer/dweb";

/** Example console plugin: logs once during App init (before the command runs). */
export function readyPlugin(): AppPlugin {
  return {
    name: "console-ready",
    version: "1.0.0",
    onInit() {
      console.log("[plugin] console-ready");
    },
  };
}
