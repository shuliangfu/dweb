/**
 * 中间件文档页面
 */

import CodeBlock from '../components/CodeBlock.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: '中间件 - DWeb 框架文档',
  description: '内置中间件和使用指南',
};

export default function MiddlewarePage({ params: _params, query: _query, data: _data }: PageProps) {
  const middlewareCode = `import type { Middleware } from '@dreamer/dweb/core/middleware';

const myMiddleware: Middleware = async (req, res, next) => {
  // 请求前处理
  console.log('Before:', req.url);
  
  // 调用下一个中间件
  await next();
  
  // 响应后处理
  console.log('After:', res.status);
};`;

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">中间件</h1>
          <p className="text-gray-700 leading-relaxed mb-8">
            DWeb 框架提供了强大的中间件系统，支持自定义中间件和内置中间件。
          </p>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">创建中间件</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              中间件是一个函数，接收请求、响应和下一个中间件函数作为参数：
            </p>
            <CodeBlock code={middlewareCode} language="typescript" />
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">内置中间件</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              框架提供了多个内置中间件，用于处理常见的 HTTP 请求和响应任务：
            </p>

            {/* logger */}
            <section id="logger" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">logger - 请求日志</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                记录 HTTP 请求日志，支持多种日志格式。
              </p>
              <CodeBlock code={`import { logger } from '@dreamer/dweb/middleware';

server.use(logger({
  format: 'combined', // 'combined' | 'common' | 'dev' | 'short' | 'tiny'
}));`} language="typescript" />
            </section>

            {/* cors */}
            <section id="cors" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">cors - 跨域支持</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                处理跨域资源共享（CORS）请求。
              </p>
              <CodeBlock code={`import { cors } from '@dreamer/dweb/middleware';

server.use(cors({
  origin: '*', // 或指定域名 ['https://example.com']
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));`} language="typescript" />
            </section>

            {/* bodyParser */}
            <section id="bodyParser" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">bodyParser - 请求体解析</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                解析 HTTP 请求体，支持 JSON、URL-encoded、文本和原始数据。
              </p>
              <CodeBlock code={`import { bodyParser } from '@dreamer/dweb/middleware';

server.use(bodyParser({
  json: { limit: '1mb' },
  urlencoded: { limit: '1mb', extended: true },
  text: { limit: '1mb' },
  raw: { limit: '1mb' },
}));`} language="typescript" />
            </section>

            {/* compression */}
            <section id="compression" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">compression - 响应压缩</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                压缩 HTTP 响应，减少传输数据量。
              </p>
              <CodeBlock code={`import { compression } from '@dreamer/dweb/middleware';

server.use(compression({
  level: 6, // 压缩级别 0-9
  threshold: 1024, // 最小压缩大小（字节）
}));`} language="typescript" />
            </section>

            {/* staticFiles */}
            <section id="staticFiles" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">staticFiles - 静态文件服务</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                提供静态文件服务，支持缓存和 MIME 类型识别。
              </p>
              <CodeBlock code={`import { staticFiles } from '@dreamer/dweb/middleware';

server.use(staticFiles({
  dir: 'assets',
  prefix: '/assets',
  maxAge: 86400, // 缓存时间（秒）
}));`} language="typescript" />
            </section>

            {/* security */}
            <section id="security" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">security - 安全头</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                设置 HTTP 安全响应头，提高应用安全性。
              </p>
              <CodeBlock code={`import { security } from '@dreamer/dweb/middleware';

server.use(security({
  contentSecurityPolicy: true,
  xFrameOptions: 'DENY',
  xContentTypeOptions: true,
}));`} language="typescript" />
            </section>

            {/* rateLimit */}
            <section id="rateLimit" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">rateLimit - 速率限制</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                限制请求速率，防止滥用和 DDoS 攻击。
              </p>
              <CodeBlock code={`import { rateLimit } from '@dreamer/dweb/middleware';

server.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 时间窗口（毫秒）
  max: 100, // 最大请求数
}));`} language="typescript" />
            </section>

            {/* auth */}
            <section id="auth" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">auth - JWT 认证</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                提供 JWT 认证功能，支持令牌生成和验证。
              </p>
              <CodeBlock code={`import { auth } from '@dreamer/dweb/middleware';

server.use(auth({
  secret: 'your-secret-key',
  algorithms: ['HS256'],
}));`} language="typescript" />
            </section>

            {/* health */}
            <section id="health" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">health - 健康检查</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                提供应用健康检查端点。
              </p>
              <CodeBlock code={`import { health } from '@dreamer/dweb/middleware';

server.use(health({
  path: '/health',
  checks: {
    database: async () => {
      // 检查数据库连接
      return { status: 'ok' };
    },
  },
}));`} language="typescript" />
            </section>

            {/* requestId */}
            <section id="requestId" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">requestId - 请求 ID</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                为每个请求生成唯一 ID，便于追踪和调试。
              </p>
              <CodeBlock code={`import { requestId } from '@dreamer/dweb/middleware';

server.use(requestId({
  header: 'X-Request-ID',
  generator: () => crypto.randomUUID(),
}));`} language="typescript" />
            </section>

            {/* requestValidator */}
            <section id="requestValidator" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">requestValidator - 请求验证</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                验证请求数据，确保数据格式和内容符合要求。
              </p>
              <CodeBlock code={`import { requestValidator } from '@dreamer/dweb/middleware';

server.use(requestValidator({
  body: {
    name: { type: 'string', required: true, min: 2, max: 50 },
    email: { type: 'string', required: true, pattern: /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/ },
  },
}));`} language="typescript" />
            </section>

            {/* ipFilter */}
            <section id="ipFilter" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">ipFilter - IP 过滤</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                根据 IP 地址过滤请求，支持白名单和黑名单。
              </p>
              <CodeBlock code={`import { ipFilter } from '@dreamer/dweb/middleware';

// 白名单
server.use(ipFilter({
  whitelist: ['192.168.1.0/24', '10.0.0.0/8'],
}));

// 黑名单
server.use(ipFilter({
  blacklist: ['192.168.1.100'],
}));`} language="typescript" />
            </section>

            {/* errorHandler */}
            <section id="errorHandler" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">errorHandler - 错误处理</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                统一处理应用错误，提供友好的错误响应。
              </p>
              <CodeBlock code={`import { errorHandler } from '@dreamer/dweb/middleware';

server.use(errorHandler({
  format: 'json', // 'json' | 'html' | 'text'
  includeStack: process.env.NODE_ENV === 'development',
}));`} language="typescript" />
            </section>
          </section>
        </article>
      </div>
    </div>
  );
}
