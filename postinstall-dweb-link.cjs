#!/usr/bin/env node
/**
 * postinstall 脚本：创建 node_modules/@dreamer/dweb 自引用符号链接
 * 供 examples/ 下的示例在运行 bun run 时解析到本地 dweb 源码（src/mod.ts）
 * 避免在示例 package.json 中使用 file:../../.. 导致 bun install 卡住
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const linkPath = path.join(root, "node_modules", "@dreamer", "dweb");
const targetPath = root;

try {
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  if (fs.existsSync(linkPath)) {
    fs.unlinkSync(linkPath);
  }
  fs.symlinkSync(targetPath, linkPath, "dir");
} catch (err) {
  console.warn("[dweb postinstall] 创建 @dreamer/dweb 符号链接失败:", err.message);
}
