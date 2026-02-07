/**
 * 测试前置初始化
 *
 * 在运行测试前初始化 dweb i18n，将 $t 挂载到 globalThis，
 * 使各模块可直接使用 $t("key") 而无需显式导入。
 *
 * 测试环境固定使用 zh-CN，确保错误消息断言与 locale 无关。
 *
 * 需在测试脚本中通过 `import "../setup.ts"` 或 `import "./setup.ts"` 导入。
 */
import { initDwebI18n, setDwebLocale } from "../src/utils/i18n.ts";

setDwebLocale("zh-CN");
await initDwebI18n();
