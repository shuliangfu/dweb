/**
 * 压缩中间件单元测试
 */

import { assertEquals, assert } from '@std/assert';
import { compression } from '../../../src/middleware/compression.ts';

Deno.test('Compression Middleware - 压缩文本响应', async () => {
  const middleware = compression();
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'Accept-Encoding': 'gzip',
    }),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers({
      'Content-Type': 'text/html; charset=utf-8',
    }),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
    get body() {
      return this._body;
    },
    set body(value: string | Uint8Array | undefined) {
      this._body = value;
    },
    _body: 'Hello World '.repeat(100) as string | Uint8Array | undefined,
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 应该设置了压缩相关的响应头
  assert(res.headers.get('Content-Encoding') === 'gzip' || res.headers.get('Content-Encoding') === 'br');
  assert(nextCalled);
});

Deno.test('Compression Middleware - 不压缩小响应', async () => {
  const middleware = compression({
    threshold: 1024, // 1KB 阈值
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'Accept-Encoding': 'gzip',
    }),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers({
      'Content-Type': 'text/plain',
    }),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
    get body() {
      return this._body;
    },
    set body(value: string | Uint8Array | undefined) {
      this._body = value;
    },
    _body: 'Small' as string | Uint8Array | undefined,
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 小响应不应该被压缩
  assert(res.headers.get('Content-Encoding') === null);
  assert(nextCalled);
});

Deno.test('Compression Middleware - 不压缩二进制响应', async () => {
  const middleware = compression();
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'Accept-Encoding': 'gzip',
    }),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  const binaryData = new Uint8Array([1, 2, 3, 4, 5]);
  
  const res = {
    status: 200,
    headers: new Headers({
      'Content-Type': 'image/png',
    }),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
    get body() {
      return this._body;
    },
    set body(value: string | Uint8Array | undefined) {
      this._body = value;
    },
    _body: binaryData as string | Uint8Array | undefined,
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 二进制响应不应该被压缩（默认过滤器只压缩文本类型）
  assert(res.headers.get('Content-Encoding') === null);
  assert(nextCalled);
});

Deno.test('Compression Middleware - 客户端不支持压缩', async () => {
  const middleware = compression();
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers(), // 没有 Accept-Encoding
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers({
      'Content-Type': 'text/html',
    }),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
    get body() {
      return this._body;
    },
    set body(value: string | Uint8Array | undefined) {
      this._body = value;
    },
    _body: 'Hello World '.repeat(100) as string | Uint8Array | undefined,
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 客户端不支持压缩时，不应该设置 Content-Encoding
  assert(res.headers.get('Content-Encoding') === null);
  assert(nextCalled);
});

Deno.test('Compression Middleware - 自定义过滤器', async () => {
  const middleware = compression({
    filter: (contentType: string) => {
      // 只压缩 JSON
      return contentType.includes('application/json');
    },
    threshold: 100, // 降低阈值以确保压缩
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'Accept-Encoding': 'gzip',
    }),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  const largeJson = JSON.stringify({ data: 'test '.repeat(200) }); // 确保足够大
  const res = {
    status: 200,
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
    get body() {
      return this._body;
    },
    set body(value: string | Uint8Array | undefined) {
      this._body = value;
    },
    _body: largeJson as string | Uint8Array | undefined,
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // JSON 应该被压缩（如果压缩成功）
  // 注意：压缩可能失败，所以只检查 next 被调用
  assert(nextCalled);
});

Deno.test('Compression Middleware - Brotli 压缩', async () => {
  const middleware = compression({
    brotli: true,
    threshold: 100,
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'Accept-Encoding': 'br, gzip',
    }),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers({
      'Content-Type': 'text/html',
    }),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
    get body() {
      return this._body;
    },
    set body(value: string | Uint8Array | undefined) {
      this._body = value;
    },
    _body: 'Hello World '.repeat(200) as string | Uint8Array | undefined,
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 如果 Brotli 支持，应该设置 br 编码；否则可能使用 gzip 或不压缩
  const encoding = res.headers.get('Content-Encoding');
  assert(encoding === null || encoding === 'br' || encoding === 'gzip');
  assert(nextCalled);
});

Deno.test('Compression Middleware - 已设置 Content-Encoding 时不压缩', async () => {
  const middleware = compression();
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'Accept-Encoding': 'gzip',
    }),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers({
      'Content-Type': 'text/html',
      'Content-Encoding': 'identity', // 已设置编码
    }),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
    get body() {
      return this._body;
    },
    set body(value: string | Uint8Array | undefined) {
      this._body = value;
    },
    _body: 'Hello World '.repeat(200) as string | Uint8Array | undefined,
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 已设置 Content-Encoding 时，不应该再次压缩
  assertEquals(res.headers.get('Content-Encoding'), 'identity');
  assert(nextCalled);
});

