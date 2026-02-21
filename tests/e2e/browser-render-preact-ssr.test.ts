/**
 * e2e: preact-ssr 示例的浏览器渲染测试（basic + advanced）
 */
import "../setup.ts";
import {
  createAdvancedExampleBrowserSuite,
  createBasicExampleBrowserSuite,
} from "./browser-render-utils.ts";

createBasicExampleBrowserSuite("preact-ssr", "src/main.ts");
createAdvancedExampleBrowserSuite("preact-ssr", 3034, 3035);
