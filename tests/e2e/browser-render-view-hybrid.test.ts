/**
 * e2e: view-hybrid 示例的浏览器渲染测试（basic + advanced）
 */
import "../setup.ts";
import {
  createAdvancedExampleBrowserSuite,
  createBasicExampleBrowserSuite,
} from "./browser-render-utils.ts";

createBasicExampleBrowserSuite("view-hybrid", "src/main.ts", {
  assertLoadData: true,
});
createAdvancedExampleBrowserSuite("view-hybrid", 3022, 3023);
