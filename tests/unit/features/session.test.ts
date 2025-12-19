/**
 * Session 管理测试
 */

import { assertEquals, assert } from '@std/assert';
import { SessionManager } from '../../../src/features/session.ts';

// 辅助函数：清理 SessionManager 的定时器
function cleanupManager(manager: SessionManager) {
  // 通过反射访问私有属性来清理定时器
  const store = (manager as any).store;
  if (store && store.destroy) {
    store.destroy();
  }
}

Deno.test('SessionManager - 创建 Session', async () => {
  const manager = new SessionManager({
    secret: 'test-secret',
    store: 'memory',
    maxAge: 3600000,
  });
  
  try {
    const session = await manager.create({ userId: '123' });
    
    assert(session !== null);
    assertEquals(session.data.userId, '123');
    assert(session.id.length > 0);
  } finally {
    cleanupManager(manager);
  }
});

Deno.test('SessionManager - 获取 Session', async () => {
  const manager = new SessionManager({
    secret: 'test-secret',
    store: 'memory',
    maxAge: 3600000,
  });
  
  try {
    const session = await manager.create({ userId: '123' });
    const sessionId = session.id;
    
    const retrieved = await manager.get(sessionId);
    
    assert(retrieved !== null);
    assertEquals(retrieved?.data.userId, '123');
  } finally {
    cleanupManager(manager);
  }
});

Deno.test('SessionManager - 更新 Session', async () => {
  const manager = new SessionManager({
    secret: 'test-secret',
    store: 'memory',
    maxAge: 3600000,
  });
  
  const session = await manager.create({ userId: '123' });
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
  
  try {
    const session = await manager.create({ userId: '123' });
    const sessionId = session.id;
    
    await session.destroy();
    
    const retrieved = await manager.get(sessionId);
    assertEquals(retrieved, null);
  } finally {
    cleanupManager(manager);
  }
});

Deno.test('SessionManager - Session 过期', async () => {
  const manager = new SessionManager({
    secret: 'test-secret',
    store: 'memory',
    maxAge: 100, // 100 毫秒
  });
  
  try {
    const session = await manager.create({ userId: '123' });
    const sessionId = session.id;
    
    // 等待过期
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const retrieved = await manager.get(sessionId);
    assertEquals(retrieved, null);
  } finally {
    cleanupManager(manager);
  }
});

Deno.test('SessionManager - 重新生成 Session ID', async () => {
  const manager = new SessionManager({
    secret: 'test-secret',
    store: 'memory',
    maxAge: 3600000,
  });
  
  try {
    const session = await manager.create({ userId: '123' });
    const oldId = session.id;
    
    await session.regenerate();
    const newId = session.id;
    
    assert(oldId !== newId);
    assertEquals(session.data.userId, '123');
    
    // 旧 ID 应该无效
    const oldSession = await manager.get(oldId);
    assertEquals(oldSession, null);
    
    // 新 ID 应该有效
    const newSession = await manager.get(newId);
    assert(newSession !== null);
  } finally {
    cleanupManager(manager);
  }
});

