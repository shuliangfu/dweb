import type { Plugin } from "@dreamer/dweb";
import { initShiki } from "../utils/shiki.ts";

/**
 * Shiki 初始化插件
 * 在应用启动时初始化 Shiki 高亮器
 */
export const shikiPlugin = (): Plugin => {
  return {
    name: "shiki-init",
    onInit: async () => {
      await initShiki();
    },
  };
};
