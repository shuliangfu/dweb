/**
 * 功能模块 - 生产服务器 (prod) 文档页面
 * 展示 DWeb 框架的生产服务器功能和使用方法
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "生产服务器 (prod) - DWeb 框架文档",
  description: "DWeb 框架的生产服务器使用指南，部署生产版本",
};

export default function FeaturesProdPage() {
  // 生产服务器 - 单应用模式
  const singleAppCode = `# 启动生产服务器
deno task start

# 或使用 CLI 命令
deno run -A @dreamer/dweb/cli start

# 使用环境变量指定环境
DENO_ENV=production deno task start`;

  // 生产服务器 - 多应用模式
  const multiAppCode = `# 启动所有应用
deno task start

# 启动指定应用
deno run -A @dreamer/dweb/cli start:app-name

# 或在 deno.json 中配置任务别名
# "start:app-name": "deno run -A @dreamer/dweb/cli start:app-name"`;

  // 生产服务器特性
  const featuresCode = `生产服务器特性：

- 优化的性能：代码已编译和压缩
- 静态资源缓存：配置的缓存策略生效
- 错误处理：生产环境友好的错误信息
- 日志记录：可配置的日志级别和输出
- TLS 支持：支持 HTTPS（如果配置了证书）`;

  // 环境变量
  const envVarsCode = `环境变量：

- DENO_ENV - 环境名称（development、production 等）
- PORT - 服务器端口（会覆盖配置文件中的设置）
- 其他自定义环境变量可在配置文件中通过 Deno.env.get() 获取

示例：
DENO_ENV=production PORT=8080 deno task start`;

  // Docker 部署
  const dockerCode = `# 构建镜像
docker build -t dweb-app .

# 运行容器
docker run -p 3000:3000 dweb-app

# 使用环境变量
docker run -p 3000:3000 -e DENO_ENV=production -e PORT=8080 dweb-app`;

  const content = {
    title: "生产服务器 (prod)",
    description: "DWeb 框架的生产服务器提供了优化的性能和安全性，适合部署到生产环境。",
    sections: [
      {
        title: "启动生产服务器",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "单应用模式",
            blocks: [
              {
                type: "code",
                code: singleAppCode,
                language: "bash",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "多应用模式",
            blocks: [
              {
                type: "code",
                code: multiAppCode,
                language: "bash",
              },
            ],
          },
        ],
      },
      {
        title: "生产服务器特性",
        blocks: [
          {
            type: "code",
            code: featuresCode,
            language: "text",
          },
        ],
      },
      {
        title: "生产环境优化",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "**集群模式 (Cluster Mode)**：支持 PUP_CLUSTER_INSTANCE 环境变量，自动适配端口偏移，无需手动配置即可实现多实例负载均衡部署。",
              "**零拷贝服务 (Zero-Copy Serving)**：静态文件服务采用零拷贝技术，直接将文件流传输到网络 socket，极大降低了 CPU 和内存占用。",
              "**优雅关闭 (Graceful Shutdown)**：内置信号处理机制（SIGINT, SIGTERM），确保在服务停止前完成正在处理的请求并正确释放数据库连接等资源。",
            ],
          },
        ],
      },
      {
        title: "环境变量",
        blocks: [
          {
            type: "code",
            code: envVarsCode,
            language: "text",
          },
        ],
      },
      {
        title: "Docker 部署",
        blocks: [
          {
            type: "code",
            code: dockerCode,
            language: "bash",
          },
          {
            type: "text",
            content: "详细说明请参考 [Docker 部署](/docs/deployment/docker) 文档。",
          },
        ],
      },
      {
        title: "相关文档",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "[构建](/docs/features/build)",
              "[优雅关闭](/docs/features/shutdown)",
              "[Docker 部署](/docs/deployment/docker)",
            ],
          },
        ],
      },
    ],
  };

  return (
    <DocRenderer
      content={content as Parameters<typeof DocRenderer>[0]["content"]}
    />
  );
}
