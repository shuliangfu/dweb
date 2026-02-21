/**
 * e2e: view-ssr 示例的浏览器渲染测试（basic + advanced）
 */
import "../setup.ts";
import {
  createAdvancedExampleBrowserSuite,
  createBasicExampleBrowserSuite,
} from "./browser-render-utils.ts";

createBasicExampleBrowserSuite("view-ssr", "src/main.ts");
createAdvancedExampleBrowserSuite("view-ssr", 3024, 3025);
