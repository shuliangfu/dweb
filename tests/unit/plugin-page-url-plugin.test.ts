/**
 * Client-bundle plugin for http(s) plugin pages.
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import { createPluginPageUrlPlugin } from "../../src/feature/plugin-page-url-plugin.ts";

describe("plugin-page-url-plugin", () => {
  it("createPluginPageUrlPlugin returns a named setup plugin", () => {
    const plugin = createPluginPageUrlPlugin([
      "https://jsr.io/@dreamer/plugins/1.2.4/src/rbac/pages/menus.tsx",
    ]);
    expect(plugin.name).toBe("dweb-plugin-page-url");
    expect(typeof plugin.setup).toBe("function");
  });
});
