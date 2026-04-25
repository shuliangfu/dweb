# @dreamer/dweb 测试报告

> 📖 [English](../en-US/TEST_REPORT.md) | 中文

## 📋 测试概览

| 项目     | 值                   |
| -------- | -------------------- |
| 框架版本 | 3.4.2                |
| 测试框架 | @dreamer/test@^1.1.7 |
| 测试时间 | 2026-04-25           |
| 测试环境 | Deno 2.x / Bun 1.x   |

---

## 📊 测试结果

### 总体统计

| 指标         | 数值                                     |
| ------------ | ---------------------------------------- |
| 测试文件数   | 86                                       |
| 测试用例总数 | 875（865 通过 + 10 忽略）                |
| 通过用例数   | 865                                      |
| 忽略用例数   | 10                                       |
| 失败用例数   | 0                                        |
| 通过率       | 100%                                     |
| 测试执行时间 | 约 8m1s（`deno test -A tests` 一次执行） |

### 测试文件统计

#### 单元测试 (tests/unit/)

| 文件名                              | 测试用例数   | 状态        |
| ----------------------------------- | ------------ | ----------- |
| `app.test.ts`                       | 20           | ✅ 全部通过 |
| `asset-manifest.test.ts`            | 6            | ✅ 全部通过 |
| `build-dirs.test.ts`                | 18           | ✅ 全部通过 |
| `config.test.ts`                    | 64           | ✅ 全部通过 |
| `context.test.ts`                   | 26           | ✅ 全部通过 |
| `render.test.ts`                    | 46           | ✅ 全部通过 |
| `command.test.ts`                   | 42           | ✅ 全部通过 |
| `build.test.ts`                     | 23           | ✅ 全部通过 |
| `windows.test.ts`                   | 46（2 忽略） | ✅ 全部通过 |
| `path.test.ts`                      | 19           | ✅ 全部通过 |
| `plugin-events.test.ts`             | 17           | ✅ 全部通过 |
| `logger.test.ts`                    | 18           | ✅ 全部通过 |
| `runtime-adapter.test.ts`           | 18           | ✅ 全部通过 |
| `server.test.ts`                    | 14           | ✅ 全部通过 |
| `plugin.test.ts`                    | 16           | ✅ 全部通过 |
| `sanitize.test.ts`                  | 16           | ✅ 全部通过 |
| `database.test.ts`                  | 16           | ✅ 全部通过 |
| `lifecycle.test.ts`                 | 13           | ✅ 全部通过 |
| `middleware.test.ts`                | 15           | ✅ 全部通过 |
| `router.test.ts`                    | 13           | ✅ 全部通过 |
| `errors.test.ts`                    | 13           | ✅ 全部通过 |
| `jsr-versions.test.ts`              | 12           | ✅ 全部通过 |
| `i18n.test.ts`                      | 14           | ✅ 全部通过 |
| `load-route-module.test.ts`         | 8            | ✅ 全部通过 |
| `service.test.ts`                   | 10           | ✅ 全部通过 |
| `runtime.test.ts`                   | 12           | ✅ 全部通过 |
| `csr-client-builder.test.ts`        | 7            | ✅ 全部通过 |
| `socket-io.test.ts`                 | 10           | ✅ 全部通过 |
| `websocket.test.ts`                 | 8            | ✅ 全部通过 |
| `generate.test.ts`                  | 7            | ✅ 全部通过 |
| `csr-client-middleware.test.ts`     | 7            | ✅ 全部通过 |
| `csr-client-route-manifest.test.ts` | 3            | ✅ 全部通过 |
| `load-data-middleware.test.ts`      | 6            | ✅ 全部通过 |
| `security.test.ts`                  | 4            | ✅ 全部通过 |
| `config-loader.test.ts`             | 5            | ✅ 全部通过 |
| `module-cache.test.ts`              | 6            | ✅ 全部通过 |
| `cmd-build.test.ts`                 | 4            | ✅ 全部通过 |
| `cmd-clean.test.ts`                 | 4            | ✅ 全部通过 |
| `render-hybrid.test.ts`             | 7            | ✅ 全部通过 |
| `render-ssr.test.ts`                | 7            | ✅ 全部通过 |
| `render-ssg.test.ts`                | 6            | ✅ 全部通过 |
| `db.test.ts`                        | 4            | ✅ 全部通过 |
| `init.test.ts`                      | 6            | ✅ 全部通过 |
| `project.test.ts`                   | 4            | ✅ 全部通过 |
| `version.test.ts`                   | 4            | ✅ 全部通过 |
| `render-csr.test.ts`                | 4            | ✅ 全部通过 |
| `cmd-dev.test.ts`                   | 3            | ✅ 全部通过 |
| `cmd-fmt.test.ts`                   | 3            | ✅ 全部通过 |
| `cmd-lint.test.ts`                  | 3            | ✅ 全部通过 |
| `cmd-preview.test.ts`               | 3            | ✅ 全部通过 |
| `cmd-start.test.ts`                 | 3            | ✅ 全部通过 |
| `cmd-test.test.ts`                  | 3            | ✅ 全部通过 |
| `cmd-upgrade.test.ts`               | 3            | ✅ 全部通过 |
| `cmd-update.test.ts`                | 4            | ✅ 全部通过 |
| `cli.test.ts`                       | 2            | ✅ 全部通过 |

