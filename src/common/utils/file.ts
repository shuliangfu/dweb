/**
 * 文件工具
 * 提供文件处理相关工具函数
 *
 * 环境兼容性：
 * - 客户端：所有函数只能在浏览器环境使用（需要 File/Blob API）
 * - 服务端：在服务端环境调用会抛出异常
 */

import { IS_CLIENT } from "../constants.ts";

/**
 * 读取文件为文本
 * 将文件读取为文本字符串
 *
 * @param file 文件对象（File 或 Blob）
 * @returns Promise，解析为文件文本内容
 *
 * @example
 * ```typescript
 * const file = input.files[0];
 * const text = await readFile(file);
 * console.log(text);
 * ```
 */
export function readFile(file: File | Blob): Promise<string> {
  if (!IS_CLIENT) {
    throw new Error("readFile 只能在客户端环境使用");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      reject(new Error("文件读取失败"));
    };
    reader.readAsText(file);
  });
}

/**
 * 读取文件为 Data URL
 * 将文件读取为 Data URL 字符串（base64 编码）
 *
 * @param file 文件对象（File 或 Blob）
 * @returns Promise，解析为 Data URL 字符串
 *
 * @example
 * ```typescript
 * const file = input.files[0];
 * const dataUrl = await readFileAsDataUrl(file);
 * img.src = dataUrl; // 可以直接用作图片源
 * ```
 */
export function readFileAsDataUrl(file: File | Blob): Promise<string> {
  if (!IS_CLIENT) {
    throw new Error("readFileAsDataUrl 只能在客户端环境使用");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      reject(new Error("文件读取失败"));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * 读取文件为 ArrayBuffer
 * 将文件读取为 ArrayBuffer 对象
 *
 * @param file 文件对象（File 或 Blob）
 * @returns Promise，解析为 ArrayBuffer
 *
 * @example
 * ```typescript
 * const file = input.files[0];
 * const buffer = await readFileAsArrayBuffer(file);
 * // 可以用于处理二进制数据
 * ```
 */
export function readFileAsArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
  if (!IS_CLIENT) {
    throw new Error("readFileAsArrayBuffer 只能在客户端环境使用");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as ArrayBuffer);
    };
    reader.onerror = () => {
      reject(new Error("文件读取失败"));
    };
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 保存文件到本地
 * 在浏览器中将 Blob 或字符串保存为文件
 *
 * @param blob 文件 Blob 对象或数据
 * @param filename 文件名
 *
 * @example
 * ```typescript
 * const blob = new Blob(['Hello World'], { type: 'text/plain' });
 * saveFile(blob, 'hello.txt');
 * ```
 */
export function saveFile(blob: Blob | string, filename: string): void {
  if (!IS_CLIENT) {
    throw new Error("saveFile 只能在客户端环境使用");
  }
  const data = typeof blob === "string" ? new Blob([blob]) : blob;
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 获取文件扩展名
 * 从文件名中提取扩展名
 *
 * @param filename 文件名或文件路径
 * @returns 文件扩展名（小写，不含点号），如果不存在则返回空字符串
 *
 * @example
 * ```typescript
 * getFileExtension('document.pdf'); // 'pdf'
 * getFileExtension('image.JPG'); // 'jpg'
 * getFileExtension('file'); // ''
 * ```
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return "";
  }
  return filename.substring(lastDot + 1).toLowerCase();
}

/**
 * 获取文件名（不含扩展名）
 * 从文件路径中提取文件名，去除扩展名
 *
 * @param filename 文件名或文件路径
 * @returns 文件名（不含扩展名）
 *
 * @example
 * ```typescript
 * getFileName('document.pdf'); // 'document'
 * getFileName('path/to/image.jpg'); // 'image'
 * ```
 */
export function getFileName(filename: string): string {
  const lastSlash = filename.lastIndexOf("/");
  const name = lastSlash >= 0 ? filename.substring(lastSlash + 1) : filename;
  const lastDot = name.lastIndexOf(".");
  if (lastDot === -1) {
    return name;
  }
  return name.substring(0, lastDot);
}

/**
 * 获取文件大小
 * 从 File 或 Blob 对象获取文件大小
 *
 * @param file 文件对象（File 或 Blob）
 * @returns 文件大小（字节）
 *
 * @example
 * ```typescript
 * const file = input.files[0];
 * const size = getFileSize(file);
 * console.log(`文件大小: ${size} 字节`);
 * ```
 */
export function getFileSize(file: File | Blob): number {
  return file.size;
}

/**
 * 判断是否为图片文件
 * 根据文件对象或文件名判断是否为图片文件
 *
 * @param file 文件对象（File 或 Blob）或文件名
 * @returns 如果是图片文件则返回 true
 *
 * @example
 * ```typescript
 * const file = input.files[0];
 * if (isImageFile(file)) {
 *   // 处理图片
 * }
 *
 * // 也可以使用文件名判断
 * if (isImageFile('image.jpg')) {
 *   // 处理图片
 * }
 * ```
 */
export function isImageFile(file: File | Blob | string): boolean {
  const imageExtensions = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "bmp",
    "webp",
    "svg",
    "ico",
    "tiff",
    "tif",
  ];
  if (typeof file === "string") {
    const ext = getFileExtension(file);
    return imageExtensions.includes(ext);
  }
  // 如果是 File 对象，优先使用 type 判断
  if (file instanceof File && file.type) {
    return file.type.startsWith("image/");
  }
  // 否则使用文件名判断
  if (file instanceof File && file.name) {
    const ext = getFileExtension(file.name);
    return imageExtensions.includes(ext);
  }
  return false;
}

