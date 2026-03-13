/**
 * e2e: react-hybrid 示例的浏览器渲染测试（basic + advanced）
 */
import "../setup.ts";
import {
  createAdvancedExampleBrowserSuite,
  createBasicExampleBrowserSuite,
} from "./browser-render-utils.ts";

createBasicExampleBrowserSuite("react-hybrid", "src/main.ts", {
  assertLoadData: true,
});
createAdvancedExampleBrowserSuite("react-hybrid", 3042, 3043);
