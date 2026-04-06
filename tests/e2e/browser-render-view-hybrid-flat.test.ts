/**
 * e2e: view-hybrid-flat 示例的浏览器渲染测试（basic + advanced）
 */
import "../setup.ts";
import {
  createAdvancedExampleBrowserSuite,
  createBasicExampleBrowserSuite,
} from "./browser-render-utils.ts";

createBasicExampleBrowserSuite("view-hybrid-flat", "main.ts", {
  assertLoadData: true,
  // dev 在 Deno（任意 OS）或 Linux 上连跑多条浏览器用例后易退出，计数器/metadata 会 connection refused；Bun 仍跑这两项
  skipCounterAndMetadataOnLinux: true,
});
createAdvancedExampleBrowserSuite("view-hybrid-flat", 3028, 3029, {
  entries: ["backend/main.ts", "frontend/main.ts"],
});
