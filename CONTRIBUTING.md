# 贡献指南

感谢你对 DWeb 框架的兴趣！我们欢迎所有形式的贡献，无论是报告问题、提出功能建议，还是提交代码。

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
  - [报告问题](#报告问题)
  - [提出功能建议](#提出功能建议)
  - [提交代码](#提交代码)
- [开发环境设置](#开发环境设置)
- [代码规范](#代码规范)
- [提交流程](#提交流程)
- [Pull Request 规范](#pull-request-规范)
- [代码审查](#代码审查)

## 🤝 行为准则

参与本项目时，请遵守以下行为准则：

- **尊重他人** - 保持友好和专业的态度
- **包容性** - 欢迎不同背景和经验水平的贡献者
- **建设性反馈** - 提供有建设性的反馈和建议
- **协作精神** - 与团队成员和其他贡献者积极协作

## 🚀 如何贡献

### 报告问题

如果你发现了 bug 或问题，请通过 [GitHub Issues](https://github.com/shuliangfu/dweb/issues) 报告。

**报告问题时，请包含以下信息：**

1. **问题描述** - 清晰描述问题是什么
2. **复现步骤** - 详细说明如何复现问题
3. **预期行为** - 说明你期望的行为
4. **实际行为** - 说明实际发生了什么
5. **环境信息**：
   - Deno 版本：`deno --version`
   - 操作系统和版本
   - DWeb 框架版本
6. **相关代码** - 如果可能，提供最小复现示例
7. **截图或日志** - 如果有错误信息或截图，请一并提供

**Issue 模板示例：**

```markdown
## 问题描述
简要描述问题

## 复现步骤
1. 
2. 
3. 

## 预期行为
描述期望的行为

## 实际行为
描述实际发生的行为

## 环境信息
- Deno 版本: 
- 操作系统: 
- DWeb 版本: 

## 相关代码
```typescript
// 相关代码片段
```

## 错误信息
```
错误日志或堆栈跟踪
```
```

### 提出功能建议

如果你有功能建议或改进想法，欢迎通过 [GitHub Issues](https://github.com/shuliangfu/dweb/issues) 提出。

**功能建议应包含：**

1. **功能描述** - 清晰描述你希望添加的功能
2. **使用场景** - 说明这个功能在什么场景下有用
3. **可能的实现方案** - 如果有想法，可以描述可能的实现方式
4. **相关讨论** - 如果之前有相关讨论，请提供链接

### 提交代码

我们欢迎代码贡献！无论是修复 bug、添加功能，还是改进文档，都非常感谢。

## 🛠️ 开发环境设置

### 前置要求

- **Deno** >= 2.0.0
- **Git**
- 代码编辑器（推荐 VS Code + Deno 扩展）

### 克隆仓库

```bash
# 克隆仓库
git clone https://github.com/shuliangfu/dweb.git
cd dweb

# 添加上游仓库（如果需要）
git remote add upstream https://github.com/shuliangfu/dweb.git
```

### 安装依赖

DWeb 使用 Deno 的 JSR 和 npm 包管理，依赖会自动下载：

```bash
# 缓存依赖（会自动下载）
deno cache deno.json

# 如果使用 example 项目
cd example
deno cache deno.json
```

### 运行示例项目

```bash
# 进入示例目录
cd example

# 启动开发服务器
deno task dev
```

### 运行测试

```bash
# 代码检查
deno task lint

# 代码格式化检查
deno task fmt:check

# 类型检查
deno task check
```

## 📝 代码规范

### 代码风格

DWeb 使用 Deno 的内置格式化工具。提交代码前，请确保代码已格式化：

```bash
# 格式化代码
deno task fmt

# 检查代码格式
deno task fmt:check
```

### 代码检查

```bash
# 运行 linter
deno task lint
```

### 命名规范

- **文件命名**：使用 kebab-case（如 `route-handler.ts`）
- **函数和变量**：使用 camelCase（如 `handleRoute`）
- **类型和接口**：使用 PascalCase（如 `AppConfig`）
- **常量**：使用 UPPER_SNAKE_CASE（如 `MAX_RETRIES`）

### 注释规范

- 使用 JSDoc 格式为公共 API 添加文档注释
- 复杂逻辑应添加行内注释说明
- 使用中文注释（项目主要面向中文用户）

**示例：**

```typescript
/**
 * 处理路由请求
 * @param routeHandler 路由处理器实例
 * @param req HTTP 请求对象
 * @param res HTTP 响应对象
 */
async function handleRoute(
  routeHandler: RouteHandler,
  req: Request,
  res: Response
): Promise<void> {
  // 实现逻辑
}
```

### TypeScript 规范

- 优先使用 TypeScript 类型，避免使用 `any`
- 使用明确的类型注解，特别是函数参数和返回值
- 使用 `interface` 定义对象类型，使用 `type` 定义联合类型或别名

## 🔄 提交流程

### 1. Fork 仓库

在 GitHub 上 Fork 本仓库到你的账户。

### 2. 创建分支

从 `main` 分支创建新分支：

```bash
# 确保在 main 分支
git checkout main

# 拉取最新代码
git pull upstream main

# 创建新分支（使用描述性的分支名）
git checkout -b fix/issue-description
# 或
git checkout -b feature/new-feature-name
```

**分支命名规范：**

- `fix/` - 修复 bug
- `feature/` - 新功能
- `docs/` - 文档更新
- `refactor/` - 代码重构
- `test/` - 测试相关
- `chore/` - 构建/工具相关

### 3. 进行更改

- 编写代码
- 添加必要的注释和文档
- 确保代码通过 lint 和格式检查
- 如果可能，添加或更新相关测试

### 4. 提交更改

使用清晰的提交信息：

```bash
git add .
git commit -m "fix: 修复路由匹配问题

- 修复动态路由优先级问题
- 添加路由匹配测试用例
- 更新相关文档"
```

**提交信息规范（遵循 Conventional Commits）：**

- `fix:` - 修复 bug
- `feat:` - 新功能
- `docs:` - 文档更新
- `style:` - 代码格式（不影响功能）
- `refactor:` - 代码重构
- `test:` - 测试相关
- `chore:` - 构建/工具相关
- `perf:` - 性能优化

### 5. 推送分支

```bash
git push origin your-branch-name
```

### 6. 创建 Pull Request

在 GitHub 上创建 Pull Request，并填写 PR 模板。

## 📋 Pull Request 规范

### PR 标题

使用清晰的标题，格式：`类型: 简短描述`

示例：
- `fix: 修复路由匹配问题`
- `feat: 添加 Redis Session 存储支持`
- `docs: 更新 API 文档`

### PR 描述

PR 描述应包含：

1. **变更说明** - 清晰描述本次 PR 的变更内容
2. **相关 Issue** - 如果修复了 Issue，使用 `Fixes #123` 或 `Closes #123`
3. **测试说明** - 说明如何测试这些变更
4. **检查清单** - 确认已完成的事项

**PR 模板示例：**

```markdown
## 变更说明
简要描述本次 PR 的变更内容

## 相关 Issue
Fixes #123

## 变更类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 文档更新
- [ ] 代码重构
- [ ] 性能优化
- [ ] 其他（请说明）

## 测试说明
1. 如何测试这些变更
2. 测试步骤

## 检查清单
- [ ] 代码已通过 lint 检查
- [ ] 代码已格式化
- [ ] 已添加必要的注释和文档
- [ ] 已更新相关文档（如 README、DOC.md）
- [ ] 已测试功能正常工作
- [ ] 提交信息遵循 Conventional Commits 规范
```

### PR 大小

- 尽量保持 PR 小而专注，一个 PR 解决一个问题
- 如果变更较大，可以拆分成多个 PR
- 大型重构建议先创建 Issue 讨论

### 代码审查

- 所有 PR 都需要通过代码审查才能合并
- 请耐心等待审查，审查者可能会提出修改建议
- 根据审查意见及时修改代码
- 如果对审查意见有疑问，欢迎讨论

## ✅ 代码审查

### 审查者检查项

- 代码质量和风格
- 功能正确性
- 测试覆盖
- 文档完整性
- 性能影响
- 向后兼容性

### 作者注意事项

- 及时响应审查意见
- 保持友好和专业的态度
- 如果不同意某些意见，可以礼貌地讨论
- 修改后及时通知审查者

## 📚 相关资源

- [Deno 官方文档](https://deno.land/docs)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Preact 文档](https://preactjs.com/guide/v10/getting-started)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Conventional Commits](https://www.conventionalcommits.org/)

## ❓ 需要帮助？

如果你在贡献过程中遇到问题，可以通过以下方式获取帮助：

- 在 [GitHub Discussions](https://github.com/shuliangfu/dweb/discussions) 提问
- 创建 [GitHub Issue](https://github.com/shuliangfu/dweb/issues)
- 查看 [项目文档](./DOC.md)

---

再次感谢你对 DWeb 框架的贡献！🎉

