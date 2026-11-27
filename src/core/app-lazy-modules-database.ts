/**
 * 生产打包按需注册：仅当应用配置启用对应能力时由构建入口引入。
 *
 * @module
 */

import { registerDwebLazyModules } from "../utils/import-later.ts";
import * as databaseMod from "./database.ts";

const load = (mod: unknown) => () => Promise.resolve(mod);

registerDwebLazyModules({
  "./database.ts": load(databaseMod),
});