> **说明**：共 10 个用例忽略：`windows.test.ts` 中 2 个为 Windows 平台专属（非
> Windows 上 `skipIf` 忽略）；e2e 浏览器 SSG/SSR 中 8 个（含 SSG/SSR 模式下忽略
> 「应能注入 layout 与页面 load 数据」等）。

#### 端到端测试 (tests/e2e/)

| 文件名                                      | 测试用例数 | 状态        | 说明                                                     |
| ------------------------------------------- | ---------- | ----------- | -------------------------------------------------------- |
| `browser-render-preact-csr.test.ts`         | 9          | ✅ 全部通过 | Preact CSR basic/advanced：首页、关于、计数器、metadata  |
| `browser-render-preact-ssr.test.ts`         | 9          | ✅ 全部通过 | Preact SSR                                               |
| `browser-render-preact-ssg.test.ts`         | 9          | ✅ 全部通过 | Preact SSG                                               |
| `browser-render-preact-hybrid.test.ts`      | 9          | ✅ 全部通过 | Preact Hybrid                                            |
| `browser-render-preact-hybrid-flat.test.ts` | 9          | ✅ 全部通过 | Preact Hybrid（无 src）                                  |
| `browser-render-react-csr.test.ts`          | 9          | ✅ 全部通过 | React CSR basic/advanced                                 |
| `browser-render-react-ssr.test.ts`          | 9          | ✅ 全部通过 | React SSR                                                |
| `browser-render-react-ssg.test.ts`          | 9          | ✅ 全部通过 | React SSG                                                |
| `browser-render-react-hybrid.test.ts`       | 9          | ✅ 全部通过 | React Hybrid                                             |
| `browser-render-react-hybrid-flat.test.ts`  | 9          | ✅ 全部通过 | React Hybrid（无 src）                                   |
| `browser-render-view-csr.test.ts`           | 9          | ✅ 全部通过 | View CSR                                                 |
| `browser-render-view-ssr.test.ts`           | 9          | ✅ 全部通过 | View SSR                                                 |
| `browser-render-view-ssg.test.ts`           | 9          | ✅ 全部通过 | View SSG                                                 |
| `browser-render-view-hybrid.test.ts`        | 9          | ✅ 全部通过 | View Hybrid                                              |
| `browser-render-view-hybrid-flat.test.ts`   | 9          | ✅ 全部通过 | View Hybrid（无 src）                                    |
| `server-request.test.ts`                    | 3          | ✅ 全部通过 | 启动服务器并返回 HTML                                    |
| **小计**                                    | **145**    | ✅ 全部通过 | 执行时间含在总时长约 8m1s 内（SSG/SSR 下 8 个 e2e 忽略） |

#### 集成测试 (tests/integration/)

| 文件名                             | 测试用例数 | 状态        | 说明                           |
| ---------------------------------- | ---------- | ----------- | ------------------------------ |
| `config-lifecycle.test.ts`         | 3          | ✅ 全部通过 | 配置加载与生命周期钩子         |
| `csr-preact-build.test.ts`         | 3          | ✅ 全部通过 | CSR + Preact 构建              |
| `csr-react-build.test.ts`          | 3          | ✅ 全部通过 | CSR + React 构建               |
| `csr-view-build.test.ts`           | 3          | ✅ 全部通过 | CSR + View 构建                |
| `hybrid-preact-build.test.ts`      | 3          | ✅ 全部通过 | Hybrid + Preact 构建           |
| `hybrid-preact-flat-build.test.ts` | 3          | ✅ 全部通过 | Hybrid + Preact 构建（无 src） |
| `hybrid-react-build.test.ts`       | 3          | ✅ 全部通过 | Hybrid + React 构建            |
| `hybrid-react-flat-build.test.ts`  | 3          | ✅ 全部通过 | Hybrid + React 构建（无 src）  |
| `hybrid-view-build.test.ts`        | 3          | ✅ 全部通过 | Hybrid + View 构建             |
| `ssg-preact-build.test.ts`         | 3          | ✅ 全部通过 | SSG + Preact 构建              |
| `ssg-react-build.test.ts`          | 3          | ✅ 全部通过 | SSG + React 构建               |
| `ssg-view-build.test.ts`           | 3          | ✅ 全部通过 | SSG + View 构建                |
| `ssr-preact-build.test.ts`         | 4          | ✅ 全部通过 | SSR + Preact 构建及启动验证    |
| `ssr-react-build.test.ts`          | 4          | ✅ 全部通过 | SSR + React 构建及启动验证     |
| `ssr-view-build.test.ts`           | 4          | ✅ 全部通过 | SSR + View 构建及启动验证      |
| **小计**                           | **45**     | ✅ 全部通过 | 执行时间约 25s                 |

