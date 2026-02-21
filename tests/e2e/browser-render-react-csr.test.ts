/**
 * e2e: react-csr 示例的浏览器渲染测试（basic + advanced）
 */
import "../setup.ts";
import {
  createAdvancedExampleBrowserSuite,
  createBasicExampleBrowserSuite,
} from "./browser-render-utils.ts";

createBasicExampleBrowserSuite("react-csr", "src/main.ts");
createAdvancedExampleBrowserSuite("react-csr", 3040, 3041);
