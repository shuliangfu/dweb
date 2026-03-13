/**
 * e2e: preact-hybrid-flat 示例的浏览器渲染测试（basic + advanced）
 */
import "../setup.ts";
import {
  createAdvancedExampleBrowserSuite,
  createBasicExampleBrowserSuite,
} from "./browser-render-utils.ts";

createBasicExampleBrowserSuite("preact-hybrid-flat", "main.ts", {
  assertLoadData: true,
});
createAdvancedExampleBrowserSuite("preact-hybrid-flat", 3038, 3039, {
  entries: ["backend/main.ts", "frontend/main.ts"],
});
