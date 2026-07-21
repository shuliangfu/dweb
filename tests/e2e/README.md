/**

- 端到端测试目录
-
- 职责：
-
  - 测试完整的应用场景
-
  - 测试用户使用流程
-
  - 测试真实环境下的功能
-
- 测试范围：
-
  - 完整应用启动和关闭
-
  - HTTP 请求处理流程
-
  - 数据库操作流程
-
  - 渲染和构建流程
-
  - WebSocket 通信流程 */

## 浏览器 e2e 前置

`browser-render-*.test.ts` 需要 Chrome/Chromium。若出现
`Timed out waiting for WS endpoint`：

1. 安装 Chrome 或 Chromium
2. 设置 `CHROME_PATH` 环境变量指向可执行文件
3. Windows CI 需 setup-chrome action

## Deno / Bun

| 运行时 | 浏览器 e2e | 说明 |
|--------|------------|------|
| **Deno** | 默认执行 | 主验收路径 |
| **Bun** | **默认 skip** | 上游 Playwright×Bun 仍不稳；`server-request` 等非浏览器 e2e 仍会跑 |

强制在 Bun 下跑浏览器 e2e：

```bash
DWEB_BUN_BROWSER_E2E=1 bun test tests/e2e/browser-render-preact-csr.test.ts
# 或
DWEB_BUN_BROWSER_E2E=1 bash tests/e2e/run-e2e-bun-serial.sh
```
