/**
 * GraphQL 服务器实现
 * 
 * 提供 GraphQL 查询处理、Schema 管理等功能。
 * 
 * @module features/graphql/server
 */

import type {
  GraphQLSchema,
  GraphQLConfig,
  GraphQLRequest,
  GraphQLResponse,
} from './types.ts';
import { parseQuery, validateQuery } from './parser.ts';
import { executeQuery } from './executor.ts';

/**
 * GraphQL 服务器类
 * 
 * 管理 GraphQL Schema，处理查询请求。
 * 
 * @example
 * ```typescript
 * import { GraphQLServer } from '@dreamer/dweb';
 * 
 * const server = new GraphQLServer({
 *   schema: {
 *     query: {
 *       name: 'Query',
 *       fields: {
 *         hello: {
 *           type: 'String',
 *           resolve: () => 'Hello World',
 *         },
 *       },
 *     },
 *   },
 * });
 * 
 * const result = await server.execute({ query: '{ hello }' });
 * ```
 */
export class GraphQLServer {
  private schema: GraphQLSchema;
  private config: Required<GraphQLConfig>;

  /**
   * 创建 GraphQL 服务器实例
   * 
   * @param schema - GraphQL Schema 定义
   * @param config - 服务器配置
   */
  constructor(
    schema: GraphQLSchema,
    config: GraphQLConfig = {}
  ) {
    this.schema = schema;
    this.config = {
      path: config.path || '/graphql',
      graphiql: config.graphiql !== false,
      graphiqlPath: config.graphiqlPath || '/graphiql',
      validation: config.validation !== false,
      cache: config.cache !== false,
      maxDepth: config.maxDepth || 10,
      maxComplexity: config.maxComplexity || 1000,
      context: config.context || (() => ({})),
    };
  }

  /**
   * 处理 GraphQL 请求
   * 
   * @param req - HTTP 请求对象
   * @returns GraphQL 响应
   * 
   * @example
   * ```typescript
   * const response = await server.handleRequest(req);
   * ```
   */
  async handleRequest(req: globalThis.Request): Promise<globalThis.Response> {
    try {
      // 解析请求
      const request = await this.parseRequest(req);

      // 验证查询
      if (this.config.validation) {
        const errors = validateQuery(
          request.query,
          this.config.maxDepth,
          this.config.maxComplexity
        );
        if (errors.length > 0) {
          return this.createResponse({ errors });
        }
      }

      // 解析查询
      const parsedQuery = parseQuery(request.query, request.variables);

      // 生成上下文
      const context = await this.config.context(req);

      // 执行查询
      const result = await executeQuery(this.schema, parsedQuery, context);

      return this.createResponse(result);
    } catch (error) {
      return this.createResponse({
        errors: [{
          message: error instanceof Error ? error.message : String(error),
        }],
      });
    }
  }

  /**
   * 解析 HTTP 请求为 GraphQL 请求
   * 
   * @param req - HTTP 请求对象
   * @returns GraphQL 请求
   */
  private async parseRequest(req: globalThis.Request): Promise<GraphQLRequest> {
    const method = req.method;
    const url = new URL(req.url);

    if (method === 'GET') {
      // GET 请求：从查询参数获取
      const query = url.searchParams.get('query');
      const operationName = url.searchParams.get('operationName') || undefined;
      const variablesStr = url.searchParams.get('variables');

      if (!query) {
        throw new Error('查询参数 query 是必需的');
      }

      let variables: Record<string, unknown> = {};
      if (variablesStr) {
        try {
          variables = JSON.parse(variablesStr);
        } catch {
          throw new Error('查询变量格式错误');
        }
      }

      return { query, operationName, variables };
    } else if (method === 'POST') {
      // POST 请求：从请求体获取
      const contentType = req.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        const body = await req.json() as GraphQLRequest;
        if (!body.query) {
          throw new Error('请求体必须包含 query 字段');
        }
        return body;
      } else if (contentType.includes('application/graphql')) {
        const query = await req.text();
        return { query };
      } else {
        // 尝试解析为 URL 编码的表单数据
        const formData = await req.formData();
        const query = formData.get('query') as string;
        const operationName = formData.get('operationName') as string | null;
        const variablesStr = formData.get('variables') as string | null;

        if (!query) {
          throw new Error('查询参数 query 是必需的');
        }

        let variables: Record<string, unknown> = {};
        if (variablesStr) {
          try {
            variables = JSON.parse(variablesStr);
          } catch {
            throw new Error('查询变量格式错误');
          }
        }

        return {
          query,
          operationName: operationName || undefined,
          variables,
        };
      }
    } else {
      throw new Error(`不支持的请求方法: ${method}`);
    }
  }

  /**
   * 创建 HTTP 响应
   * 
   * @param result - GraphQL 响应
   * @returns HTTP 响应对象
   */
  private createResponse(result: GraphQLResponse): globalThis.Response {
    return new Response(JSON.stringify(result), {
      status: result.errors && result.errors.length > 0 ? 400 : 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 生成 GraphiQL HTML
   * 
   * 使用 Preact 和 preact/compat 替代 React，保持与框架的一致性。
   * preact/compat 提供了与 React 的兼容层，使得 GraphiQL 可以在 Preact 环境下运行。
   * 
   * @returns GraphiQL HTML 字符串
   */
  getGraphiQLHTML(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>GraphiQL</title>
  <link rel="stylesheet" href="https://unpkg.com/graphiql@3/graphiql.min.css" />
  <!-- 使用 Preact 替代 React，保持与框架的一致性 -->
  <script type="module">
    // 导入 Preact 和 preact/compat（使用固定版本，与 import-map.ts 保持一致，避免 Preact 实例冲突）
    import { render } from 'https://esm.sh/preact@10.28.0';
    import * as PreactCompat from 'https://esm.sh/preact@10.28.0/compat';
    
    // 将 preact/compat 暴露为全局的 React，供 GraphiQL 使用
    // GraphiQL 期望使用 React.createElement 和 ReactDOM.render
    globalThis.React = PreactCompat;
    globalThis.ReactDOM = PreactCompat;
    
    // 导入 GraphiQL
    const { GraphiQL } = await import('https://esm.sh/graphiql@3');
    
    // GraphQL 查询执行器
    const graphQLFetcher = async (graphQLParams) => {
      const response = await fetch('${this.config.path}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graphQLParams),
      });
      return response.json();
    };

    // 渲染 GraphiQL 组件
    // 使用 React.createElement 和 ReactDOM.render（实际是 preact/compat）
    const container = document.getElementById('graphiql');
    if (container) {
      ReactDOM.render(
        React.createElement(GraphiQL, { fetcher: graphQLFetcher }),
        container
      );
    }
  </script>
</head>
<body style="margin: 0;">
  <div id="graphiql" style="height: 100vh;"></div>
</body>
</html>`;
  }

  /**
   * 获取配置
   * 
   * @returns 服务器配置
   */
  getConfig(): Required<GraphQLConfig> {
    return { ...this.config };
  }

  /**
   * 更新 Schema
   * 
   * @param schema - 新的 Schema 定义
   */
  updateSchema(schema: GraphQLSchema): void {
    this.schema = schema;
  }
}

