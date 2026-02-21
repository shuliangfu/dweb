/**
 * e2e: preact-ssg 示例的浏览器渲染测试（basic + advanced）
 */
import "../setup.ts";
import {
  createAdvancedExampleBrowserSuite,
  createBasicExampleBrowserSuite,
} from "./browser-render-utils.ts";

createBasicExampleBrowserSuite("preact-ssg", "src/main.ts");
createAdvancedExampleBrowserSuite("preact-ssg", 3036, 3037);
