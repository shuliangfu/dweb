/**
 * e2e: view-ssg 示例的浏览器渲染测试（basic + advanced）
 */
import "../setup.ts";
import {
  createAdvancedExampleBrowserSuite,
  createBasicExampleBrowserSuite,
} from "./browser-render-utils.ts";

createBasicExampleBrowserSuite("view-ssg", "src/main.ts");
createAdvancedExampleBrowserSuite("view-ssg", 3026, 3027);
