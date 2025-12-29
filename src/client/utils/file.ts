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
 * ```
 */
export function saveFile(blob: Blob | string, filename: string): void {
  const data = typeof blob === "string" ? new Blob([blob]) : blob;
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
