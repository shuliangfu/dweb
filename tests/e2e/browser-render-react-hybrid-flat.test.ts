/**
 * e2e: react-hybrid-flat 示例的浏览器渲染测试（basic + advanced）
 */
import "../setup.ts";
import {
  createAdvancedExampleBrowserSuite,
  createBasicExampleBrowserSuite,
} from "./browser-render-utils.ts";

createBasicExampleBrowserSuite("react-hybrid-flat", "main.ts", {
  assertLoadData: true,
});
createAdvancedExampleBrowserSuite("react-hybrid-flat", 3048, 3049, {
  entries: ["backend/main.ts", "frontend/main.ts"],
});
