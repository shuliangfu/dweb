# Preact Advanced 示例

这是一个使用 `@dreamer/dweb` 框架的高级模式示例，展示前后端分离的全栈应用。

## 项目结构

```
advanced/
├── deno.json              # 项目配置
├── src/
│   ├── common/            # 共享代码
│   │   ├── config/        # 共享配置
│   │   ├── services/      # 共享服务
│   │   ├── types/         # 共享类型
│   │   └── utils/         # 工具函数
│   ├── frontend/          # 前台网站
│   │   ├── config/        # 前台配置
│   │   ├── main.ts        # 前台入口
│   │   └── routes/        # 前台页面路由
│   └── backend/           # 后台管理
│       ├── config/        # 后台配置
│       ├── main.ts        # 后台入口
│       └── routes/        # 后台页面路由
```

## 运行

```bash
# 启动前台网站 (端口 3000)
deno task frontend

# 启动后台管理 (端口 3001)
deno task backend
```

## 功能

### 前台网站 (Frontend)
- 首页
- 关于页面
- 用户列表和详情页

### 后台管理 (Backend)
- 仪表盘 - 统计数据和最近用户
- 用户管理 - 用户列表、编辑、删除
- 系统设置 - 基本配置和服务状态

## 技术栈

- **框架**: @dreamer/dweb
- **渲染**: Preact (SSR)
- **样式**: Tailwind CSS v4 (CDN)
- **路由**: 文件系统路由
