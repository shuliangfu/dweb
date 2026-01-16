/**
 * Cookie 调试测试
 * 用于调试签名 Cookie 解析问题
 */

import { assertEquals, assert } from '@std/assert';
import { CookieManager } from '../../../src/features/cookie.ts';

Deno.test('CookieManager - 签名和解析 Cookie（完整流程）', async () => {
  const secret = 'test-secret-key-12345';
  const manager = new CookieManager(secret);
  const sessionId = '6d5bf239e7ac06e77725abcdef1234567890';
  
  // 1. 设置签名 Cookie
  const cookieString = await manager.setAsync('dweb.session', sessionId, {
    httpOnly: true,
    secure: false,
    maxAge: 3600,
    path: '/',
    sameSite: 'lax',
  });
  
  console.log('生成的 Cookie 字符串:', cookieString);
  
  // 2. 提取 Cookie 值（模拟浏览器发送的格式）
  const cookieValueMatch = cookieString.match(/dweb\.session=([^;]+)/);
  assert(cookieValueMatch, '应该能匹配到 Cookie 值');
  const cookieValue = cookieValueMatch[1];
  console.log('提取的 Cookie 值:', cookieValue);
  
  // 3. 验证 Cookie 值格式（应该是 sessionId.signature）
  assert(cookieValue.includes('.'), 'Cookie 值应该包含签名（用 . 分隔）');
  const [actualSessionId, signature] = cookieValue.split('.');
  assertEquals(actualSessionId, sessionId, 'SessionId 应该匹配');
  assert(signature.length > 0, '签名应该存在');
  console.log('SessionId:', actualSessionId);
  console.log('Signature:', signature);
  
  // 4. 模拟浏览器发送的 Cookie 头
  const cookieHeader = `dweb.session=${cookieValue}`;
  console.log('模拟的 Cookie 头:', cookieHeader);
  
  // 5. 解析 Cookie
  const parsedCookies = await manager.parseAsync(cookieHeader);
  console.log('解析后的 Cookies:', parsedCookies);
  
  // 6. 验证解析结果
  assertEquals(parsedCookies['dweb.session'], sessionId, '解析后的 SessionId 应该匹配');
});

Deno.test('CookieManager - 解析问题 Cookie（以 . 开头的值）', async () => {
  const secret = 'test-secret-key-12345';
  const manager = new CookieManager(secret);
  
  // 模拟日志中的问题 Cookie：dweb.session=.2OB9HjJfiyG6gaP2gtRcabsT
  const problemCookieHeader = 'lang=zh-TW; dweb.session=.2OB9HjJfiyG6gaP2gtRcabsT';
  console.log('问题 Cookie 头:', problemCookieHeader);
  
  // 解析 Cookie
  const parsedCookies = await manager.parseAsync(problemCookieHeader);
  console.log('解析后的 Cookies:', parsedCookies);
  
  // 检查解析结果
  if (parsedCookies['dweb.session']) {
    console.log('成功解析到 SessionId:', parsedCookies['dweb.session']);
  } else {
    console.log('❌ 未能解析到 SessionId');
    console.log('可能的原因：');
    console.log('1. Cookie 值格式错误（以 . 开头，缺少 sessionId 部分）');
    console.log('2. 签名验证失败');
    console.log('3. split(".") 时，actualValue 为空字符串');
  }
});

Deno.test('CookieManager - 测试 split(".") 边界情况', async () => {
  // 测试当 Cookie 值以 . 开头时，split(".") 的行为
  const testCases = [
    { value: '.2OB9HjJfiyG6gaP2gtRcabsT', description: '以 . 开头的值' },
    { value: 'sessionId.signature', description: '正常格式' },
    { value: 'sessionId.', description: '只有 sessionId，没有签名' },
    { value: '.signature', description: '只有签名，没有 sessionId' },
    { value: 'sessionId.signature.extra', description: '多个 .' },
  ];
  
  for (const testCase of testCases) {
    console.log(`\n测试: ${testCase.description}`);
    console.log(`值: ${testCase.value}`);
    const parts = testCase.value.split('.');
    console.log(`split(".") 结果:`, parts);
    console.log(`parts[0]: "${parts[0]}"`);
    console.log(`parts[1]: "${parts[1] || 'undefined'}"`);
    
    if (parts[0] === '') {
      console.log('⚠️  警告: parts[0] 是空字符串，这会导致签名验证失败');
    }
  }
});

Deno.test('CookieManager - 模拟实际场景：设置和解析', async () => {
  const secret = 'my-secret-key-for-testing';
  const manager = new CookieManager(secret);
  const sessionId = '6d5bf239e7ac06e77725abcdef1234567890';
  
  // 步骤 1: 使用 setAsync 设置 Cookie（模拟服务器设置）
  const cookieString = await manager.setAsync('dweb.session', sessionId, {
    httpOnly: true,
    secure: false,
    maxAge: 3600,
    path: '/',
    sameSite: 'lax',
  });
  
  console.log('步骤 1 - 服务器设置的 Cookie:');
  console.log(cookieString);
  
  // 步骤 2: 提取 Cookie 值（模拟浏览器存储）
  const cookieValueMatch = cookieString.match(/dweb\.session=([^;]+)/);
  if (!cookieValueMatch) {
    throw new Error('无法提取 Cookie 值');
  }
  const cookieValue = cookieValueMatch[1];
  console.log('\n步骤 2 - 浏览器存储的 Cookie 值:');
  console.log(cookieValue);
  
  // 步骤 3: 构建 Cookie 头（模拟浏览器发送）
  const cookieHeader = `dweb.session=${cookieValue}`;
  console.log('\n步骤 3 - 浏览器发送的 Cookie 头:');
  console.log(cookieHeader);
  
  // 步骤 4: 解析 Cookie（模拟服务器解析）
  const parsedCookies = await manager.parseAsync(cookieHeader);
  console.log('\n步骤 4 - 服务器解析的结果:');
  console.log(parsedCookies);
  
  // 步骤 5: 验证
  assertEquals(parsedCookies['dweb.session'], sessionId, 'SessionId 应该匹配');
  console.log('\n✅ 测试通过：Cookie 设置和解析成功');
});

Deno.test('CookieManager - 测试 URL 编码对签名的影响', async () => {
  const secret = 'test-secret';
  const manager = new CookieManager(secret);
  const sessionId = '6d5bf239e7ac06e77725abcdef1234567890';
  
  // 设置 Cookie（会自动 URL 编码）
  const cookieString = await manager.setAsync('dweb.session', sessionId);
  console.log('设置的 Cookie:', cookieString);
  
  // 提取值（注意：值已经被 URL 编码）
  const match = cookieString.match(/dweb\.session=([^;]+)/);
  assert(match);
  const encodedValue = match[1];
  console.log('URL 编码后的值:', encodedValue);
  
  // 构建 Cookie 头（模拟浏览器发送，值已经是编码后的）
  const cookieHeader = `dweb.session=${encodedValue}`;
  console.log('Cookie 头:', cookieHeader);
  
  // 解析
  const parsed = await manager.parseAsync(cookieHeader);
  console.log('解析结果:', parsed);
  
  // 验证
  assertEquals(parsed['dweb.session'], sessionId);
});
