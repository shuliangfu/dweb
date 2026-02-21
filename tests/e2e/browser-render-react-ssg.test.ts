/**
 * e2e: react-ssg 示例的浏览器渲染测试（basic + advanced）
 */
import "../setup.ts";
import {
  createAdvancedExampleBrowserSuite,
  createBasicExampleBrowserSuite,
} from "./browser-render-utils.ts";

createBasicExampleBrowserSuite("react-ssg", "src/main.ts");
createAdvancedExampleBrowserSuite("react-ssg", 3046, 3047);
