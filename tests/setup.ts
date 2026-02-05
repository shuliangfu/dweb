/**
 * 测试前置初始化
 *
 * 在运行测试前初始化 dweb i18n，将 $t 挂载到 globalThis，
 * 使各模块可直接使用 $t("key") 而无需显式导入。
 *
 * 通过 deno test --preload=./tests/setup.ts 加载。
 */
import { initDwebI18n } from "../src/utils/i18n.ts";

await initDwebI18n();
