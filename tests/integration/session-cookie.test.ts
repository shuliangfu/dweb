/**
 * Session Cookie 集成测试
 * 测试 Session 和 Cookie 的完整流程，包括：
 * 1. 创建 session 并设置 Cookie
 * 2. 从 Cookie 中解析 session
 * 3. 处理格式错误的 Cookie
 * 4. 验证 session 复用
 */

import { assertEquals, assert } from '@std/assert';
import { CookieManager } from '../../src/features/cookie.ts';
import { SessionManager } from '../../src/features/session.ts';

Deno.test('Session Cookie 完整流程测试', async () => {
  const secret = 'test-secret-key-for-session';
  const cookieManager = new CookieManager(secret);
  const sessionManager = new SessionManager({
    secret,
    store: 'memory',
    maxAge: 3600,
  });

  try {

  const cookieName = 'dweb.session';
  const cookieOptions = {
    httpOnly: true,
    secure: false,
    maxAge: 3600,
    path: '/',
    sameSite: 'lax' as const,
  };

  // 步骤 1: 创建 session
  const session = await sessionManager.create({ userId: 123 });
  console.log('步骤 1 - 创建 session:', session.id);

  // 步骤 2: 设置 Cookie（模拟服务器设置）
  const signature = await cookieManager.sign(session.id);
  const signedValue = `${session.id}.${signature}`;
  const cookieString = await cookieManager.setAsync(
    cookieName,
    signedValue,
    cookieOptions,
  );
  console.log('步骤 2 - 设置的 Cookie:', cookieString);

  // 步骤 3: 提取 Cookie 值（模拟浏览器存储）
  const cookieValueMatch = cookieString.match(/dweb\.session=([^;]+)/);
  assert(cookieValueMatch, '应该能匹配到 Cookie 值');
  const cookieValue = cookieValueMatch[1];
  console.log('步骤 3 - Cookie 值:', cookieValue);

  // 步骤 4: 模拟浏览器发送请求（构建 Cookie 头）
  const cookieHeader = `${cookieName}=${cookieValue}`;
  console.log('步骤 4 - Cookie 头:', cookieHeader);

  // 步骤 5: 解析 Cookie（模拟服务器解析）
  const parsedCookies = await cookieManager.parseAsync(cookieHeader);
  console.log('步骤 5 - 解析结果:', parsedCookies);

  // 步骤 6: 验证解析结果
  const parsedSessionId = parsedCookies[cookieName];
  assertEquals(parsedSessionId, session.id, '解析的 sessionId 应该匹配');

  // 步骤 7: 从 sessionManager 获取 session
  const retrievedSession = await sessionManager.get(parsedSessionId!);
  assert(retrievedSession, '应该能获取到 session');
  assertEquals(retrievedSession.id, session.id, 'Session ID 应该匹配');
  assertEquals(retrievedSession.get('userId'), 123, 'Session 数据应该匹配');

    console.log('✅ 测试通过：Session Cookie 完整流程正常');
  } finally {
    // 清理：销毁 session manager（清理定时器）
    sessionManager.destroyManager();
  }
});

Deno.test('Session Cookie - 格式错误的 Cookie（只有签名部分）', async () => {
  const secret = 'test-secret-key-for-session';
  const cookieManager = new CookieManager(secret);
  const sessionManager = new SessionManager({
    secret,
    store: 'memory',
    maxAge: 3600,
  });

  try {

  const cookieName = 'dweb.session';

  // 模拟格式错误的 Cookie（只有签名部分，没有 sessionId）
  const wrongSignature = '20B9HjJfiyG6gaP2gtRcabsTIKCvVXmYhjR3nte9n5Y';
  const wrongCookieHeader = `${cookieName}=.${wrongSignature}`;
  console.log('格式错误的 Cookie 头:', wrongCookieHeader);

  // 解析 Cookie
  const parsedCookies = await cookieManager.parseAsync(wrongCookieHeader);
  console.log('解析结果:', parsedCookies);

  // 验证：格式错误的 Cookie 应该被忽略
  assertEquals(
    parsedCookies[cookieName],
    undefined,
    '格式错误的 Cookie 应该被忽略',
  );

    console.log('✅ 测试通过：格式错误的 Cookie 被正确忽略');
  } finally {
    sessionManager.destroyManager();
  }
});