---

## 🔍 功能测试详情

### 1. 配置管理 (config.test.ts) - 64 个测试

#### 1.1 validateConfig() 验证

- ✅ 接受有效的基础配置
- ✅ 接受空配置对象
- ✅ 拒绝非字符串类型的 name
- ✅ 拒绝非字符串类型的 version
- ✅ 拒绝非字符串类型的 envPrefix
- ✅ 拒绝非布尔类型的 hotReload
- ✅ 接受有效的渲染配置
- ✅ 接受所有有效的 engine 值 (react, preact)
- ✅ 接受所有有效的 mode 值 (ssr, csr, ssg, hybrid)
- ✅ 拒绝非对象类型的 render
- ✅ 拒绝 null 类型的 render
- ✅ 拒绝无效的 engine 值
- ✅ 拒绝无效的 mode 值
- ✅ 接受字符串路径的中间件
- ✅ 接受有名称的函数中间件
- ✅ 接受带 name 属性的对象中间件
- ✅ 拒绝非数组类型的 middlewares
- ✅ 拒绝空路径的中间件
- ✅ 拒绝匿名函数中间件
- ✅ 拒绝没有 name 的对象中间件
- ✅ 拒绝无效类型的中间件
- ✅ 接受带 name 属性的插件对象
- ✅ 接受字符串路径的插件
- ✅ 拒绝非数组类型的 plugins
- ✅ 拒绝没有 name 的插件
- ✅ 接受有效的 server 配置
- ✅ 拒绝非对象类型的 server
- ✅ 接受有效的 router 配置
- ✅ 拒绝非对象类型的 router
- ✅ 接受有效的 build 配置
- ✅ 拒绝非对象类型的 build
- ✅ 接受有效的 logger 配置
- ✅ 拒绝非对象类型的 logger

#### 1.2 deepMergeConfig() 合并

- ✅ 合并两个简单配置对象
- ✅ 源配置覆盖目标配置的同名属性
- ✅ 深度合并嵌套对象
- ✅ 保持原对象不变（不可变性）
- ✅ 合并不同名称的插件
- ✅ 用同名插件替换已有插件
- ✅ 目标为空数组时使用源数组
- ✅ 合并不同名称的中间件
- ✅ 用同名中间件替换已有中间件
- ✅ 支持字符串路径的中间件合并
- ✅ 正确处理多层嵌套配置
- ✅ 处理空配置对象

### 2. 插件系统 (plugin.test.ts) - 15 个测试

#### 2.1 initializePlugin()

- ✅ 创建插件管理器实例
- ✅ 将插件管理器注册到服务容器
- ✅ 接受配置选项
- ✅ 使用默认配置选项
- ✅ 多次调用抛出错误（服务已注册）

#### 2.2 getPluginManager()

- ✅ 从容器中获取插件管理器
- ✅ 未初始化时抛出错误

#### 2.3 registerPlugin()

- ✅ 注册插件到管理器
- ✅ 支持多个插件注册
- ✅ 支持带生命周期钩子的插件
- ✅ 支持带配置的插件
- ✅ 支持带依赖的插件

#### 2.4 插件安装和激活

- ✅ 能安装已注册的插件
- ✅ 能激活已安装的插件
- ✅ 通过 triggerInit 调用 onInit 钩子

### 3. 服务器集成 (server.test.ts) - 13 个测试

#### 3.1 initializeServer()

- ✅ 创建服务器实例
- ✅ 将服务器注册到服务容器
- ✅ 使用配置中的端口号
- ✅ 使用配置中的主机名
- ✅ 使用默认配置
- ✅ 多次调用抛出错误

#### 3.2 getServer()

- ✅ 从容器中获取服务器实例
- ✅ 未初始化时抛出错误

#### 3.3 服务器配置

- ✅ 支持 dev 模式配置
- ✅ 支持 prod 模式配置
- ✅ 支持 shutdownTimeout 配置
- ✅ 支持 onListen 回调配置
- ✅ 支持 onError 回调配置

