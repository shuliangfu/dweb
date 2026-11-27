/**
 * 生产打包按需注册：仅当应用配置启用对应能力时由构建入口引入。
 *
 * @module
 */

import { registerDwebLazyModules } from "../utils/import-later.ts";
import * as uploadMod from "../feature/upload.ts";

const load = (mod: unknown) => () => Promise.resolve(mod);

registerDwebLazyModules({
  "../feature/upload.ts": load(uploadMod),
});
