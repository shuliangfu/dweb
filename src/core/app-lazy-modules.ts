/**
 * 服务端打包图：静态导入生产运行时按需加载的核心模块，并注册到
 * {@link registerDwebLazyModules}。源码启动（--dev / --build）不要 import 本文件，
 * 否则会把 Web 图预装回 App 启动路径。
 *
 * 生产包不在此注册 build / esbuild / csr-client-builder（仅构建与 dev 使用）。
 * 数据库、实时通道、上传由 app-lazy-modules-*.ts 按配置另行注册。
 *
 * @module
 */

import * as renderMod from "../feature/render.ts";
import * as routerMod from "../feature/router.ts";
import * as serverMod from "../feature/server.ts";
import * as pipelineMod from "./app-render-pipeline.ts";
import * as httpMwMod from "./app-http-middlewares.ts";
import * as renderPkg from "@dreamer/render";
import * as renderUtils from "../feature/render-utils.ts";
import * as loadRoute from "../feature/load-route-module.ts";
import * as routesMw from "../feature/routes-middleware.ts";
import { registerDwebLazyModules } from "../utils/import-later.ts";

const load = (mod: unknown) => () => Promise.resolve(mod);

registerDwebLazyModules({
  "../feature/render.ts": load(renderMod),
  "../feature/router.ts": load(routerMod),
  "../feature/server.ts": load(serverMod),
  "./app-render-pipeline.ts": load(pipelineMod),
  "./app-http-middlewares.ts": load(httpMwMod),
  "@dreamer/render": load(renderPkg),
  "../feature/render-utils.ts": load(renderUtils),
  "../feature/load-route-module.ts": load(loadRoute),
  "../feature/routes-middleware.ts": load(routesMw),
});