### 4. 生命周期管理 (lifecycle.test.ts) - 12 个测试

#### 4.1 initializeLifecycle()

- ✅ 创建生命周期管理器实例
- ✅ 将生命周期管理器注册到服务容器
- ✅ 使用配置中的 lifecycle 选项
- ✅ 使用默认配置
- ✅ 多次调用抛出错误

#### 4.2 getLifecycleManager()

- ✅ 从容器中获取生命周期管理器
- ✅ 未初始化时抛出错误

#### 4.3 registerLifecycleHook()

- ✅ 注册生命周期钩子
- ✅ 支持多个钩子注册到同一阶段
- ✅ 支持不同阶段的钩子

#### 4.4 生命周期阶段转换

- ✅ 支持完整的生命周期流程
- ✅ 能获取当前阶段

### 5. 中间件系统 (middleware.test.ts) - 12 个测试

#### 5.1 initializeMiddleware()

- ✅ 创建中间件链实例
- ✅ 将中间件链注册到服务容器
- ✅ 多次调用抛出错误

#### 5.2 getMiddlewareChain()

- ✅ 从容器中获取中间件链
- ✅ 未初始化时抛出错误

#### 5.3 registerMiddleware()

- ✅ 注册中间件到链中
- ✅ 支持多个中间件按顺序执行
- ✅ 支持带名称的中间件注册
- ✅ 中间件能访问上下文对象
- ✅ 中间件能修改上下文对象

#### 5.4 中间件错误处理

- ✅ 中间件抛出的错误传播
- ✅ 后续中间件不在前一个错误后执行

### 6. 插件事件系统 (plugin-events.test.ts) - 16 个测试

#### 6.1 emitPluginEvent()

- ✅ 触发已激活插件的事件钩子
- ✅ 不触发未激活插件的事件钩子
- ✅ 传递参数给事件钩子
- ✅ 触发多个插件的事件钩子
- ✅ 钩子出错时继续执行其他插件

#### 6.2 生命周期事件触发函数

- ✅ emitOnInit 触发 onInit 钩子
- ✅ emitOnStart 触发 onStart 钩子
- ✅ emitOnStop 触发 onStop 钩子
- ✅ emitOnShutdown 触发 onShutdown 钩子

#### 6.3 构建事件触发函数

- ✅ emitOnBuild 触发 onBuild 钩子并传递选项
- ✅ emitOnBuildComplete 触发 onBuildComplete 钩子并传递结果

#### 6.4 Socket 事件触发函数

- ✅ emitOnSocket 触发 onSocket 钩子
- ✅ emitOnSocketClose 触发 onSocketClose 钩子
- ✅ 无 pluginManager 时 emitOnSocket 静默返回
- ✅ 无 pluginManager 时 emitOnSocketClose 静默返回

#### 6.5 事件执行顺序

- ✅ 按插件注册顺序触发事件

### 7. 数据库集成 (database.test.ts) - 11 个测试

#### 7.1 initializeDatabase()

- ✅ 创建数据库管理器实例
- ✅ 将数据库管理器注册到服务容器
- ✅ 接受数据库配置
- ✅ 多次调用抛出错误

#### 7.2 getDatabaseManager()

- ✅ 从容器中获取数据库管理器
- ✅ 未初始化时抛出错误
- ✅ 支持命名管理器

#### 7.3 getDatabaseStatus()

- ✅ 无连接时返回空数组
- ✅ 管理器未初始化时返回空数组

#### 7.4 数据库配置

- ✅ 支持默认连接配置
- ✅ 支持多个命名连接配置

### 8. 构建集成 (build.test.ts) - 24 个测试

#### 9.1 initializeBuild()

- ✅ 创建构建器实例
- ✅ 将构建器注册到服务容器
- ✅ 使用配置中的构建模式
- ✅ 使用渲染配置确定客户端引擎
- ✅ 使用默认配置
- ✅ 多次调用抛出错误

#### 9.2 getBuild()

- ✅ 从容器中获取构建器实例
- ✅ 未初始化时抛出错误

#### 9.3 构建配置

- ✅ 支持服务端配置
- ✅ 支持客户端配置
- ✅ 支持资源处理配置
- ✅ 支持缓存配置
- ✅ 支持清理配置
- ✅ 支持增量构建配置
- ✅ 支持静默模式配置
- ✅ 支持日志级别配置

### 9. 渲染集成 (render.test.ts) - 45 个测试

#### 9.1 initializeRender()

- ✅ 初始化渲染服务并包含 renderSSR 与 renderSSG
- ✅ 将渲染服务注册为单例
- ✅ 多次调用应抛出错误（服务已注册）

#### 9.2 getRender()

