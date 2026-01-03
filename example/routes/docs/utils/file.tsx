/**
 * 文件工具函数文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "文件工具 - DWeb 框架文档",
  description:
    "DWeb 框架的文件处理工具函数，提供文件读取、保存、类型判断等功能",
};

export default function FilePage() {
  const quickStartCode =
    `import { readFile, saveFile, getFileExtension, isImageFile } from "@dreamer/dweb/utils";

// 读取文件
const file = input.files[0];
const text = await readFile(file);

// 保存文件到本地
const blob = await fetch('/api/file').then(r => r.blob());
saveFile(blob, 'document.pdf');

// 获取文件扩展名
const ext = getFileExtension('image.jpg'); // 'jpg'

// 判断文件类型
if (isImageFile(file)) {
  // 处理图片
}`;

  const readFileCode =
    `import { readFile, readFileAsDataUrl, readFileAsArrayBuffer } from "@dreamer/dweb/utils";

// 读取文件为文本
const file = input.files[0];
const text = await readFile(file);

// 读取文件为 Data URL
const dataUrl = await readFileAsDataUrl(file);
img.src = dataUrl; // 可以直接用作图片源

// 读取文件为 ArrayBuffer
const buffer = await readFileAsArrayBuffer(file);`;

  const saveFileCode = `import { saveFile } from "@dreamer/dweb/utils";

// 从 Blob 保存
const blob = new Blob(['Hello World'], { type: 'text/plain' });
saveFile(blob, 'hello.txt');

// 从 URL 下载后保存
const response = await fetch('/api/file');
const blob = await response.blob();
saveFile(blob, 'document.pdf');`;

  const fileInfoCode =
    `import { getFileExtension, getFileName, getFileSize } from "@dreamer/dweb/utils";

getFileExtension('document.pdf'); // 'pdf'
getFileExtension('image.JPG'); // 'jpg'
getFileExtension('file'); // ''

getFileName('document.pdf'); // 'document'
getFileName('path/to/image.jpg'); // 'image'

const file = input.files[0];
const size = getFileSize(file);
console.log(\`文件大小: \${size} 字节\`);`;

  const fileTypeCode =
    `import { isImageFile, isVideoFile, isAudioFile } from "@dreamer/dweb/utils";

const file = input.files[0];

// 判断是否为图片
if (isImageFile(file)) {
  // 处理图片
}

// 判断是否为视频
if (isVideoFile(file)) {
  // 处理视频
}

// 判断是否为音频
if (isAudioFile(file)) {
  // 处理音频
}

// 也可以使用文件名判断
if (isImageFile('image.jpg')) {
  // 处理图片
}`;

  const compressImageCode =
    `import { compressImage } from "@dreamer/dweb/utils";

const file = input.files[0];
const compressed = await compressImage(file, {
  maxWidth: 1920,    // 最大宽度
  maxHeight: 1080,   // 最大高度
  quality: 0.8,      // 压缩质量 0-1
  mimeType: 'image/jpeg', // 输出格式
});

// 上传压缩后的图片
await uploadFile(compressed);`;

  const createFileCode = `import { createFile } from "@dreamer/dweb/utils";

// 从字符串创建
const file = createFile('Hello World', 'hello.txt', 'text/plain');

// 从 ArrayBuffer 创建
const buffer = new ArrayBuffer(8);
const file2 = createFile(buffer, 'data.bin');`;

  const mimeTypeCode = `import { getMimeType } from "@dreamer/dweb/utils";

getMimeType('image.jpg'); // 'image/jpeg'
getMimeType('document.pdf'); // 'application/pdf'
getMimeType('video.mp4'); // 'video/mp4'
getMimeType('unknown.xyz'); // 'application/octet-stream'`;

  const exampleCode = `import {
  readFileAsDataUrl,
  compressImage,
  isImageFile,
  getFileExtension,
  saveFile,
} from "@dreamer/dweb/utils";

// 处理文件上传
const handleFileUpload = async (file: File) => {
  // 检查文件类型
  if (!isImageFile(file)) {
    alert('请上传图片文件');
    return;
  }

  // 检查文件大小
  if (file.size > 5 * 1024 * 1024) {
    // 大于 5MB，进行压缩
    const compressed = await compressImage(file, {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.8,
    });
    
    // 上传压缩后的图片
    await uploadFile(compressed);
  } else {
    // 直接上传
    await uploadFile(file);
  }
};

// 预览图片
const previewImage = async (file: File) => {
  const dataUrl = await readFileAsDataUrl(file);
  imgElement.src = dataUrl;
};

// 保存文件
const saveReport = async () => {
  const response = await fetch('/api/report');
  const blob = await response.blob();
  saveFile(blob, 'report.pdf');
};`;

  const apiCode = `// 文件读取
- readFile(file) - 读取文件为文本
- readFileAsDataUrl(file) - 读取文件为 Data URL
- readFileAsArrayBuffer(file) - 读取文件为 ArrayBuffer

// 文件保存
- saveFile(blob, filename) - 保存文件到本地

// 文件信息
- getFileExtension(filename) - 获取文件扩展名
- getFileName(filename) - 获取文件名（不含扩展名）
- getFileSize(file) - 获取文件大小

// 文件类型判断
- isImageFile(file) - 判断是否为图片文件
- isVideoFile(file) - 判断是否为视频文件
- isAudioFile(file) - 判断是否为音频文件

// 图片压缩
- compressImage(file, options?) - 压缩图片

// 文件创建
- createFile(data, filename, mimeType?) - 创建文件对象

// MIME 类型
- getMimeType(filename) - 获取 MIME 类型`;

  const content = {
    title: "文件工具",
    description:
      "提供文件处理相关工具函数，包括文件读取、保存、类型判断等功能。",
    sections: [
      {
        title: "环境兼容性",
        blocks: [
          {
            type: "alert",
            variant: "warning",
            title: "客户端专用",
            content:
              "所有文件工具函数仅在浏览器环境可用，依赖 File API 和 Blob API。在服务端环境调用会抛出异常。",
          },
        ],
      },
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
      {
        title: "文件读取",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "读取文件为文本",
            blocks: [
              {
                type: "text",
                content: "将文件读取为文本字符串。",
              },
              {
                type: "code",
                code: readFileCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "文件保存",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "保存文件到本地",
            blocks: [
              {
                type: "text",
                content: "在浏览器中将 Blob 或字符串保存为文件。",
              },
              {
                type: "code",
                code: saveFileCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "文件信息",
        blocks: [
          {
            type: "code",
            code: fileInfoCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "文件类型判断",
        blocks: [
          {
            type: "code",
            code: fileTypeCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "图片压缩",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "压缩图片",
            blocks: [
              {
                type: "text",
                content:
                  "在浏览器中压缩图片文件，支持设置最大宽度、最大高度和质量。",
              },
              {
                type: "code",
                code: compressImageCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "文件创建",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "创建文件对象",
            blocks: [
              {
                type: "text",
                content: "从数据创建 File 或 Blob 对象。",
              },
              {
                type: "code",
                code: createFileCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "MIME 类型",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "获取 MIME 类型",
            blocks: [
              {
                type: "text",
                content: "根据文件扩展名获取对应的 MIME 类型。",
              },
              {
                type: "code",
                code: mimeTypeCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "完整示例",
        blocks: [
          {
            type: "code",
            code: exampleCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "API 参考",
        blocks: [
          {
            type: "code",
            code: apiCode,
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
