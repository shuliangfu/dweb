#!/usr/bin/env -S deno run -A

/**
 * 测试 JSR URL 转换逻辑
 * 不需要修改 deno.json，直接测试转换函数
 */

import { createImportMapScript } from "../src/utils/import-map.ts";

// 模拟使用 JSR URL 的 import map
const testImportMap = {
  "@dreamer/dweb": "jsr:@dreamer/dweb@^1.8.2-beta.5",
  "@dreamer/dweb/client": "jsr:@dreamer/dweb@^1.8.2-beta.5/client",
  "@dreamer/dweb/extensions": "jsr:@dreamer/dweb@^1.8.2-beta.5/extensions",
  "preact": "https://esm.sh/preact@latest",
  "preact/hooks": "https://esm.sh/preact@latest/hooks",
};

console.log("🧪 测试 JSR URL 转换逻辑\n");
console.log("📦 测试用的 import map:");
console.log(JSON.stringify(testImportMap, null, 2));
console.log("\n");

// 临时修改 deno.json 来测试
const originalCwd = Deno.cwd();
const testDenoJson = {
  imports: testImportMap,
};

// 创建一个临时目录来测试
const tempDir = await Deno.makeTempDir();
const tempDenoJsonPath = `${tempDir}/deno.json`;

await Deno.writeTextFile(
  tempDenoJsonPath,
  JSON.stringify(testDenoJson, null, 2),
);

try {
  // 切换到临时目录
  Deno.chdir(tempDir);

  // 启用调试模式
  Deno.env.set("DEBUG_IMPORT_MAP", "true");

  console.log("🔍 生成 import map...\n");
  const importMapScript = await createImportMapScript([tempDir]);

  if (importMapScript) {
    // 提取 import map JSON
    const match = importMapScript.match(/<script type="importmap">(.+?)<\/script>/s);
    if (match) {
      const importMapJson = JSON.parse(match[1]);
      console.log("\n✅ 生成的 import map:");
      console.log(JSON.stringify(importMapJson, null, 2));
      
      console.log("\n🔍 @dreamer/dweb 相关映射:");
      let allCorrect = true;
      for (const [key, value] of Object.entries(importMapJson.imports)) {
        if (key.startsWith("@dreamer/dweb")) {
          const valueStr = String(value);
          const isHttp = valueStr.startsWith("https://jsr.io/");
          const status = isHttp ? "✅ 已转换为 HTTP URL" : "❌ 仍然是 JSR URL 或其他格式";
          if (!isHttp) allCorrect = false;
          console.log(`  ${key}`);
          console.log(`    -> ${valueStr}`);
          console.log(`    ${status}`);
        }
      }
      console.log("\n" + (allCorrect ? "✅ 所有 JSR URL 都已正确转换！" : "❌ 部分 JSR URL 未正确转换"));
    } else {
      console.log("❌ 无法解析 import map 脚本");
      console.log(importMapScript);
    }
  } else {
    console.log("❌ 无法生成 import map");
  }
} finally {
  // 清理
  Deno.chdir(originalCwd);
  await Deno.remove(tempDir, { recursive: true });
}