- ✅ 从容器中获取渲染服务并包含 renderSSR、renderSSG
- ✅ 未初始化时调用应抛出错误

#### 9.3 renderSSR 方法

- ✅ Preact/React 应为函数且调用后返回 Promise
- ✅ 应使用配置中的 engine 作为默认值
- ✅ 正确渲染、带 props、带 layout、skipLayouts
- ✅ component 为 null/undefined 时应抛出异常

#### 9.4 renderSSG 方法

- ✅ 应为函数
- ✅ 调用后应返回 Promise<string[]>
- ✅ routes 非空时正确调用 loadRouteComponent
- ✅ loadRouteComponent 返回 null 时应抛出

#### 9.5 渲染引擎与模式配置

- ✅ 配置 react / preact 引擎时服务应正常初始化
- ✅ 配置 ssr / csr / ssg 模式时服务应正常初始化

### 10. 路由集成 (router.test.ts) - 13 个测试

#### 10.1 initializeRouter()

- ✅ 创建路由实例
- ✅ 将路由注册到服务容器
- ✅ 使用配置中的路由目录
- ✅ 使用渲染配置确定框架和 SSR 模式
- ✅ 使用默认路由目录

#### 10.2 getRouter()

- ✅ 从容器中获取路由实例
- ✅ 未初始化时抛出错误

#### 10.3 路由扫描

- ✅ 扫描路由目录
- ✅ 扫描包含路由文件的目录

#### 10.4 API 模式配置

- ✅ 支持 restful API 模式
- ✅ 支持 action API 模式

### 11. CLI 命令模块 (command.test.ts) - 41 个测试

#### 11.1 Command 类构造函数

- ✅ 创建 Command 实例
- ✅ 使用名称和描述创建 Command 实例
- ✅ 创建服务容器
- ✅ 每个 Command 实例有独立的服务容器

#### 11.2 Command.app 属性

- ✅ 未初始化时访问 app 抛出错误

#### 11.3 Command.container 属性

- ✅ 返回服务容器
- ✅ 可以注册和获取服务

#### 11.4 Command.action()

- ✅ 设置命令处理函数
- ✅ 支持链式调用
- ✅ 设置命令处理函数并返回自身

#### 11.5 Command.command() 子命令

- ✅ 创建子命令
- ✅ 子命令是扩展的 Command 类型
- ✅ 支持多级子命令

#### 11.6 Command 选项和参数

- ✅ 支持选项定义
- ✅ 支持参数定义
- ✅ 支持选项链式定义

#### 11.7 重导出的 API - ANSI 颜色和样式

- ✅ 导出 colorize 函数
- ✅ 导出 colors 对象
- ✅ 导出 stripAnsiCodes 函数
- ✅ 导出 shouldUseColor 函数

#### 11.8 重导出的 API - 光标控制

- ✅ 导出 clearLine 函数
- ✅ 导出 clearScreen 函数
- ✅ 导出 moveCursor 函数
- ✅ 导出 hideCursor 函数
- ✅ 导出 showCursor 函数

#### 11.9 重导出的 API - 输出格式化

- ✅ 导出 success 函数
- ✅ 导出 error 函数
- ✅ 导出 warning 函数
- ✅ 导出 info 函数
- ✅ 导出 title 函数
- ✅ 导出 separator 函数
- ✅ 导出 list 函数
- ✅ 导出 numberedList 函数
- ✅ 导出 keyValue 函数
- ✅ 导出 keyValuePairs 函数

#### 11.10 重导出的 API - 表格显示

- ✅ 导出 table 函数
- ✅ 导出 keyValueTable 函数
- ✅ 导出 progressBar 函数

#### 11.11 重导出的 API - 用户交互

- ✅ 导出 input 函数
- ✅ 导出 select 函数
- ✅ 导出 confirm 函数

### 12. 日志集成 (logger.test.ts) - 17 个测试

#### 12.1 initializeLogger()

- ✅ 创建日志实例
- ✅ 将日志实例注册到服务容器
- ✅ 使用配置中的日志级别
- ✅ 使用配置中的日志格式
- ✅ 使用默认配置
- ✅ 多次调用抛出错误

#### 12.2 getLogger()

- ✅ 从容器中获取日志实例
- ✅ 未初始化时抛出错误

#### 12.3 日志功能

- ✅ 支持所有日志级别
- ✅ 支持带参数的日志

### 13. 服务容器集成 (service.test.ts) - 9 个测试

#### 13.1 initializeServiceContainer()

- ✅ 创建服务容器实例
- ✅ 将容器自身注册为单例服务
- ✅ 每次调用创建新的容器实例
- ✅ 支持注册和获取服务
- ✅ 单例服务返回相同实例

#### 13.2 getServiceContainer()

