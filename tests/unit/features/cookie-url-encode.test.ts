/**
 * Cookie URL 编码测试
 * 测试 sessionId 在 URL 编码后是否会丢失
 */

import { assertEquals, assert } from '@std/assert';

Deno.test('测试 URL 编码对 sessionId.signature 的影响', () => {
  const sessionId = 'b513366d51c798ee0810617101dbfbceaae59ed4e0c25816e6d5306101e0099a';
  const signature = '20B9HjJfiyG6gaP2gtRcabsTIKCvVXmYhjR3nte9n5Y';
  const signedValue = `${sessionId}.${signature}`;

  console.log('原始值:', signedValue);
  console.log('SessionId 部分:', sessionId);
  console.log('签名部分:', signature);

  // URL 编码
  const encoded = encodeURIComponent(signedValue);
  console.log('编码后:', encoded);

  // URL 解码
  const decoded = decodeURIComponent(encoded);
  console.log('解码后:', decoded);

  // 验证
  assertEquals(decoded, signedValue, '编码解码后应该保持一致');

  // 验证 split 后是否正确
  const [decodedSessionId, decodedSignature] = decoded.split('.');
  assertEquals(decodedSessionId, sessionId, 'SessionId 应该匹配');
  assertEquals(decodedSignature, signature, '签名应该匹配');

  console.log('✅ 测试通过：URL 编码不会导致 sessionId 丢失');
});

Deno.test('测试问题 Cookie 值', () => {
  // 模拟图片中的问题 Cookie 值
  const problemValue = '.20B9HjJfiyG6gaP2gtRcabsTIKCvVXmYhjR3nte9n5Y';
  console.log('问题 Cookie 值:', problemValue);

  // 尝试 split
  const parts = problemValue.split('.');
  console.log('split 结果:', parts);
  console.log('parts[0]:', parts[0]);
  console.log('parts[1]:', parts[1]);

  if (parts[0] === '') {
    console.log('❌ SessionId 部分为空！');
    console.log('这说明 Cookie 值在设置时 sessionId 部分就丢失了');
  }
});

Deno.test('测试 encodeURIComponent 对包含 . 的字符串的影响', () => {
  const testCases = [
    'sessionId.signature',
    'b513366d51c798ee0810617101dbfbceaae59ed4e0c25816e6d5306101e0099a.20B9HjJfiyG6gaP2gtRcabsTIKCvVXmYhjR3nte9n5Y',
    'test.value.with.dots',
  ];

  for (const testCase of testCases) {
    const encoded = encodeURIComponent(testCase);
    const decoded = decodeURIComponent(encoded);

    console.log(`\n测试: ${testCase}`);
    console.log(`编码: ${encoded}`);
    console.log(`解码: ${decoded}`);

    assertEquals(decoded, testCase, '编码解码应该保持一致');

    // 验证 split 后是否正确
    const originalParts = testCase.split('.');
    const decodedParts = decoded.split('.');
    assertEquals(decodedParts.length, originalParts.length, '分割后的部分数量应该一致');
    for (let i = 0; i < originalParts.length; i++) {
      assertEquals(decodedParts[i], originalParts[i], `第 ${i} 部分应该匹配`);
    }
  }

  console.log('\n✅ 测试通过：encodeURIComponent 不会导致 . 分隔的值丢失');
});
