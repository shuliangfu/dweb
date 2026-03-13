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
});
createAdvancedExampleBrowserSuite("view-hybrid-flat", 3028, 3029, {
  entries: ["backend/main.ts", "frontend/main.ts"],
});
