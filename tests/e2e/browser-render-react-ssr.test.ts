/**
 * e2e: react-ssr 示例的浏览器渲染测试（basic + advanced）
 */
import "../setup.ts";
import {
  createAdvancedExampleBrowserSuite,
  createBasicExampleBrowserSuite,
} from "./browser-render-utils.ts";

createBasicExampleBrowserSuite("react-ssr", "src/main.ts");
createAdvancedExampleBrowserSuite("react-ssr", 3044, 3045);