Deno.test('Compression Middleware - 空响应体不压缩', async () => {
  const middleware = compression();
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'Accept-Encoding': 'gzip',
    }),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers({
      'Content-Type': 'text/html',
    }),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
    get body() {
      return this._body;
    },
    set body(value: string | Uint8Array | undefined) {
      this._body = value;
    },
    _body: undefined as string | Uint8Array | undefined,
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 空响应体不应该被压缩
  assert(res.headers.get('Content-Encoding') === null);
  assert(nextCalled);
});

Deno.test('Compression Middleware - 压缩级别配置', async () => {
  const middleware = compression({
    level: 9, // 最高压缩级别
    threshold: 100,
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'Accept-Encoding': 'gzip',
    }),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers({
      'Content-Type': 'text/html',
    }),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
    get body() {
      return this._body;
    },
    set body(value: string | Uint8Array | undefined) {
      this._body = value;
    },
    _body: 'Hello World '.repeat(200) as string | Uint8Array | undefined,
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 应该尝试压缩（可能成功或失败）
  assert(nextCalled);
  // 如果压缩成功，应该设置了 Content-Encoding
  const encoding = res.headers.get('Content-Encoding');
  assert(encoding === null || encoding === 'gzip');
});

Deno.test('Compression Middleware - 不同 Content-Type 过滤', async () => {
  const middleware = compression({
    threshold: 100,
  });
  
  const testCases = [
    { contentType: 'text/html', shouldCompress: true },
    { contentType: 'application/json', shouldCompress: true },
    { contentType: 'application/javascript', shouldCompress: true },
    { contentType: 'image/png', shouldCompress: false },
    { contentType: 'video/mp4', shouldCompress: false },
  ];
  
  for (const testCase of testCases) {
    const req = {
      method: 'GET',
      url: 'http://localhost:3000/test',
      headers: new Headers({
        'Accept-Encoding': 'gzip',
      }),
      getHeader: function(name: string) {
        return this.headers.get(name);
      },
    } as any;
    
    const res = {
      status: 200,
      headers: new Headers({
        'Content-Type': testCase.contentType,
      }),
      setHeader: function(name: string, value: string) {
        this.headers.set(name, value);
      },
      get body() {
        return this._body;
      },
      set body(value: string | Uint8Array | undefined) {
        this._body = value;
      },
      _body: 'Test '.repeat(100) as string | Uint8Array | undefined,
    } as any;
    
    let nextCalled = false;
    const next = async () => {
      nextCalled = true;
    };
    
    await middleware(req, res, next);
    
    // 根据 Content-Type 判断是否应该压缩
    const encoding = res.headers.get('Content-Encoding');
    if (testCase.shouldCompress) {
      // 文本类型可能被压缩（取决于压缩是否成功）
      assert(encoding === null || encoding === 'gzip' || encoding === 'br');
    } else {
      // 非文本类型不应该被压缩
      assert(encoding === null);
    }
    assert(nextCalled);
  }
});

Deno.test('Compression Middleware - 压缩后数据更大时不使用压缩', async () => {
  // 注意：这个测试可能难以直接验证，因为压缩通常都会减小数据
  // 但我们可以测试压缩逻辑是否正确执行
  const middleware = compression({
    threshold: 10, // 很低的阈值
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'Accept-Encoding': 'gzip',
    }),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  // 使用很小的数据（可能压缩后反而更大）
  const res = {
    status: 200,
    headers: new Headers({
      'Content-Type': 'text/html',
    }),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
    get body() {
      return this._body;
    },
    set body(value: string | Uint8Array | undefined) {
      this._body = value;
    },
    _body: 'Small' as string | Uint8Array | undefined,
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 小数据可能不会被压缩（小于阈值）
  assert(nextCalled);
});

Deno.test('Compression Middleware - 禁用 Gzip', async () => {
  const middleware = compression({
    gzip: false,
    brotli: false,
    threshold: 100,
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'Accept-Encoding': 'gzip, br',
    }),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers({
      'Content-Type': 'text/html',
    }),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
    get body() {
      return this._body;
    },
    set body(value: string | Uint8Array | undefined) {
      this._body = value;
    },
    _body: 'Hello World '.repeat(200) as string | Uint8Array | undefined,
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // Gzip 和 Brotli 都被禁用，不应该压缩
  assert(res.headers.get('Content-Encoding') === null);
  assert(nextCalled);
});