- ✅ 从容器中获取已注册的服务容器
- ✅ 与 initializeServiceContainer 注册的容器一致

#### 13.3 服务容器功能

- ✅ 支持多个服务的注册和获取
- ✅ 支持服务之间的依赖注入

### 14. 统一错误处理 (errors.test.ts) - 12 个测试

- ✅ createDwebError 创建错误实例、带参数创建
- ✅ throwDwebError 抛出错误、带 cause 抛出
- ✅ assertRejects 异步错误断言
- ✅ isDwebError 类型守卫
- ✅ DwebError 实例方法 toString、toJSON
- ✅ setDwebErrorTranslator i18n 翻译器、传入 null 清除

### 15. 运行时适配器 (runtime-adapter.test.ts) - 17 个测试

- ✅ 进程与环境：getEnv、setEnv、cwd、args、exit
- ✅ 路径：join、resolve、dirname、basename
- ✅ 文件系统：readFileSync、readTextFile、writeTextFile、mkdir、exists
- ✅ cwd() 返回非空字符串、join() 拼接路径

### 16. CSR 客户端构建与渲染器 (csr-client-builder.test.ts / render-csr.test.ts)

- ✅
  clearClientScriptCache、getCachedClientScript、createClientScriptMiddleware（5
  个用例）
- ✅ createRendererCSR 返回函数、接受 (ctx, match) 两参数（3 个用例）

### 17. SSR / Hybrid / SSG 渲染器 (render-ssr.test.ts / render-hybrid.test.ts / render-ssg.test.ts)

- ✅ createRendererSSR（6 个用例）、createRendererHybrid（6
  个用例）、createRendererSSG（5 个用例） 均返回函数且签名为两参数；match.isApi
  为 true 时返回 null

### 18. 版本 (version.test.ts) - 3 个测试

- ✅ DWEB_VERSION 导出字符串、语义化版本格式、非空

### 19. CLI (cli.test.ts) - 1 个测试

- ✅ createCLI() 返回 Command、具备 execute 方法

### 20. 路由上下文 (context.test.ts) - 22 个测试

- ✅ **parseCookies()**：无/空 Cookie 头、单/多
  cookie、重复键、去空格、跳过非法段
- ✅ **createMetaContext()**：返回 url、params、query
- ✅ **createLoadContext()**：从 Request 填充 method、headers、cookies；可选
  session、response
- ✅
  **createServerResponse()**：redirect（302/301）、**json**（**`{ success,
  data }`**
  封装；非 2xx
  状态）、html、text、binary（Uint8Array/ArrayBuffer）、body、status（含
  statusText）

### 21. 其他单元测试（app、asset-manifest、build-dirs、sanitize、path、runtime 等）

- ✅ **app.test.ts** (20)：App
  构造函数、use()、registerPlugin()、on()、stage、init 流程
- ✅ **asset-manifest.test.ts** (6)：replaceAssetPathsInHtml 等资源清单
- ✅ **build-dirs.test.ts** (18)：构建目录推断与清理
- ✅ **sanitize.test.ts** (15)：sanitizeRequestParams 危险键过滤、NUL
  过滤、空值处理
- ✅ **path.test.ts**
  (18)：isPathWithinProject、pathForLog、normalizePathForCompare、extractComponentPathFromRouteFile（使用
  makeTempDir 支持 Windows 跨平台）
- ✅ **runtime.test.ts** (12)：getRuntime、getTaskArgs、getTestArgs、getLintArgs
  等
- ✅ **module-cache.test.ts** (5)：invalidateModule、getModuleVersion（使用
  pathToFileUrl 支持 Windows 跨平台）
- ✅ **load-route-module.test.ts**
  (7)：loadRouteModule、clearCssRouteCacheForPath、含 CSS 导入
- ✅ **config-loader.test.ts** (4)：loadProjectConfig（使用
  pathToFileUrl，已移除 Windows skip）
- ✅ **csr-client-middleware.test.ts** (6)：createClientScriptMiddleware、next
  调用、生产模式、chunk 文件
- ✅ **i18n.test.ts** (13)：$t、setDwebLocale、detectLocale
- ✅ **generate.test.ts** (6)：生成 service、api、model、route，不支持 type
  时输出错误
- ✅ **socket-io.test.ts**
  (9)：initializeSocketIo、getSocketIoServer、getSocketIoPath、createSocketIoMiddleware、传入
  handlers 时 connection 触发 onConnection
- ✅ **websocket.test.ts**
  (7)：initializeWebSocket、getWebSocketServer、getWebSocketPath、createWebSocketMiddleware、传入
  handlers 时 connection 触发 onConnection
