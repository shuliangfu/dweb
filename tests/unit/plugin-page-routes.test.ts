/**
 * Plugin page route registration: onRoute pages are matched like file routes,
 * included in the CSR manifest, and reach the strip-load plugin.
 */

import "../setup.ts";
import {
  ensureDir,
  join,
  makeTempDir,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { afterEach, beforeEach, describe, expect, it } from "@dreamer/test";
import type { Plugin } from "@dreamer/plugin";
import { initializePlugin, registerPlugin } from "../../src/core/plugin.ts";
import { initializeServiceContainer } from "../../src/core/service.ts";
import { getRouter, initializeRouter } from "../../src/feature/router.ts";
import {
  clientRouteImportSpecifier,
  generateClientDepContent,
} from "../../src/feature/csr-client-dep.ts";
import { getRouteClientManifest } from "../../src/feature/csr-client-route-manifest.ts";
import {
  collectPluginPageRoutes,
  resetPluginPageFiles,
} from "../../src/feature/plugin-page-routes.ts";
import { shouldStripLoadPath as shouldStrip } from "../../src/feature/strip-load-plugin.ts";
import type { AppConfig } from "../../src/types/app.ts";

describe("plugin page routes", () => {
  let testDir: string;
  let routesDir: string;
  let pluginPage: string;

  beforeEach(async () => {
    resetPluginPageFiles();
    testDir = await makeTempDir({ prefix: "dweb-plugin-pages-" });
    routesDir = join(testDir, "routes");
    await ensureDir(routesDir);
    await writeTextFile(
      join(routesDir, "_app.tsx"),
      "export default function App({ children }: { children: unknown }) { return children; }",
    );
    await writeTextFile(
      join(routesDir, "_layout.tsx"),
      "export default function Layout({ children }: { children: unknown }) { return children; }",
    );
    await writeTextFile(
      join(routesDir, "index.tsx"),
      "export default function Home() { return null; }\nexport function load() { return { home: true }; }",
    );
    pluginPage = join(testDir, "plugin", "roles.tsx");
    await ensureDir(join(testDir, "plugin"));
    await writeTextFile(
      pluginPage,
      `export default function Roles() { return null; }
export async function load() { return { roles: true }; }
`,
    );
  });

  afterEach(async () => {
    resetPluginPageFiles();
    await remove(testDir, { recursive: true });
  });

  it("collectPluginPageRoutes skips API stubs and host paths", () => {
    const pages = collectPluginPageRoutes(
      [
        {
          path: "/rbac/roles",
          method: "GET",
          meta: {
            type: "page",
            fullPath: pluginPage,
            component: "rbac/roles",
          },
        },
        {
          path: "/api/rbac/*",
          method: "*",
          handler: () => new Response(null),
          meta: { type: "api" },
        },
        {
          path: "/index",
          meta: { type: "static", fullPath: join(routesDir, "index.tsx") },
        },
      ],
      ["/index"],
    );
    expect(pages).toHaveLength(1);
    expect(pages[0]?.path).toBe("/rbac/roles");
    expect(pages[0]?.component).toBe("rbac/roles");
    expect(pages[0]?.fullPath).toBe(pluginPage);
  });

  it("initializeRouter matches plugin pages and wraps them with host layouts", async () => {
    const container = initializeServiceContainer();
    initializePlugin(container);
    const plugin: Plugin = {
      name: "test-pages",
      version: "1.0.0",
      onRoute(routes) {
        return [
          ...routes,
          {
            path: "/rbac/roles",
            method: "GET",
            handler: () => new Response(null),
            meta: {
              type: "page",
              fullPath: pluginPage,
              component: "rbac/roles",
            },
          },
        ];
      },
    };
    await registerPlugin(container, plugin);

    const config: AppConfig = { router: { routesDir } };
    const router = await initializeRouter(container, config);
    expect(getRouter(container)).toBe(router);

    const match = await router.match("/rbac/roles?q=1");
    expect(match).toBeTruthy();
    expect(match?.route.path).toBe("/rbac/roles");
    expect(match?.route.fullPath).toBe(pluginPage);
    expect(match?.route.file).toBe("rbac/roles.tsx");
    expect(match?.query.q).toBe("1");
    expect(match?.isApi).toBe(false);

    const index = await router.match("/");
    expect(index?.route.fullPath).toContain("index.tsx");

    const client = router.getClientRoutes().find((r) =>
      r.path === "/rbac/roles"
    );
    expect(client?.component).toBe("rbac/roles");

    const layouts = router.getLayoutKeysForPath("/rbac/roles");
    expect(layouts).toContain("_layout");

    const manifest = await getRouteClientManifest(container, routesDir, "view");
    const roles = manifest.components.find((c) =>
      c.componentPath === "rbac/roles"
    );
    expect(roles?.fullPath).toBe(pluginPage);
    expect(manifest.routeLayoutKeys["/rbac/roles"]).toContain("_layout");
    expect(manifest.hasLayout).toBe(true);
  });

  it("host file routes win over a plugin page at the same path", async () => {
    await ensureDir(join(routesDir, "rbac", "roles"));
    const hostFile = join(routesDir, "rbac", "roles", "index.tsx");
    await writeTextFile(
      hostFile,
      "export default function HostRoles() { return null; }",
    );
    const container = initializeServiceContainer();
    initializePlugin(container);
    await registerPlugin(container, {
      name: "test-pages",
      version: "1.0.0",
      onRoute(routes) {
        return [
          ...routes,
          {
            path: "/rbac/roles",
            method: "GET",
            handler: () => new Response(null),
            meta: {
              type: "page",
              fullPath: pluginPage,
              component: "rbac/roles",
            },
          },
        ];
      },
    });
    const router = await initializeRouter(container, {
      router: { routesDir },
    });
    const match = await router.match("/rbac/roles");
    expect(match?.route.fullPath).toBe(hostFile);
  });

  it("clientRouteImportSpecifier uses the absolute path for plugin pages", () => {
    expect(
      clientRouteImportSpecifier(
        routesDir,
        {
          componentPath: "index",
          fullPath: join(routesDir, "index.tsx"),
          importName: "Route_index",
        },
        "index",
      ),
    ).toBe("./routes/index.tsx");
    expect(
      clientRouteImportSpecifier(
        routesDir,
        {
          componentPath: "rbac/roles",
          fullPath: pluginPage,
          importName: "Route_rbac_roles",
        },
        "rbac/roles",
      ),
    ).toBe(pluginPage.replace(/\\/g, "/"));

    const code = generateClientDepContent(
      "view",
      [{
        componentPath: "rbac/roles",
        fullPath: pluginPage,
        importName: "Route_rbac_roles",
      }],
      routesDir,
      true,
      [],
      "csr",
    );
    expect(code).toContain(JSON.stringify(pluginPage.replace(/\\/g, "/")));
    expect(code).not.toContain("./routes/rbac/roles.tsx");
  });

  it("clientRouteImportSpecifier prefers clientFullPath over the server entry", () => {
    const clientPage = join(testDir, "plugin", "roles-page.tsx");
    expect(
      clientRouteImportSpecifier(
        routesDir,
        {
          componentPath: "rbac/roles",
          fullPath: pluginPage,
          clientFullPath: clientPage,
          importName: "Route_rbac_roles",
        },
        "rbac/roles",
      ),
    ).toBe(clientPage.replace(/\\/g, "/"));

    const code = generateClientDepContent(
      "view",
      [{
        componentPath: "rbac/roles",
        fullPath: pluginPage,
        clientFullPath: clientPage,
        importName: "Route_rbac_roles",
      }],
      routesDir,
      true,
      [],
      "csr",
    );
    expect(code).toContain(JSON.stringify(clientPage.replace(/\\/g, "/")));
    expect(code).not.toContain(JSON.stringify(pluginPage.replace(/\\/g, "/")));
  });

  it("shouldStripLoadPath includes extra plugin files only", () => {
    expect(shouldStrip(pluginPage, routesDir)).toBe(false);
    expect(shouldStrip(pluginPage, routesDir, [pluginPage])).toBe(true);
    expect(shouldStrip(join(routesDir, "index.tsx"), routesDir)).toBe(true);
  });
});
