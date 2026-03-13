/**
 * e2e: view-csr 示例的浏览器渲染测试（basic + advanced）
 */
import "../setup.ts";
import {
  createAdvancedExampleBrowserSuite,
  createBasicExampleBrowserSuite,
} from "./browser-render-utils.ts";

createBasicExampleBrowserSuite("view-csr", "src/main.ts", {
  assertLoadData: true,
});
createAdvancedExampleBrowserSuite("view-csr", 3020, 3021);