- ✅ **cmd-clean.test.ts** (3)：main 清理 dist 等目录
- ✅ **cmd-build.test.ts** (3)：main 无 deno.json / 无 build task 时行为
- ✅ **cmd-dev/start/preview/fmt/lint/test.test.ts** (各 2)：main 无 deno.json
  时提前返回
- ✅ **cmd-upgrade.test.ts** (2)：main 正常执行、--beta 选项
- ✅ **cmd-update.test.ts** (3)：main 无 deno.json 时返回、有 deno.json 时执行
  update
- ✅ **windows.test.ts** (48，2
  忽略)：路径规范化、构建输出推断、模块缓存、组件路径提取、路径安全校验、日志友好路径（Windows
  平台专属用例在非 Windows 时跳过）

---

## 📈 测试覆盖分析

### 接口方法覆盖

| 模块                  | 方法                                                                                    | 覆盖状态 |
| --------------------- | --------------------------------------------------------------------------------------- | -------- |
| app                   | App 构造函数                                                                            | ✅       |
| app                   | App.use()                                                                               | ✅       |
| app                   | App.registerPlugin()                                                                    | ✅       |
| app                   | App.on()                                                                                | ✅       |
| app                   | App.stage                                                                               | ✅       |
| config                | validateConfig()                                                                        | ✅       |
| config                | deepMergeConfig()                                                                       | ✅       |
| service               | initializeServiceContainer()                                                            | ✅       |
| service               | getServiceContainer()                                                                   | ✅       |
| lifecycle             | initializeLifecycle()                                                                   | ✅       |
| lifecycle             | getLifecycleManager()                                                                   | ✅       |
| lifecycle             | registerLifecycleHook()                                                                 | ✅       |
| middleware            | initializeMiddleware()                                                                  | ✅       |
| middleware            | getMiddlewareChain()                                                                    | ✅       |
| middleware            | registerMiddleware()                                                                    | ✅       |
| plugin                | initializePlugin()                                                                      | ✅       |
| plugin                | getPluginManager()                                                                      | ✅       |
| plugin                | registerPlugin()                                                                        | ✅       |
| plugin-events         | emitPluginEvent()                                                                       | ✅       |
| plugin-events         | emitOnInit()                                                                            | ✅       |
| plugin-events         | emitOnStart()                                                                           | ✅       |
| plugin-events         | emitOnStop()                                                                            | ✅       |
| plugin-events         | emitOnShutdown()                                                                        | ✅       |
| plugin-events         | emitOnBuild()                                                                           | ✅       |
| plugin-events         | emitOnBuildComplete()                                                                   | ✅       |
| plugin-events         | emitOnSocket()                                                                          | ✅       |
| plugin-events         | emitOnSocketClose()                                                                     | ✅       |
| server                | initializeServer()                                                                      | ✅       |
| server                | getServer()                                                                             | ✅       |
| database              | initializeDatabase()                                                                    | ✅       |
| database              | getDatabaseManager()                                                                    | ✅       |
| database              | getDatabaseStatus()                                                                     | ✅       |
| database              | connectDatabases()                                                                      | ⬜       |
| database              | disconnectDatabases()                                                                   | ⬜       |
| build                 | initializeBuild()                                                                       | ✅       |
| build                 | getBuild()                                                                              | ✅       |
| render                | initializeRender()                                                                      | ✅       |
| render                | getRender()                                                                             | ✅       |
| render                | renderSSR()                                                                             | ✅       |
| render                | renderSSG()                                                                             | ✅       |
| router                | initializeRouter()                                                                      | ✅       |
| router                | getRouter()                                                                             | ✅       |
| logger                | initializeLogger()                                                                      | ✅       |
| logger                | getLogger()                                                                             | ✅       |
| command               | Command 构造函数                                                                        | ✅       |
| command               | Command.initApp()                                                                       | ⬜       |
| command               | Command.app                                                                             | ✅       |
| command               | Command.container                                                                       | ✅       |
| command               | Command.action()                                                                        | ✅       |
| command               | Command.command()                                                                       | ✅       |
| command               | 重导出 API (colorize, colors 等)                                                        | ✅       |
| runtime-adapter       | getEnv / cwd / join / readTextFile 等                                                   | ✅       |
| errors                | createDwebError / throwDwebError / isDwebError / setDwebErrorTranslator                 | ✅       |
| csr-client-builder    | clearClientScriptCache / createClientScriptMiddleware                                   | ✅       |
| render-csr            | createRendererCSR()                                                                     | ✅       |
| render-ssr            | createRendererSSR()                                                                     | ✅       |
| render-hybrid         | createRendererHybrid()                                                                  | ✅       |
| render-ssg            | createRendererSSG()                                                                     | ✅       |
| version               | DWEB_VERSION                                                                            | ✅       |
| cli                   | createCLI() / execute                                                                   | ✅       |
| context               | parseCookies() / createLoadContext() / createMetaContext() / createServerResponse()     | ✅       |
| sanitize              | sanitizeRequestParams()                                                                 | ✅       |
| path                  | isPathWithinProject / pathForLog / normalizePathForCompare                              | ✅       |
| runtime               | getRuntime / getTaskArgs / getTestArgs / getLintArgs                                    | ✅       |
| module-cache          | invalidateModule / getModuleVersion                                                     | ✅       |
| load-route-module     | loadRouteModule / clearCssRouteCacheForPath                                             | ✅       |
| asset-manifest        | replaceAssetPathsInHtml                                                                 | ✅       |
| config-loader         | loadProjectConfig                                                                       | ✅       |
| csr-client-middleware | createClientScriptMiddleware                                                            | ✅       |
| socket-io             | initializeSocketIo / getSocketIoServer / getSocketIoPath / createSocketIoMiddleware     | ✅       |
| websocket             | initializeWebSocket / getWebSocketServer / getWebSocketPath / createWebSocketMiddleware | ✅       |

