/**
 * 功能模块 - 环境变量 (env) 文档页面
 * 展示 DWeb 框架的环境变量管理功能
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "环境变量 (env) - DWeb 框架文档",
  description: "DWeb 框架的环境变量管理使用指南",
};

export default function FeaturesEnvPage() {
  // 开发环境
  const devEnvCode = `# .env.development
PORT=3000
DB_HOST=localhost
DB_NAME=mydb_dev
DB_USER=dev_user
DB_PASSWORD=dev_password
API_KEY=dev_api_key`;

  // 生产环境
  const prodEnvCode = `# .env.production
PORT=3000
DB_HOST=prod-db.example.com
DB_NAME=mydb
DB_USER=prod_user
DB_PASSWORD=prod_password
API_KEY=prod_api_key`;

  // 使用环境变量
  const usageCode = `// dweb.config.ts
export default {
  server: {
    port: parseInt(Deno.env.get("PORT") || "3000"),
  },
  database: {
    connection: {
      host: Deno.env.get("DB_HOST") || "localhost",
      database: Deno.env.get("DB_NAME") || "mydb",
      user: Deno.env.get("DB_USER"),
      password: Deno.env.get("DB_PASSWORD"),
    },
  },
};`;

  // 在代码中使用
  const codeUsageCode = `// 在代码中使用环境变量
const apiKey = Deno.env.get("API_KEY");
if (!apiKey) {
  throw new Error("API_KEY 环境变量未设置");
}

// 使用环境变量
const response = await fetch(\`https://api.example.com/data?key=\${apiKey}\`);`;

  // 环境变量文件优先级
  const priorityCode = `环境变量文件加载优先级（从高到低）：

1. .env.local（本地覆盖，不应提交到版本控制）
2. .env.development 或 .env.production（根据环境）
3. .env（默认配置）

注意：.env.local 中的变量会覆盖其他文件中的同名变量`;

  const content = {
    title: "环境变量 (env)",
    description:
      "DWeb 框架支持使用环境变量来配置应用，支持不同环境的配置文件。",
    sections: [
      {
        title: "开发环境",
        blocks: [
          {
            type: "text",
            content: "创建 `.env.development` 文件：",
          },
          {
            type: "code",
            code: devEnvCode,
            language: "env",
          },
        ],
      },
      {
        title: "生产环境",
        blocks: [
          {
            type: "text",
            content: "创建 `.env.production` 文件：",
          },
          {
            type: "code",
            code: prodEnvCode,
            language: "env",
          },
        ],
      },
      {
        title: "使用环境变量",
        blocks: [
          {
            type: "text",
            content: "在 `dweb.config.ts` 中使用环境变量：",
          },
          {
            type: "code",
            code: usageCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "在代码中使用",
        blocks: [
          {
            type: "code",
            code: codeUsageCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "环境变量文件优先级",
        blocks: [
          {
            type: "code",
            code: priorityCode,
            language: "text",
          },
          {
            type: "alert",
            level: "warning",
            content:
              "**安全提示**：请确保 `.env.local` 和包含敏感信息的 `.env` 文件已添加到 `.gitignore`，不要提交到版本控制系统。",
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
              "[配置文档](/docs/deployment/configuration)",
              "[开发服务器](/docs/features/dev)",
              "[生产服务器](/docs/features/prod)",
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