Deno.test('Session Cookie - 多次请求复用同一个 Session', async () => {
  const secret = 'test-secret-key-for-session';
  const cookieManager = new CookieManager(secret);
  const sessionManager = new SessionManager({
    secret,
    store: 'memory',
    maxAge: 3600,
  });

  try {

  const cookieName = 'dweb.session';
  const cookieOptions = {
    httpOnly: true,
    secure: false,
    maxAge: 3600,
    path: '/',
    sameSite: 'lax' as const,
  };

  // 创建 session
  const session = await sessionManager.create({ count: 0 });
  const signature = await cookieManager.sign(session.id);
  const signedValue = `${session.id}.${signature}`;
  const cookieString = await cookieManager.setAsync(
    cookieName,
    signedValue,
    cookieOptions,
  );

  // 提取 Cookie 值
  const cookieValueMatch = cookieString.match(/dweb\.session=([^;]+)/);
  assert(cookieValueMatch);
  const cookieValue = cookieValueMatch[1];

  // 模拟多次请求
  for (let i = 1; i <= 5; i++) {
    const cookieHeader = `${cookieName}=${cookieValue}`;
    const parsedCookies = await cookieManager.parseAsync(cookieHeader);
    const parsedSessionId = parsedCookies[cookieName];

    assert(parsedSessionId, `第 ${i} 次请求应该能解析到 sessionId`);
    assertEquals(
      parsedSessionId,
      session.id,
      `第 ${i} 次请求的 sessionId 应该匹配`,
    );

    const retrievedSession = await sessionManager.get(parsedSessionId);
    assert(retrievedSession, `第 ${i} 次请求应该能获取到 session`);

    // 更新 session 数据（set 方法会自动保存）
    await retrievedSession.set('count', i);

    console.log(`第 ${i} 次请求 - Session ID: ${session.id}, Count: ${i}`);
  }

    // 验证最终数据
    const finalSession = await sessionManager.get(session.id);
    assert(finalSession);
    assertEquals(finalSession.get('count'), 5, '最终 count 应该是 5');

    console.log('✅ 测试通过：多次请求成功复用同一个 Session');
  } finally {
    sessionManager.destroyManager();
  }
});

