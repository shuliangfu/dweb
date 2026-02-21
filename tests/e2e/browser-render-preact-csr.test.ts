/**
 * e2e: preact-csr 示例的浏览器渲染测试（basic + advanced）
 */
import "../setup.ts";
import {
  createAdvancedExampleBrowserSuite,
  createBasicExampleBrowserSuite,
} from "./browser-render-utils.ts";

createBasicExampleBrowserSuite("preact-csr", "src/main.ts");
createAdvancedExampleBrowserSuite("preact-csr", 3030, 3031);
