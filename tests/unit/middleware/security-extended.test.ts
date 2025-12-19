/**
 * 安全中间件扩展测试
 * 补充 security 中间件的其他功能测试
 */

import { assertEquals, assert } from '@std/assert';
import { security } from '../../../src/middleware/security.ts';

Deno.test('Security Middleware - 设置 Referrer-Policy', async () => {
  const middleware = security({
    referrerPolicy: 'strict-origin-when-cross-origin',
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
    query: {},
    body: undefined,
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
  
  // 应该设置了 Referrer-Policy 头
  assertEquals(res.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
  assert(nextCalled);
});

Deno.test('Security Middleware - 设置 X-Content-Type-Options', async () => {
  const middleware = security({
    contentTypeOptions: 'nosniff',
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
    query: {},
    body: undefined,
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
  
  // 应该设置了 X-Content-Type-Options 头
  assertEquals(res.headers.get('X-Content-Type-Options'), 'nosniff');
  assert(nextCalled);
});

Deno.test('Security Middleware - CSP 字符串配置', async () => {
  const middleware = security({
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'",
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
    query: {},
    body: undefined,
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

Deno.test('Security Middleware - CSP 完整配置', async () => {
  const middleware = security({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      upgradeInsecureRequests: true,
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
    query: {},
    body: undefined,
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
  assert(csp?.includes("script-src 'self' 'unsafe-inline'"));
  assert(csp?.includes("upgrade-insecure-requests"));
  assert(nextCalled);
});

Deno.test('Security Middleware - HSTS 布尔值配置', async () => {
  const middleware = security({
    hsts: true,
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
    query: {},
    body: undefined,
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

Deno.test('Security Middleware - HSTS 完整配置', async () => {
  const middleware = security({
    hsts: {
      maxAge: 63072000, // 2 年
      includeSubDomains: true,
      preload: true,
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
    query: {},
    body: undefined,
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
  assert(hsts?.includes('max-age=63072000'));
  assert(hsts?.includes('includeSubDomains'));
  assert(hsts?.includes('preload'));
  assert(nextCalled);
});

Deno.test('Security Middleware - CSRF 跳过路径', async () => {
  const middleware = security({
    csrfProtection: true,
    csrfMethods: ['POST'],
    csrfSkip: ['/api/webhook/*', '/public/*'],
  });
  
  const req = {
    method: 'POST',
    url: 'http://localhost:3000/api/webhook/test',
    headers: new Headers(),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
    cookies: {},
    getCookie: function(_name: string) {
      return null;
    },
    query: {},
    body: undefined,
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
  
  // 跳过的路径应该通过，不进行 CSRF 验证
  assert(nextCalled);
  assertEquals(res.status, 200);
});

Deno.test('Security Middleware - CSRF Token 从查询参数获取', async () => {
  const middleware = security({
    csrfProtection: true,
    csrfMethods: ['POST'],
  });
  
  // 先获取 CSRF Token
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
    body: undefined,
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
  
  await middleware(getReq, getRes, next);
  
  const csrfToken = getReq.cookies['_csrf'];
  assert(csrfToken !== undefined);
  
  // 从查询参数发送 CSRF Token
  const postReq = {
    method: 'POST',
    url: 'http://localhost:3000/test',
    headers: new Headers(),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
    cookies: getReq.cookies,
    query: { _csrf: csrfToken },
    getCookie: function(name: string) {
      return this.cookies[name] || null;
    },
    body: undefined,
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
  
  // 从查询参数获取的 Token 应该有效
  assert(nextCalled);
});

Deno.test('Security Middleware - CSRF Token 从请求体获取', async () => {
  const middleware = security({
    csrfProtection: true,
    csrfMethods: ['POST'],
  });
  
  // 先获取 CSRF Token
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
    body: undefined,
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
  
  await middleware(getReq, getRes, next);
  
  const csrfToken = getReq.cookies['_csrf'];
  assert(csrfToken !== undefined);
  
  // 从请求体发送 CSRF Token
  const postReq = {
    method: 'POST',
    url: 'http://localhost:3000/test',
    headers: new Headers(),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
    cookies: getReq.cookies,
    query: {},
    getCookie: function(name: string) {
      return this.cookies[name] || null;
    },
    body: { _csrf: csrfToken, data: 'test' },
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
  
  // 从请求体获取的 Token 应该有效
  assert(nextCalled);
});

Deno.test('Security Middleware - Permissions-Policy', async () => {
  const middleware = security({
    permissionsPolicy: {
      geolocation: ["'self'"],
      camera: ["'none'"],
      microphone: ["'self'"],
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
    query: {},
    body: undefined,
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
  
  // 应该设置了 Permissions-Policy 头
  const policy = res.headers.get('Permissions-Policy');
  assert(policy !== null);
  assert(policy?.includes('geolocation') || policy?.includes('camera') || policy?.includes('microphone'));
  assert(nextCalled);
});

Deno.test('Security Middleware - 禁用 XSS 防护', async () => {
  const middleware = security({
    xssProtection: false,
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
    query: {},
    body: undefined,
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
  
  // 不应该设置 X-XSS-Protection 头
  assertEquals(res.headers.get('X-XSS-Protection'), null);
  assert(nextCalled);
});

Deno.test('Security Middleware - 禁用 CSRF 防护', async () => {
  const middleware = security({
    csrfProtection: false,
  });
  
  const req = {
    method: 'POST',
    url: 'http://localhost:3000/test',
    headers: new Headers(),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
    cookies: {},
    getCookie: function(_name: string) {
      return null;
    },
    query: {},
    body: undefined,
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
  
  // 禁用 CSRF 防护时，POST 请求应该通过
  assert(nextCalled);
  assertEquals(res.status, 200);
});

