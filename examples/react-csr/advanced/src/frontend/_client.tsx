/**
 * 客户端入口（前端）
 */

import { initApp } from "./_client.dep.tsx";

initApp().then((app) => {
  app.router.beforeRoute(() => true);
}).catch(console.error);
