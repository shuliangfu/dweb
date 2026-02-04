# dweb cmd 功能分析报告

> 最后更新：已完成全部优化

## 一、命令清单与完成度

| 命令 | 文件 | 完成度 | 说明 |
|------|------|--------|------|
| init | cmd/init.ts | ✅ 完善 | 交互式脚手架，支持单/多应用、Preact/React、Tailwind/UnoCSS |
| dev | cmd/dev.ts | ✅ 完善 | 单应用执行 deno task dev，多应用需指定 -a |
| build | cmd/build.ts | ✅ 完善 | 单应用构建，多应用可指定应用或构建全部 |
| start | cmd/start.ts | ✅ 完善 | 单应用/多应用启动生产服务器 |
| preview | cmd/preview.ts | ✅ 完善 | 支持 dist/、dist/client/、dist/{app}/client/ |
| generate | cmd/generate.ts | ✅ 完善 | API 模板正确，路径适配 useSrc，支持 --app |
| test | cmd/test.ts | ✅ 完善 | 优先 task test，否则 deno test -A tests |
| lint | cmd/lint.ts | ✅ 完善 | 优先 task lint，否则 deno lint |
| fmt | cmd/fmt.ts | ✅ 完善 | 优先 task fmt，否则 deno fmt |
| clean | cmd/clean.ts | ✅ 完善 | 清理 dist、.cache、node_modules/.cache、.esbuild |
| db migrate | cmd/db.ts | ✅ 完善 | create 支持 sql/mongodb；up/down 优先 MigrationManager，否则 task |
| db seed | cmd/db.ts | ✅ 完善 | 优先 task db:seed，否则运行 seeds/seed.ts |
| db status | cmd/db.ts | ✅ 完善 | 配置 database 时显示已执行状态，否则列出迁移文件 |
| upgrade | cmd/upgrade.ts | ✅ 完善 | 检查 JSR 最新版并安装 |

---

## 二、已完成的优化

### 1. generate 命令
- API 模板改为 Web Request/Response，使用 `json()` 辅助函数
- 自动检测 useSrc（src/routes 或 routes 存在性）
- 新增 `--app` 选项，支持多应用目录

### 2. preview 命令
- 支持 dist/client/、dist/{app}/client/ 构建输出
- 新增 `--app` 选项，多应用时指定应用
- SPA 回退尝试多个 index.html 路径

### 3. db migrate 命令
- create：生成符合 @dreamer/database Migration 接口的文件，支持 --db-type sql|mongodb
- up：配置 config.database.default 时使用 MigrationManager.up()，否则执行 task
- down：配置 database 时使用 MigrationManager.down(count)，支持 -c/--count；否则执行 task 并传递 -n 迁移名

### 4. db status 命令
- 配置 database 时使用 MigrationManager.status() 显示 ✓ 已执行 / ○ 待执行
- 否则列出迁移文件，提供执行/回滚指引

### 5. 运行时与配置
- **utils/runtime.ts**：getRuntime()、getTaskArgs()、getTestArgs() 等，替代硬编码 deno，支持 Deno/Bun
- **utils/config-loader.ts**：loadProjectConfig() 供 dev/build/start/preview 加载 config.server、config.build 等
- dev/build/start 启动前展示端口或输出目录（来自配置）；preview 端口优先级：-p > config.build.previewPort > 4173

---

## 三、CLI 与 project 工具

- **cli.ts**：命令注册完整，generate 新增 --app，preview 新增 --app，migrate 新增 --db-type、--count
- **utils/project.ts**：`getProjectInfo` 正确解析单/多应用，逻辑清晰