Deno.test('Session Cookie - 并发请求测试', async () => {
  const secret = 'test-secret-key-for-session';
  const cookieManager = new CookieManager(secret);
  const sessionManager = new SessionManager({
    secret,
    store: 'memory',
    maxAge: 3600,
  });

  try {

  const cookieName = 'dweb.session';
  const cookieOptions = {
    httpOnly: true,
    secure: false,
    maxAge: 3600,
    path: '/',
    sameSite: 'lax' as const,
  };

  // 创建 session
  const session = await sessionManager.create({ requests: [] });
  const signature = await cookieManager.sign(session.id);
  const signedValue = `${session.id}.${signature}`;
  const cookieString = await cookieManager.setAsync(
    cookieName,
    signedValue,
    cookieOptions,
  );

  // 提取 Cookie 值
  const cookieValueMatch = cookieString.match(/dweb\.session=([^;]+)/);
  assert(cookieValueMatch);
  const cookieValue = cookieValueMatch[1];

  // 模拟并发请求（同时发送 10 个请求）
  const requests = Array.from({ length: 10 }, (_, i) => i);
  const results = await Promise.all(
    requests.map(async (requestId) => {
      const cookieHeader = `${cookieName}=${cookieValue}`;
      const parsedCookies = await cookieManager.parseAsync(cookieHeader);
      const parsedSessionId = parsedCookies[cookieName];

      if (!parsedSessionId) {
        return { requestId, success: false, error: '无法解析 sessionId' };
      }

      const retrievedSession = await sessionManager.get(parsedSessionId);
      if (!retrievedSession) {
        return { requestId, success: false, error: '无法获取 session' };
      }

      // 更新 session 数据（set 方法会自动保存）
      const currentRequests = (retrievedSession.get('requests') as number[]) ||
        [];
      currentRequests.push(requestId);
      await retrievedSession.set('requests', currentRequests);

      return {
        requestId,
        success: true,
        sessionId: parsedSessionId,
      };
    }),
  );

  // 验证所有请求都成功
  const failedRequests = results.filter((r) => !r.success);
  assertEquals(failedRequests.length, 0, '所有请求都应该成功');

  // 验证所有请求都使用了同一个 session
  const sessionIds = results
    .filter((r) => r.success)
    .map((r) => (r as { sessionId: string }).sessionId);
  const uniqueSessionIds = new Set(sessionIds);
  assertEquals(
    uniqueSessionIds.size,
    1,
    '所有请求应该使用同一个 session',
  );
  assertEquals(
    Array.from(uniqueSessionIds)[0],
    session.id,
    'Session ID 应该匹配',
  );

    // 验证最终数据
    const finalSession = await sessionManager.get(session.id);
    assert(finalSession);
    const finalRequests = finalSession.get('requests') as number[];
    assertEquals(finalRequests.length, 10, '应该有 10 个请求记录');

    console.log('✅ 测试通过：并发请求成功复用同一个 Session');
  } finally {
    sessionManager.destroyManager();
  }
});

Deno.test('Session Cookie - 格式错误的 Cookie 被删除后创建新 Session', async () => {
  const secret = 'test-secret-key-for-session';
  const cookieManager = new CookieManager(secret);
  const sessionManager = new SessionManager({
    secret,
    store: 'memory',
    maxAge: 3600,
  });

  try {

  const cookieName = 'dweb.session';

  // 步骤 1: 模拟格式错误的 Cookie
  const wrongSignature = '20B9HjJfiyG6gaP2gtRcabsTIKCvVXmYhjR3nte9n5Y';
  const wrongCookieHeader = `${cookieName}=.${wrongSignature}`;
  console.log('步骤 1 - 格式错误的 Cookie:', wrongCookieHeader);

  // 步骤 2: 解析 Cookie（应该失败）
  const parsedCookies1 = await cookieManager.parseAsync(wrongCookieHeader);
  assertEquals(
    parsedCookies1[cookieName],
    undefined,
    '格式错误的 Cookie 应该被忽略',
  );

  // 步骤 3: 创建新的 session（模拟删除错误 Cookie 后创建新 session）
  const newSession = await sessionManager.create({ new: true });
  const signature = await cookieManager.sign(newSession.id);
  const signedValue = `${newSession.id}.${signature}`;
  const cookieString = await cookieManager.setAsync(
    cookieName,
    signedValue,
    {
      httpOnly: true,
      secure: false,
      maxAge: 3600,
      path: '/',
      sameSite: 'lax' as const,
    },
  );
  console.log('步骤 3 - 新 Cookie:', cookieString);

  // 步骤 4: 验证新 Cookie 可以正确解析
  const cookieValueMatch = cookieString.match(/dweb\.session=([^;]+)/);
  assert(cookieValueMatch);
  const cookieValue = cookieValueMatch[1];
  const newCookieHeader = `${cookieName}=${cookieValue}`;
  const parsedCookies2 = await cookieManager.parseAsync(newCookieHeader);
  const parsedSessionId = parsedCookies2[cookieName];

    assertEquals(parsedSessionId, newSession.id, '新 Cookie 应该能正确解析');

    console.log('✅ 测试通过：格式错误的 Cookie 被删除后可以创建新 Session');
  } finally {
    sessionManager.destroyManager();
  }
});
