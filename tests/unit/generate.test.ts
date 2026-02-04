/**
 * generate 命令测试
 *
 * 测试 src/cmd/generate.ts：
 * - main() 能生成 service、api、model、route 文件（ensureDir 覆盖）
 * - name 规范化：pascalCase 类名、kebabCase 文件路径
 */

import {
  chdir,
  cwd,
  ensureDir,
  exists,
  join,
  makeTempDir,
  readTextFile,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { main as generateMain } from "../../src/cmd/generate.ts";

describe("generate (cmd/generate.ts)", () => {
  let testDir: string;
  let originalCwd: string;

  beforeAll(async () => {
    testDir = await makeTempDir({ prefix: "dweb-generate-test-" });
    originalCwd = cwd();
    chdir(testDir);

    // 创建最小 dweb 项目结构（deno.json + src/routes 供 detectUseSrc）
    await writeTextFile(
      join(testDir, "deno.json"),
      JSON.stringify({ name: "test", tasks: {} }),
    );
    await ensureDir(join(testDir, "src", "routes"));
  });

  afterAll(async () => {
    chdir(originalCwd);
    await remove(testDir, { recursive: true });
  });

  describe("main()", () => {
    it("应生成 service 文件（ensureDir 覆盖 services 目录）", async () => {
      await generateMain([], {
        type: "service",
        name: "user_orders",
      });

      const targetPath = join(testDir, "src", "services", "user-orders.ts");
      expect(await exists(targetPath)).toBe(true);

      const content = await readTextFile(targetPath);
      expect(content).toContain("UserOrdersService");
      expect(content).toContain("UserOrders");
    });

    it("应生成 api 文件（ensureDir 覆盖 routes/api 目录）", async () => {
      await generateMain([], {
        type: "api",
        name: "products",
      });

      const targetPath = join(testDir, "src", "routes", "api", "products.ts");
      expect(await exists(targetPath)).toBe(true);

      const content = await readTextFile(targetPath);
      expect(content).toContain("Products");
      expect(content).toContain("/api/products");
    });

    it("应生成 model 文件（ensureDir 覆盖 models 目录）", async () => {
      await generateMain([], {
        type: "model",
        name: "Order",
      });

      const targetPath = join(testDir, "src", "models", "order.ts");
      expect(await exists(targetPath)).toBe(true);

      const content = await readTextFile(targetPath);
      expect(content).toContain("Order");
      expect(content).toContain("OrderModel");
    });

    it("应生成 route 文件（ensureDir 覆盖 routes 目录）", async () => {
      await generateMain([], {
        type: "route",
        name: "about",
      });

      const targetPath = join(testDir, "src", "routes", "about.tsx");
      expect(await exists(targetPath)).toBe(true);

      const content = await readTextFile(targetPath);
      expect(content).toContain("AboutPage");
      expect(content).toContain("About");
    });
  });
});
