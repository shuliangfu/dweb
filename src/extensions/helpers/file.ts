/**
 * 文件工具
 * 提供文件处理相关工具函数
 *
 * 环境兼容性：
 * - 客户端：大部分函数只能在浏览器环境使用（需要 File/Blob API）
 * - 服务端：部分函数在服务端环境会返回默认值或抛出错误
 */

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
 *
 * // 或者从 URL 下载后保存
 * const response = await fetch('/api/file');
 * const blob = await response.blob();
 * saveFile(blob, 'document.pdf');
 * ```
 */
export function saveFile(blob: Blob | string, filename: string): void {
  if (typeof globalThis === "undefined" || !("document" in globalThis)) {
    throw new Error("downloadFile 只能在浏览器环境使用");
  }

  let downloadBlob: Blob;
  if (typeof blob === "string") {
    // 如果是字符串，创建 Blob
    downloadBlob = new Blob([blob], { type: "text/plain" });
  } else {
    downloadBlob = blob;
  }

  // 创建下载链接
  const downloadUrl = URL.createObjectURL(downloadBlob);
  const doc = (globalThis as unknown as {
    document: {
      createElement: (
        tag: string,
      ) => { href: string; download: string; click: () => void };
      body: {
        appendChild: (el: unknown) => void;
        removeChild: (el: unknown) => void;
      };
    };
  }).document;
  const link = doc.createElement("a");
  link.href = downloadUrl;
  link.download = filename;

  // 触发下载
  const body = doc.body;
  body.appendChild(link);
  link.click();
  body.removeChild(link);

  // 释放 URL 对象
  URL.revokeObjectURL(downloadUrl);
}

/**
 * 获取文件扩展名
 * 从文件名中提取扩展名（不含点号）
 *
 * @param filename 文件名
 * @returns 文件扩展名（小写），如果没有扩展名返回空字符串
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
  return filename.slice(lastDot + 1).toLowerCase();
}

/**
 * 获取文件名（不含扩展名）
 * 从完整文件名中提取不含扩展名的文件名
 *
 * @param filename 完整文件名
 * @returns 不含扩展名的文件名
 *
 * @example
 * ```typescript
 * getFileName('document.pdf'); // 'document'
 * getFileName('path/to/image.jpg'); // 'image'
 * getFileName('file'); // 'file'
 * ```
 */
export function getFileName(filename: string): string {
  // 处理路径，只取文件名部分
  const name = filename.split("/").pop() || filename;
  const lastDot = name.lastIndexOf(".");
  if (lastDot === -1) {
    return name;
  }
  return name.slice(0, lastDot);
}

/**
 * 获取文件大小
 * 获取文件对象的大小（字节）
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
 * 根据文件扩展名判断是否为图片文件
 *
 * @param file 文件对象或文件名
 * @returns 是否为图片文件
 *
 * @example
 * ```typescript
 * const file = input.files[0];
 * if (isImageFile(file)) {
 *   // 处理图片
 * }
 *
 * // 或者使用文件名
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
  ];
  const filename = typeof file === "string"
    ? file
    : file instanceof File
    ? file.name
    : "";
  const ext = getFileExtension(filename);
  return imageExtensions.includes(ext);
}

/**
 * 判断是否为视频文件
 * 根据文件扩展名判断是否为视频文件
 *
 * @param file 文件对象或文件名
 * @returns 是否为视频文件
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
  ];
  const filename = typeof file === "string"
    ? file
    : file instanceof File
    ? file.name
    : "";
  const ext = getFileExtension(filename);
  return videoExtensions.includes(ext);
}

/**
 * 判断是否为音频文件
 * 根据文件扩展名判断是否为音频文件
 *
 * @param file 文件对象或文件名
 * @returns 是否为音频文件
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
  ];
  const filename = typeof file === "string"
    ? file
    : file instanceof File
    ? file.name
    : "";
  const ext = getFileExtension(filename);
  return audioExtensions.includes(ext);
}

/**
 * 压缩图片
 * 在浏览器中压缩图片文件，返回压缩后的 Blob
 *
 * @param file 图片文件对象
 * @param options 压缩选项
 * @returns Promise，解析为压缩后的 Blob
 *
 * @example
 * ```typescript
 * const file = input.files[0];
 * const compressed = await compressImage(file, {
 *   maxWidth: 1920,
 *   maxHeight: 1080,
 *   quality: 0.8
 * });
 * // 上传压缩后的图片
 * ```
 */
