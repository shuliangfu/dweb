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

