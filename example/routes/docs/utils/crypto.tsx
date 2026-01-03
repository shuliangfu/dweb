/**
 * 加密工具函数文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "加密函数 - DWeb 框架文档",
  description: "DWeb 框架的加密工具函数，提供常用的加密、哈希、签名等功能",
};

export default function CryptoPage() {
  const quickStartCode = `import {
  randomString,
  generateUUID,
  sha256,
  base64Encode,
  base64Decode,
  base64UrlEncode,
  base64UrlDecode,
  simpleEncrypt,
  simpleDecrypt,
  sign,
  verifySignature,
} from "@dreamer/dweb/utils";

// 生成随机字符串
randomString(32); // "aB3dEf9gHiJkLmNoPqRsTuVwXyZ0123456789"

// 生成UUID
generateUUID(); // "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"

// SHA-256 哈希
const hash = await sha256("hello world");

// Base64 编码/解码
const encoded = base64Encode("Hello World"); // "SGVsbG8gV29ybGQ="
const decoded = base64Decode(encoded); // "Hello World"

// URL 安全 Base64
const urlEncoded = base64UrlEncode("Hello World");
const urlDecoded = base64UrlDecode(urlEncoded);

// 简单加密/解密（XOR，仅用于简单场景）
const encrypted = simpleEncrypt("data", "key");
const decrypted = simpleDecrypt(encrypted, "key");

// 生成签名（HMAC-SHA256）
const signature = await sign("data", "secret");

// 验证签名
const isValid = await verifySignature("data", signature, "secret");`;

  const content = {
    title: "加密函数",
    description:
      "提供常用的加密、哈希、签名等功能。所有函数在服务端和客户端都可用，部分函数依赖 Web Crypto API。",
    sections: [
      {
        title: "快速开始",
        blocks: [
          {
            type: "code",
            code: quickStartCode,
            language: "typescript",
          },
        ],
      },
    ],
  };

  return (
    <DocRenderer
      content={content as Parameters<typeof DocRenderer>[0]["content"]}
    />
  );
}