### 边界情况覆盖

| 边界情况            | 覆盖状态 |
| ------------------- | -------- |
| 空配置对象          | ✅       |
| 无效类型配置        | ✅       |
| 服务重复注册        | ✅       |
| 服务未注册时获取    | ✅       |
| 多个插件/中间件     | ✅       |
| 中间件错误传播      | ✅       |
| 插件钩子错误隔离    | ✅       |
| 配置深度合并        | ✅       |
| 同名插件/中间件替换 | ✅       |

### 错误处理覆盖

| 错误场景         | 覆盖状态 |
| ---------------- | -------- |
| 配置验证错误     | ✅       |
| 服务重复注册错误 | ✅       |
| 服务未找到错误   | ✅       |
| 中间件执行错误   | ✅       |
| 插件钩子执行错误 | ✅       |
| 数据验证错误     | ✅       |

---

## 📝 优点

1. **完整的核心模块覆盖**：config、service、lifecycle、middleware、plugin、plugin-events
   全部测试
2. **配置验证测试充分**：validateConfig 和 deepMergeConfig 覆盖了各种场景
3. **错误隔离测试**：验证了插件错误不会影响其他插件
4. **服务容器测试**：验证了单例服务和依赖注入功能
5. **中间件洋葱模型**：验证了中间件按顺序执行

---

## 🎯 结论

@dreamer/dweb 框架的测试在文件级已全面覆盖，共 **865** 个测试用例通过；另有
**10** 个用例在相应环境下忽略（2 个 Windows 专属、8 个 e2e SSG/SSR
场景）。测试通过 `deno test -A tests` 一次执行，总时长约
**8m1s**。所有测试均为实质性测试，验证了具体的功能行为。单元测试包含
**context.test.ts**（parseCookies、createLoadContext、createMetaContext、
createServerResponse）。测试覆盖了：

- ✅ 配置管理（验证和合并，含 render.mode hybrid）
- ✅ 服务容器集成
- ✅ 生命周期管理
- ✅ 中间件系统
- ✅ 插件系统
- ✅ 插件事件系统（含 onSocket、onSocketClose）
- ✅ 服务器集成
- ✅ 数据库集成
- ✅ 构建工具集成
- ✅ 渲染引擎集成（renderSSR、renderSSG）
- ✅ 路由系统集成
- ✅ 日志系统集成
- ✅ CLI 命令模块（createCLI）
- ✅
  路由上下文（parseCookies、createLoadContext、createMetaContext、createServerResponse）
- ✅ 运行时适配器（runtime-adapter re-export）
- ✅ 统一错误处理（DwebError、throwDwebError、i18n 翻译器）
- ✅ CSR 客户端构建与 createRendererCSR
- ✅ createRendererSSR / createRendererHybrid / createRendererSSG
- ✅ 版本（DWEB_VERSION）
- ✅ 工具模块（sanitize、path、runtime、asset-manifest、config-loader）
- ✅
  功能模块（module-cache、load-route-module、csr-client-middleware、socket-io、websocket）
- ✅ CLI
  子命令（clean、build、dev、start、preview、fmt、lint、test、upgrade、update）
- ✅ Windows
  兼容性（路径规范化、构建输出推断、模块缓存、组件路径提取、路径安全校验、日志友好路径）
- ✅
  **端到端测试**：浏览器渲染（各示例首页、关于、计数器、metadata）、服务器请求
- ✅ **集成测试**：配置与生命周期、CSR/SSR/SSG/Hybrid
  多种引擎与构建形态的构建与启动验证

框架核心功能与端到端、集成场景已完成全面测试验证。
