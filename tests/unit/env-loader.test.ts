/**
 * env-loader 单元测试
 */

import {
  deleteEnv,
  getEnv,
  join,
  makeTempDir,
  mkdir,
  remove,
  setEnv,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { describe, expect, it } from "@dreamer/test";
import {
  parseEnvContent,
  preloadProjectEnv,
  preloadProjectEnvSync,
  resolveConfigEnvSuffix,
} from "../../src/utils/env-loader.ts";

describe("env-loader 工具", () => {
  describe("parseEnvContent", () => {
    it("应正确解析键值、忽略注释与空白、剥离引号", () => {
      const content = `
        # 这是一行注释
        APP_NAME="My Dweb App"
        APP_PORT='3000'
        DB_HOST=localhost
        EMPTY_VAL=
      `;
      const result = parseEnvContent(content);
      expect(result.APP_NAME).toBe("My Dweb App");
      expect(result.APP_PORT).toBe("3000");
      expect(result.DB_HOST).toBe("localhost");
      expect(result.EMPTY_VAL).toBe("");
    });

    it("应支持展开已有环境变量 ${VAR}", () => {
      setEnv("TEST_BASE_URL", "https://api.example.com");
      try {
        const content = `
          API_URL=\${TEST_BASE_URL}/v1
        `;
        const result = parseEnvContent(content);
        expect(result.API_URL).toBe("https://api.example.com/v1");
      } finally {
        deleteEnv("TEST_BASE_URL");
      }
    });
  });

  describe("resolveConfigEnvSuffix", () => {
    it("应将 production、prod、build、start 映射为 prod", () => {
      expect(resolveConfigEnvSuffix("production")).toBe("prod");
      expect(resolveConfigEnvSuffix("prod")).toBe("prod");
      expect(resolveConfigEnvSuffix("build")).toBe("prod");
      expect(resolveConfigEnvSuffix("start")).toBe("prod");
    });

    it("应将 test 映射为 test", () => {
      expect(resolveConfigEnvSuffix("test")).toBe("test");
    });

    it("其他默认映射为 dev", () => {
      expect(resolveConfigEnvSuffix("dev")).toBe("dev");
      expect(resolveConfigEnvSuffix("development")).toBe("dev");
      expect(resolveConfigEnvSuffix("")).toBe("dev");
    });
  });

  describe("preloadProjectEnv / preloadProjectEnvSync", () => {
    it("应按 .env -> .env.local -> .env.dev -> .env.dev.local 顺序覆盖并注入环境变量", async () => {
      const root = await makeTempDir();
      const k1 = `TEST_ENV_A_${Date.now()}`;
      const k2 = `TEST_ENV_B_${Date.now()}`;
      const k3 = `TEST_ENV_C_${Date.now()}`;
      const k4 = `TEST_ENV_D_${Date.now()}`;

      try {
        await writeTextFile(
          join(root, ".env"),
          `${k1}=base\n${k2}=base\n${k3}=base\n${k4}=base\n`,
        );
        await writeTextFile(
          join(root, ".env.local"),
          `${k2}=local_override\n`,
        );
        await writeTextFile(
          join(root, ".env.dev"),
          `${k3}=dev_override\n`,
        );
        await writeTextFile(
          join(root, ".env.dev.local"),
          `${k4}=dev_local_override\n`,
        );

        const merged = await preloadProjectEnv({
          projectRoot: root,
          env: "dev",
          override: true,
        });

        expect(merged[k1]).toBe("base");
        expect(merged[k2]).toBe("local_override");
        expect(merged[k3]).toBe("dev_override");
        expect(merged[k4]).toBe("dev_local_override");

        expect(getEnv(k1)).toBe("base");
        expect(getEnv(k2)).toBe("local_override");
        expect(getEnv(k3)).toBe("dev_override");
        expect(getEnv(k4)).toBe("dev_local_override");
      } finally {
        deleteEnv(k1);
        deleteEnv(k2);
        deleteEnv(k3);
        deleteEnv(k4);
        await remove(root, { recursive: true }).catch(() => {});
      }
    });

    it("在 test 环境下应忽略 .env.local", async () => {
      const root = await makeTempDir();
      const k = `TEST_ENV_TEST_${Date.now()}`;

      try {
        await writeTextFile(join(root, ".env"), `${k}=base\n`);
        await writeTextFile(join(root, ".env.local"), `${k}=local_override\n`);
        await writeTextFile(join(root, ".env.test"), `${k}=test_override\n`);

        const merged = await preloadProjectEnv({
          projectRoot: root,
          env: "test",
          override: true,
        });

        expect(merged[k]).toBe("test_override");
        expect(getEnv(k)).toBe("test_override");
      } finally {
        deleteEnv(k);
        await remove(root, { recursive: true }).catch(() => {});
      }
    });

    it("子应用专属 .env 应能覆盖根目录配置 (preloadProjectEnvSync)", async () => {
      const root = await makeTempDir();
      const appDir = join(root, "src", "console");
      await mkdir(appDir, { recursive: true });

      const k = `TEST_APP_ENV_${Date.now()}`;

      try {
        await writeTextFile(join(root, ".env"), `${k}=root_val\n`);
        await writeTextFile(join(appDir, ".env"), `${k}=app_val\n`);

        const merged = preloadProjectEnvSync({
          projectRoot: root,
          app: "console",
          env: "dev",
          override: true,
        });

        expect(merged[k]).toBe("app_val");
        expect(getEnv(k)).toBe("app_val");
      } finally {
        deleteEnv(k);
        await remove(root, { recursive: true }).catch(() => {});
      }
    });
  });
});
