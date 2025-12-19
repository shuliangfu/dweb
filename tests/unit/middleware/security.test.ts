/**
 * 安全中间件单元测试
 */

import { assertEquals, assert } from '@std/assert';
import { security } from '../../../src/middleware/security.ts';

Deno.test('Security Middleware - 设置 XSS 防护头', async () => {
  const middleware = security({
    xssProtection: true,
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers(),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
    cookies: {},
    getCookie: function(_name: string) {
      return null;
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
    setCookie: function(_name: string, _value: string, _options?: any) {},
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 应该设置了 X-XSS-Protection 头
  assert(res.headers.get('X-XSS-Protection') !== null);
  assert(nextCalled);
});

Deno.test('Security Middleware - 设置 Content-Security-Policy', async () => {
  const middleware = security({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
    },
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers(),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
    cookies: {},
    getCookie: function(_name: string) {
      return null;
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
    setCookie: function(_name: string, _value: string, _options?: any) {},
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 应该设置了 Content-Security-Policy 头
  const csp = res.headers.get('Content-Security-Policy');
  assert(csp !== null);
  assert(csp?.includes("default-src 'self'"));
  assert(nextCalled);
});

Deno.test('Security Middleware - 设置 HSTS', async () => {
  const middleware = security({
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
    },
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers(),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
    cookies: {},
    getCookie: function(_name: string) {
      return null;
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
    setCookie: function(_name: string, _value: string, _options?: any) {},
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 应该设置了 Strict-Transport-Security 头
  const hsts = res.headers.get('Strict-Transport-Security');
  assert(hsts !== null);
  assert(hsts?.includes('max-age=31536000'));
  assert(hsts?.includes('includeSubDomains'));
  assert(nextCalled);
});

Deno.test('Security Middleware - CSRF 防护 - GET 请求跳过', async () => {
  const middleware = security({
    csrfProtection: true,
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers(),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
    cookies: {},
    getCookie: function(_name: string) {
      return null;
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
    setCookie: function(_name: string, _value: string, _options?: any) {},
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // GET 请求应该通过，不进行 CSRF 验证
  assert(nextCalled);
});

Deno.test('Security Middleware - CSRF 防护 - POST 请求需要 Token', async () => {
  const middleware = security({
    csrfProtection: true,
    csrfMethods: ['POST'],
  });
  
  // 先发送一个 GET 请求以获取 CSRF Token
  const getReq = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers(),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
    cookies: {},
    query: {},
    getCookie: function(name: string) {
      return this.cookies[name] || null;
    },
  } as any;
  
  const getRes = {
    status: 200,
    headers: new Headers(),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
    setCookie: function(name: string, value: string, _options?: any) {
      getReq.cookies[name] = value;
    },
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  // 第一次请求应该设置 CSRF Token
  await middleware(getReq, getRes, next);
  
  // 获取设置的 CSRF Token
  const csrfToken = getReq.cookies['_csrf'];
  assert(csrfToken !== undefined);
  
  // 现在发送 POST 请求，带 Token
  const postReq = {
    method: 'POST',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'X-CSRF-Token': csrfToken,
    }),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
    cookies: getReq.cookies,
    query: {},
    getCookie: function(name: string) {
      return this.cookies[name] || null;
    },
  } as any;
  
  const postRes = {
    status: 200,
    headers: new Headers(),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
    setCookie: function(_name: string, _value: string, _options?: any) {},
  } as any;
  
  nextCalled = false;
  await middleware(postReq, postRes, next);
  
  // 带有效 Token 的 POST 请求应该通过
  assert(nextCalled);
});

Deno.test('Security Middleware - 设置 X-Frame-Options', async () => {
  const middleware = security({
    frameOptions: 'DENY',
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers(),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
    cookies: {},
    getCookie: function(_name: string) {
      return null;
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
    },
    setCookie: function(_name: string, _value: string, _options?: any) {},
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 应该设置了 X-Frame-Options 头
  assertEquals(res.headers.get('X-Frame-Options'), 'DENY');
  assert(nextCalled);
});

