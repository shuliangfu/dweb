# 文件工具

提供文件处理相关工具函数。

**环境兼容性：** **客户端专用**（所有函数仅在浏览器环境可用，依赖 File API 和 Blob API）

## 快速开始

```typescript
import { readFile, saveFile, getFileExtension, isImageFile } from "@dreamer/dweb/utils/file";

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
}
```

## 文件读取

### 读取文件为文本

将文件读取为文本字符串。

```typescript
import { readFile } from "@dreamer/dweb/utils/file";

const file = input.files[0];
const text = await readFile(file);
console.log(text);
```

### 读取文件为 Data URL

将文件读取为 Data URL 字符串（base64 编码），可直接用作图片源。

```typescript
import { readFileAsDataUrl } from "@dreamer/dweb/utils/file";

const file = input.files[0];
const dataUrl = await readFileAsDataUrl(file);
img.src = dataUrl; // 可以直接用作图片源
```

### 读取文件为 ArrayBuffer

将文件读取为 ArrayBuffer 对象，用于处理二进制数据。

```typescript
import { readFileAsArrayBuffer } from "@dreamer/dweb/utils/file";

const file = input.files[0];
const buffer = await readFileAsArrayBuffer(file);
// 可以用于处理二进制数据
```

## 文件保存

### 保存文件到本地

在浏览器中将 Blob 或字符串保存为文件。

```typescript
import { saveFile } from "@dreamer/dweb/utils/file";

// 从 Blob 保存
const blob = new Blob(['Hello World'], { type: 'text/plain' });
saveFile(blob, 'hello.txt');

// 从 URL 下载后保存
const response = await fetch('/api/file');
const blob = await response.blob();
saveFile(blob, 'document.pdf');
```

## 文件信息

### 获取文件扩展名

从文件名中提取扩展名。

```typescript
import { getFileExtension } from "@dreamer/dweb/utils/file";

getFileExtension('document.pdf'); // 'pdf'
getFileExtension('image.JPG'); // 'jpg'
getFileExtension('file'); // ''
```

### 获取文件名

从完整文件名中提取不含扩展名的文件名。

```typescript
import { getFileName } from "@dreamer/dweb/utils/file";

getFileName('document.pdf'); // 'document'
getFileName('path/to/image.jpg'); // 'image'
getFileName('file'); // 'file'
```

### 获取文件大小

获取文件对象的大小（字节）。

```typescript
import { getFileSize } from "@dreamer/dweb/utils/file";

const file = input.files[0];
const size = getFileSize(file);
console.log(`文件大小: ${size} 字节`);
```

## 文件类型判断

### 判断文件类型

根据文件扩展名判断文件类型。

```typescript
import { isImageFile, isVideoFile, isAudioFile } from "@dreamer/dweb/utils/file";

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
}
```

## 图片压缩

### 压缩图片

在浏览器中压缩图片文件，返回压缩后的 Blob。

```typescript
import { compressImage } from "@dreamer/dweb/utils/file";

const file = input.files[0];
const compressed = await compressImage(file, {
  maxWidth: 1920,    // 最大宽度
  maxHeight: 1080,   // 最大高度
  quality: 0.8,      // 压缩质量 0-1
  mimeType: 'image/jpeg', // 输出格式
});

// 上传压缩后的图片
await uploadFile(compressed);
```

## 文件创建

### 创建文件对象

从数据创建 File 或 Blob 对象。

```typescript
import { createFile } from "@dreamer/dweb/utils/file";

// 从字符串创建
const file = createFile('Hello World', 'hello.txt', 'text/plain');

// 从 ArrayBuffer 创建
const buffer = new ArrayBuffer(8);
const file2 = createFile(buffer, 'data.bin');
```

## MIME 类型

### 获取 MIME 类型

根据文件扩展名获取对应的 MIME 类型。

```typescript
import { getMimeType } from "@dreamer/dweb/utils/file";

getMimeType('image.jpg'); // 'image/jpeg'
getMimeType('document.pdf'); // 'application/pdf'
getMimeType('video.mp4'); // 'video/mp4'
getMimeType('unknown.xyz'); // 'application/octet-stream'
```

## 完整示例

```typescript
import {
  readFileAsDataUrl,
  compressImage,
  isImageFile,
  getFileExtension,
  saveFile,
} from "@dreamer/dweb/utils/file";

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
};
```

## API 参考

### 文件读取
- `readFile(file)` - 读取文件为文本
- `readFileAsDataUrl(file)` - 读取文件为 Data URL
- `readFileAsArrayBuffer(file)` - 读取文件为 ArrayBuffer

### 文件保存
- `saveFile(blob, filename)` - 保存文件到本地

### 文件信息
- `getFileExtension(filename)` - 获取文件扩展名
- `getFileName(filename)` - 获取文件名（不含扩展名）
- `getFileSize(file)` - 获取文件大小

### 文件类型判断
- `isImageFile(file)` - 判断是否为图片文件
- `isVideoFile(file)` - 判断是否为视频文件
- `isAudioFile(file)` - 判断是否为音频文件

### 图片压缩
- `compressImage(file, options?)` - 压缩图片

### 文件创建
- `createFile(data, filename, mimeType?)` - 创建文件对象

### MIME 类型
- `getMimeType(filename)` - 获取 MIME 类型