export function compressImage(
  file: File | Blob,
  options: {
    maxWidth?: number; // 最大宽度（默认 1920）
    maxHeight?: number; // 最大高度（默认 1080）
    quality?: number; // 压缩质量 0-1（默认 0.8）
    mimeType?: string; // 输出 MIME 类型（默认 'image/jpeg'）
  } = {},
): Promise<Blob> {
  if (typeof globalThis === "undefined" || !("Image" in globalThis)) {
    throw new Error("compressImage 只能在浏览器环境使用");
  }

  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    mimeType = "image/jpeg",
  } = options;

  return new Promise((resolve, reject) => {
    // 读取文件为 Data URL
    readFileAsDataUrl(file)
      .then((dataUrl) => {
        // 创建图片对象
        const ImageConstructor = (globalThis as unknown as {
          Image: new () => {
            src: string;
            width: number;
            height: number;
            onload: (() => void) | null;
            onerror: ((error: Event) => void) | null;
          };
        }).Image;
        const img = new ImageConstructor();
        img.onload = () => {
          // 计算压缩后的尺寸
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
          }

          // 创建 Canvas 进行压缩
          const doc = (globalThis as unknown as {
            document: {
              createElement: (
                tag: string,
              ) => {
                width: number;
                height: number;
                getContext: (
                  type: string,
                ) => {
                  drawImage: (
                    img: unknown,
                    x: number,
                    y: number,
                    w: number,
                    h: number,
                  ) => void;
                } | null;
                toBlob: (
                  callback: (blob: Blob | null) => void,
                  mimeType: string,
                  quality: number,
                ) => void;
              };
            };
          }).document;
          const canvas = doc.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("无法创建 Canvas 上下文"));
            return;
          }

          // 绘制图片
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
          }

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
        img.src = dataUrl;
      })
      .catch(reject);
  });
}

/**
 * 创建文件对象
 * 从数据创建 File 或 Blob 对象
 *
 * @param data 文件数据（字符串、ArrayBuffer、Blob 等）
 * @param filename 文件名
 * @param mimeType MIME 类型（默认 'application/octet-stream'）
 * @returns File 对象
 *
 * @example
 * ```typescript
 * const file = createFile('Hello World', 'hello.txt', 'text/plain');
 * const blob = createFile(new Uint8Array([1, 2, 3]), 'data.bin');
 * ```
 */
export function createFile(
  data: string | ArrayBuffer | Blob | Uint8Array,
  filename: string,
  mimeType: string = "application/octet-stream",
): File {
  if (typeof globalThis === "undefined" || !("File" in globalThis)) {
    throw new Error("createFile 只能在浏览器环境使用");
  }

  let blob: Blob;
  if (data instanceof Blob) {
    blob = data;
  } else {
    // 将数据转换为 Blob，使用类型断言处理 Uint8Array
    blob = new Blob([data as BlobPart], { type: mimeType });
  }

  return new File([blob], filename, { type: mimeType });
}

/**
 * 获取文件 MIME 类型
 * 根据文件扩展名获取对应的 MIME 类型
 *
 * @param filename 文件名或扩展名
 * @returns MIME 类型，如果无法识别返回 'application/octet-stream'
 *
 * @example
 * ```typescript
 * getMimeType('image.jpg'); // 'image/jpeg'
 * getMimeType('document.pdf'); // 'application/pdf'
 * getMimeType('video.mp4'); // 'video/mp4'
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
    // 视频
    mp4: "video/mp4",
    avi: "video/x-msvideo",
    mov: "video/quicktime",
    wmv: "video/x-ms-wmv",
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
    tar: "application/x-tar",
    gz: "application/gzip",
  };

  return mimeTypes[ext] || "application/octet-stream";
}
