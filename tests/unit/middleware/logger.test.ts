/**
 * 日志中间件单元测试
 */

import { assert } from '@std/assert';
import { logger } from '../../../src/middleware/logger.ts';

Deno.test('Logger Middleware - 创建中间件', () => {
  const middleware = logger();
  
  assert(middleware !== null);
  assert(typeof middleware === 'function');
});

Deno.test('Logger Middleware - 记录请求日志', async () => {
  const middleware = logger({
    format: 'combined',
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/test',
    headers: new Headers({
      'User-Agent': 'test-agent',
    }),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(_name: string, _value: string) {},
    body: 'OK',
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  // 捕获 console.log 输出（简化测试，只验证中间件可以正常执行）
  await middleware(req, res, next);
  
  // 应该调用了 next
  assert(nextCalled);
});

Deno.test('Logger Middleware - 跳过某些请求', async () => {
  const middleware = logger({
    skip: (req) => req.url.includes('/skip'),
  });
  
  const req = {
    method: 'GET',
    url: 'http://localhost:3000/skip/test',
    headers: new Headers(),
    getHeader: function(name: string) {
      return this.headers.get(name);
    },
  } as any;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(_name: string, _value: string) {},
    body: 'OK',
  } as any;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await middleware(req, res, next);
  
  // 跳过的请求也应该调用 next
  assert(nextCalled);
});

Deno.test('Logger Middleware - 不同日志格式', async () => {
  const formats: Array<'combined' | 'common' | 'dev' | 'short' | 'tiny'> = [
    'combined',
    'common',
    'dev',
    'short',
    'tiny',
  ];
  
  for (const format of formats) {
    const middleware = logger({ format });
    
    const req = {
      method: 'GET',
      url: 'http://localhost:3000/test',
      headers: new Headers(),
      getHeader: function(name: string) {
        return this.headers.get(name);
      },
    } as any;
    
    const res = {
      status: 200,
      headers: new Headers(),
      setHeader: function(_name: string, _value: string) {},
      body: 'OK',
    } as any;
    
    let nextCalled = false;
    const next = async () => {
      nextCalled = true;
    };
    
    await middleware(req, res, next);
    
    // 所有格式都应该正常工作
    assert(nextCalled);
  }
});

