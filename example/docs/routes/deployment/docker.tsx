/**
 * Docker 部署文档页面
 */

import CodeBlock from '../../components/CodeBlock.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: 'Docker 部署 - DWeb 框架文档',
  description: 'Docker 部署指南',
};

export default function DockerPage({ params: _params, query: _query, data: _data }: PageProps) {
  const dockerfileCode = `FROM denoland/deno:latest

WORKDIR /app

# 复制依赖文件
COPY deno.json deno.lock ./

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["deno", "task", "start"]`;

  const dockerComposeCode = `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DENO_ENV=production
    volumes:
      - ./:/app`;

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Docker 部署</h1>
          <p className="text-gray-700 leading-relaxed mb-8">
            DWeb 框架可以轻松部署到 Docker 容器中。
          </p>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">Dockerfile</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              创建 <code className="bg-gray-100 px-2 py-1 rounded">Dockerfile</code> 文件：
            </p>
            <CodeBlock code={dockerfileCode} language="dockerfile" />
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">Docker Compose</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              创建 <code className="bg-gray-100 px-2 py-1 rounded">docker-compose.yml</code> 文件：
            </p>
            <CodeBlock code={dockerComposeCode} language="yaml" />
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">构建和运行</h2>
            <CodeBlock code={`# 构建镜像
docker build -t my-app .

# 运行容器
docker run -p 3000:3000 my-app

# 使用 Docker Compose
docker-compose up`} language="bash" />
          </section>
        </article>
      </div>
    </div>
  );
}
