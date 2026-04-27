#!/usr/bin/env bash
#
# 统一更新 dweb 及 examples 下各项目的依赖说明符与锁文件：
#   1) 先在 **dweb 包根**（本仓库主 deno.json）执行 `deno update`
#   2) 再对 **examples/** 下每个带 deno.json 的示例项目执行 `deno update`
#
# 用法（必须在 dweb 包根目录）：
#   ./update-deps.sh
#   bash update-deps.sh
#
# 可选：附加参数会同时传给包根与每个示例的 deno，例如：
#   ./update-deps.sh -r
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [[ ! -f deno.json ]]; then
  echo "error: 未找到包根 deno.json，请在 dweb 包根执行本脚本。" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# 1) 包根：主 deno.json / 锁
# ---------------------------------------------------------------------------
echo ""
echo "========== [1/2] dweb 包根: ${SCRIPT_DIR} =========="
if ! deno update "$@"; then
  echo "FAILED: dweb 包根 deno update" >&2
  exit 1
fi
echo "ok: dweb 包根"

# ---------------------------------------------------------------------------
# 2) 各示例子项目
# ---------------------------------------------------------------------------
if [[ ! -d examples ]]; then
  echo "warning: 无 examples/ 目录，跳过示例。" >&2
  echo "完成：仅已更新 dweb 包根。"
  exit 0
fi

failed=0
count=0
while IFS= read -r denojson; do
  [[ -z "$denojson" ]] && continue
  count=$((count + 1))
  project_dir=$(dirname "$denojson")
  echo ""
  echo "========== [示例 ${count}] ${project_dir} =========="
  if (cd "$project_dir" && deno update "$@"); then
    echo "ok: ${project_dir}"
  else
    echo "FAILED: ${project_dir}" >&2
    failed=$((failed + 1))
  fi
done < <(find examples -name deno.json -type f | LC_ALL=C sort)

echo ""
if [[ "$failed" -eq 0 ]]; then
  echo "完成：包根已更新，并处理 ${count} 个示例项目。"
else
  echo "完成：包根已更新；${count} 个示例中 ${failed} 个失败。" >&2
  exit 1
fi
