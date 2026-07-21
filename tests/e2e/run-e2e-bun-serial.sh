#!/usr/bin/env bash
# 在 dweb 包根目录执行：逐个运行 e2e（Bun）。
#
# 默认：浏览器 e2e 在 Bun 下会 skip（见 browser-render-utils SKIP_BROWSER_E2E_ON_BUN）。
# 强制跑浏览器：DWEB_BUN_BROWSER_E2E=1 bash tests/e2e/run-e2e-bun-serial.sh
# 依赖：已 bun install；浏览器模式需 Playwright Chromium。
# 单文件失败不中断后续；最后汇总并以非 0 退出。
set -uo pipefail
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
if [[ "${DWEB_BUN_BROWSER_E2E:-}" == "1" ]]; then
  echo "DWEB_BUN_BROWSER_E2E=1：将实际运行 Playwright 浏览器 e2e"
else
  echo "默认跳过 Bun 浏览器 e2e（仅 server-request 等非浏览器用例会执行逻辑）；强制开启：DWEB_BUN_BROWSER_E2E=1"
fi
FAILED=()
for f in "${FILES[@]}"; do
  echo "========== bun test $f =========="
  if ! bun test "$f"; then
    FAILED+=("$f")
    echo "!! FAILED: $f"
  fi
done
echo "========== 汇总 =========="
if [ ${#FAILED[@]} -eq 0 ]; then
  echo "全部 e2e 文件已顺序跑完，均通过。"
  exit 0
fi
echo "失败 ${#FAILED[@]} 个文件："
printf '  - %s\n' "${FAILED[@]}"
exit 1

