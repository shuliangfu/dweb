/**
 * e2e: preact-hybrid 示例的浏览器渲染测试（basic + advanced）
 */
import "../setup.ts";
import {
  createAdvancedExampleBrowserSuite,
  createBasicExampleBrowserSuite,
} from "./browser-render-utils.ts";

createBasicExampleBrowserSuite("preact-hybrid", "src/main.ts", {
  assertLoadData: true,
});
createAdvancedExampleBrowserSuite("preact-hybrid", 3032, 3033);
