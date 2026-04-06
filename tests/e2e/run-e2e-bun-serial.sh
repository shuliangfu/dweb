#!/usr/bin/env bash
# 在 dweb 包根目录执行：逐个运行 e2e（Bun），便于定位失败文件。
# 依赖：已 bun install；浏览器 e2e 需本机已安装 Playwright Chromium（如 npx playwright install chromium）。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
FILES=(
  tests/e2e/server-request.test.ts
  tests/e2e/browser-render-preact-csr.test.ts
  tests/e2e/browser-render-preact-hybrid.test.ts
  tests/e2e/browser-render-preact-hybrid-flat.test.ts
  tests/e2e/browser-render-preact-ssg.test.ts
  tests/e2e/browser-render-preact-ssr.test.ts
  tests/e2e/browser-render-react-csr.test.ts
  tests/e2e/browser-render-react-hybrid.test.ts
  tests/e2e/browser-render-react-hybrid-flat.test.ts
  tests/e2e/browser-render-react-ssg.test.ts
  tests/e2e/browser-render-react-ssr.test.ts
  tests/e2e/browser-render-view-csr.test.ts
  tests/e2e/browser-render-view-hybrid.test.ts
  tests/e2e/browser-render-view-hybrid-flat.test.ts
  tests/e2e/browser-render-view-ssg.test.ts
  tests/e2e/browser-render-view-ssr.test.ts
)
for f in "${FILES[@]}"; do
  echo "========== bun test $f =========="
  bun test "$f"
done
echo "全部 e2e 文件已顺序跑完。"
