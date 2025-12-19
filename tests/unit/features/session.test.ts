/**
 * Session 管理测试
 */

import { assertEquals, assert } from '@std/assert';
import { SessionManager } from '../../../src/features/session.ts';

Deno.test('SessionManager - 创建 Session', async () => {
  const manager = new SessionManager({
    secret: 'test-secret',
    store: 'memory',
    maxAge: 3600000,
  });
  
  const session = await manager.createSession({ userId: '123' });
  
  assert(session !== null);
  assertEquals(session.data.userId, '123');
  assert(session.id.length > 0);
});

Deno.test('SessionManager - 获取 Session', async () => {
  const manager = new SessionManager({
    secret: 'test-secret',
    store: 'memory',
    maxAge: 3600000,
  });
  
  const session = await manager.createSession({ userId: '123' });
  const sessionId = session.id;
  
  const retrieved = await manager.getSession(sessionId);
  
  assert(retrieved !== null);
  assertEquals(retrieved?.data.userId, '123');
});

Deno.test('SessionManager - 更新 Session', async () => {
  const manager = new SessionManager({
    secret: 'test-secret',
    store: 'memory',
    maxAge: 3600000,
  });
  
  const session = await manager.createSession({ userId: '123' });
  await session.update({ userId: '456' });
  
  const retrieved = await manager.getSession(session.id);
  assertEquals(retrieved?.data.userId, '456');
});

Deno.test('SessionManager - 删除 Session', async () => {
  const manager = new SessionManager({
    secret: 'test-secret',
    store: 'memory',
    maxAge: 3600000,
  });
  
  const session = await manager.createSession({ userId: '123' });
  const sessionId = session.id;
  
  await session.destroy();
  
  const retrieved = await manager.getSession(sessionId);
  assertEquals(retrieved, null);
});

Deno.test('SessionManager - Session 过期', async () => {
  const manager = new SessionManager({
    secret: 'test-secret',
    store: 'memory',
    maxAge: 100, // 100 毫秒
  });
  
  const session = await manager.createSession({ userId: '123' });
  const sessionId = session.id;
  
  // 等待过期
  await new Promise(resolve => setTimeout(resolve, 150));
  
  const retrieved = await manager.getSession(sessionId);
  assertEquals(retrieved, null);
});

Deno.test('SessionManager - 重新生成 Session ID', async () => {
  const manager = new SessionManager({
    secret: 'test-secret',
    store: 'memory',
    maxAge: 3600000,
  });
  
  const session = await manager.createSession({ userId: '123' });
  const oldId = session.id;
  
  await session.regenerate();
  const newId = session.id;
  
  assert(oldId !== newId);
  assertEquals(session.data.userId, '123');
  
  // 旧 ID 应该无效
  const oldSession = await manager.getSession(oldId);
  assertEquals(oldSession, null);
  
  // 新 ID 应该有效
  const newSession = await manager.getSession(newId);
  assert(newSession !== null);
});

