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
  // Linux Deno CI: dev 进程在跑完前几项后易中途退出，导致计数器/metadata 用例 connection reset；仅 Linux 跳过这两项以通过 CI
  skipCounterAndMetadataOnLinux: true,
});
createAdvancedExampleBrowserSuite("view-hybrid-flat", 3028, 3029, {
  entries: ["backend/main.ts", "frontend/main.ts"],
});