/**
 * 判断是否为视频文件
 * 根据文件对象或文件名判断是否为视频文件
 *
 * @param file 文件对象（File 或 Blob）或文件名
 * @returns 如果是视频文件则返回 true
 *
 * @example
 * ```typescript
 * const file = input.files[0];
 * if (isVideoFile(file)) {
 *   // 处理视频
 * }
 * ```
 */
export function isVideoFile(file: File | Blob | string): boolean {
  const videoExtensions = [
    "mp4",
    "avi",
    "mov",
    "wmv",
    "flv",
    "webm",
    "mkv",
    "m4v",
    "3gp",
  ];
  if (typeof file === "string") {
    const ext = getFileExtension(file);
    return videoExtensions.includes(ext);
  }
  if (file instanceof File && file.type) {
    return file.type.startsWith("video/");
  }
  if (file instanceof File && file.name) {
    const ext = getFileExtension(file.name);
    return videoExtensions.includes(ext);
  }
  return false;
}

/**
 * 判断是否为音频文件
 * 根据文件对象或文件名判断是否为音频文件
 *
 * @param file 文件对象（File 或 Blob）或文件名
 * @returns 如果是音频文件则返回 true
 *
 * @example
 * ```typescript
 * const file = input.files[0];
 * if (isAudioFile(file)) {
 *   // 处理音频
 * }
 * ```
 */
export function isAudioFile(file: File | Blob | string): boolean {
  const audioExtensions = [
    "mp3",
    "wav",
    "ogg",
    "aac",
    "flac",
    "m4a",
    "wma",
    "opus",
  ];
  if (typeof file === "string") {
    const ext = getFileExtension(file);
    return audioExtensions.includes(ext);
  }
  if (file instanceof File && file.type) {
    return file.type.startsWith("audio/");
  }
  if (file instanceof File && file.name) {
    const ext = getFileExtension(file.name);
    return audioExtensions.includes(ext);
  }
  return false;
}

/**
 * 压缩图片
 * 压缩图片文件，支持设置最大宽度、最大高度和质量
 *
 * @param file 图片文件对象
 * @param options 压缩选项
 * @param options.maxWidth 最大宽度（像素），默认 1920
 * @param options.maxHeight 最大高度（像素），默认 1080
 * @param options.quality 图片质量（0-1），默认 0.8
 * @param options.mimeType 输出格式（MIME 类型），默认 'image/jpeg'
 * @returns Promise，解析为压缩后的 Blob 对象
 *
 * @example
 * ```typescript
 * const file = input.files[0];
 * const compressed = await compressImage(file, {
 *   maxWidth: 1920,
 *   maxHeight: 1080,
 *   quality: 0.8,
 *   mimeType: 'image/jpeg',
 * });
 * ```
 */
export async function compressImage(
  file: File | Blob,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    mimeType?: string;
  } = {},
): Promise<Blob> {
  if (!IS_CLIENT) {
    throw new Error("compressImage 只能在客户端环境使用");
  }
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    mimeType = "image/jpeg",
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // 计算新尺寸
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        // 创建 canvas 并绘制
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("无法创建 canvas 上下文"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // 转换为 Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("图片压缩失败"));
            }
          },
          mimeType,
          quality,
        );
      };
      img.onerror = () => {
        reject(new Error("图片加载失败"));
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error("文件读取失败"));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * 创建文件对象
 * 从字符串或 ArrayBuffer 创建 File 对象
 *
 * @param data 文件数据（字符串或 ArrayBuffer）
 * @param filename 文件名
 * @param mimeType MIME 类型，默认根据文件扩展名自动判断
 * @returns File 对象
 *
 * @example
 * ```typescript
 * // 从字符串创建
 * const file = createFile('Hello World', 'hello.txt', 'text/plain');
 *
 * // 从 ArrayBuffer 创建
 * const buffer = new ArrayBuffer(8);
 * const file2 = createFile(buffer, 'data.bin');
 * ```
 */
export function createFile(
  data: string | ArrayBuffer,
  filename: string,
  mimeType?: string,
): File {
  if (!IS_CLIENT) {
    throw new Error("createFile 只能在客户端环境使用");
  }
  const type = mimeType || getMimeType(filename);
  const blob = new Blob([data], { type });
  return new File([blob], filename, { type });
}

/**
 * 获取 MIME 类型
 * 根据文件扩展名获取对应的 MIME 类型
 *
 * @param filename 文件名或文件路径
 * @returns MIME 类型字符串
 *
 * @example
 * ```typescript
 * getMimeType('image.jpg'); // 'image/jpeg'
 * getMimeType('document.pdf'); // 'application/pdf'
 * getMimeType('video.mp4'); // 'video/mp4'
 * getMimeType('unknown.xyz'); // 'application/octet-stream'
 * ```
 */
export function getMimeType(filename: string): string {
  const ext = getFileExtension(filename);
  const mimeTypes: Record<string, string> = {
    // 图片
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    bmp: "image/bmp",
    webp: "image/webp",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    tiff: "image/tiff",
    tif: "image/tiff",
    // 视频
    mp4: "video/mp4",
    avi: "video/x-msvideo",
    mov: "video/quicktime",
    wmv: "video/x-ms-wmv",
    flv: "video/x-flv",
    webm: "video/webm",
    mkv: "video/x-matroska",
    // 音频
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    aac: "audio/aac",
    flac: "audio/flac",
    m4a: "audio/mp4",
    // 文档
    pdf: "application/pdf",
    doc: "application/msword",
    docx:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    // 文本
    txt: "text/plain",
    html: "text/html",
    css: "text/css",
    js: "text/javascript",
    json: "application/json",
    xml: "application/xml",
    // 压缩
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    "7z": "application/x-7z-compressed",
    gz: "application/gzip",
    tar: "application/x-tar",
  };
  return mimeTypes[ext] || "application/octet-stream";
}
