/**
 * 文件上传插件
 * 处理文件上传，支持多文件、文件类型验证、大小限制
 */

import type {
  AppConfig,
  AppLike,
  Plugin,
  Request,
  Response,
} from "../../common/types/index.ts";
import type {
  FileUploadPluginOptions,
  UploadedFile,
  UploadResult,
} from "./types.ts";
import * as path from "@std/path";
import { ensureDir } from "@std/fs/ensure-dir";
import { crypto } from "@std/crypto";

/**
 * 生成文件名
 */
async function generateFilename(
  originalName: string,
  strategy: "original" | "timestamp" | "uuid" | "hash" = "timestamp",
): Promise<string> {
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);

  switch (strategy) {
    case "original": {
      return originalName;
    }
    case "timestamp": {
      return `${Date.now()}-${baseName}${ext}`;
    }
    case "uuid": {
      // 简化实现，使用时间戳 + 随机数
      const random = Math.random().toString(36).substring(2, 15);
      return `${Date.now()}-${random}${ext}`;
    }
    case "hash": {
      // 使用文件内容的 hash（需要文件内容，这里简化处理）
      const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(`${originalName}-${Date.now()}`),
      );
      const hashArray = Array.from(new Uint8Array(hash));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      return `${hashHex.substring(0, 16)}${ext}`;
    }
    default: {
      return `${Date.now()}-${baseName}${ext}`;
    }
  }
}

/**
 * 验证文件类型
 */
function validateFileType(
  filename: string,
  mimeType: string,
  allowedTypes: string[],
): boolean {
  if (allowedTypes.length === 0) {
    return true;
  }

  const ext = path.extname(filename).toLowerCase().slice(1);

  return allowedTypes.some((type) => {
    // 检查扩展名
    if (type.startsWith(".")) {
      return type.slice(1).toLowerCase() === ext;
    }
    // 检查 MIME 类型
    if (type.includes("/")) {
      if (type.endsWith("/*")) {
        const baseType = type.slice(0, -2);
        return mimeType.startsWith(baseType + "/");
      }
      return mimeType === type;
    }
    // 检查扩展名（无点）
    return type.toLowerCase() === ext;
  });
}

// 存储 extendDirs 映射（在 onInit 中初始化）
// key: 标准化后的目录路径（去掉 ./ 前缀），value: prefix（如果存在）
const extendDirPrefixMap = new Map<string, string>();

/**
 * 标准化目录路径（去掉 ./ 前缀，统一为相对路径格式）
 * @param dir 目录路径
 * @returns 标准化后的目录路径
 */
function normalizeDir(dir: string): string {
  const original = dir;
  // 去掉 ./ 前缀
  let normalized = dir.replace(/^\.\//, "");
  // 去掉开头的 /（如果是相对路径）
  if (!path.isAbsolute(normalized)) {
    normalized = normalized.replace(/^\//, "");
  }
  if (original !== normalized) {
    console.log(
      `[File Upload Plugin] 路径标准化: "${original}" -> "${normalized}"`,
    );
  }
  return normalized;
}

/**
 * 从静态资源配置中获取匹配的 prefix
 * @param uploadDir 上传目录
 * @returns 匹配的 prefix，如果没有找到则返回空字符串
 */
function getPrefixFromStaticConfig(uploadDir: string): string {
  console.log(
    `[File Upload Plugin] 开始查找 prefix，上传目录: "${uploadDir}"`,
  );

  // 标准化上传目录路径（去掉 ./ 前缀）
  const normalizedUploadDir = normalizeDir(uploadDir);
  console.log(
    `[File Upload Plugin] 标准化后的上传目录: "${normalizedUploadDir}"`,
  );

  // 打印当前映射表内容（用于调试）
  if (extendDirPrefixMap.size > 0) {
    console.log(
      `[File Upload Plugin] 当前映射表内容 (${extendDirPrefixMap.size} 项):`,
    );
    for (const [dir, prefix] of extendDirPrefixMap.entries()) {
      console.log(
        `  - "${dir}" -> ${prefix ? `"${prefix}"` : "(空)"}`,
      );
    }
  } else {
    console.log(
      `[File Upload Plugin] 警告: 映射表为空，未找到任何 extendDirs 配置`,
    );
  }

  // 直接查找匹配的目录（Map 的 key 已经是标准化后的路径）
  if (extendDirPrefixMap.has(normalizedUploadDir)) {
    const prefix = extendDirPrefixMap.get(normalizedUploadDir)!;
    console.log(
      `[File Upload Plugin] ✓ 找到匹配的目录: "${normalizedUploadDir}"`,
    );
    // 如果匹配且 prefix 存在，返回 prefix
    if (prefix) {
      console.log(
        `[File Upload Plugin] ✓ prefix 存在: "${prefix}"，返回路径将使用此前缀`,
      );
      return prefix;
    } else {
      console.log(
        `[File Upload Plugin] ⚠ 找到匹配的目录但 prefix 为空，将使用文件系统相对路径`,
      );
      return "";
    }
  }

  // 如果没有找到匹配，打印调试信息
  if (extendDirPrefixMap.size > 0) {
    const configuredDirs = Array.from(extendDirPrefixMap.keys()).join(", ");
    console.log(
      `[File Upload Plugin] ✗ 未找到匹配的目录`,
    );
    console.log(
      `[File Upload Plugin]   上传目录: "${uploadDir}" (标准化: "${normalizedUploadDir}")`,
    );
    console.log(
      `[File Upload Plugin]   已配置的目录: ${configuredDirs}`,
    );
    console.log(
      `[File Upload Plugin]   将使用文件系统相对路径作为返回路径`,
    );
  } else {
    console.log(
      `[File Upload Plugin] ✗ 映射表为空，无法匹配，将使用文件系统相对路径`,
    );
  }

  return "";
}

/**
 * 处理文件上传
 */
export async function handleFileUpload(
  req: Request,
  config: FileUploadPluginOptions["config"] = {},
): Promise<UploadResult> {
  const uploadDir = config.uploadDir || "uploads";
  const maxFileSize = config.maxFileSize || 10 * 1024 * 1024; // 默认 10MB
  const allowedTypes = config.allowedTypes || [];
  const allowMultiple = config.allowMultiple !== false;
  const namingStrategy = config.namingStrategy || "timestamp";
  const createSubdirs = config.createSubdirs !== false;

  // 自动从 static.extendDirs 配置中获取 prefix
  const prefix = getPrefixFromStaticConfig(uploadDir);

  try {
    // 解析 multipart/form-data
    // 如果 body parser 中间件已经解析了，直接使用 req.body
    // 否则调用 req.formData() 解析
    let formData: FormData;
    if (req.body instanceof FormData) {
      formData = req.body;
    } else {
      formData = await req.formData();
    }
    const files: UploadedFile[] = [];
    const errors: string[] = [];

    // 获取所有文件字段
    const fileEntries: File[] = [];
    for (const [_key, value] of formData.entries()) {
      if (value instanceof File) {
        fileEntries.push(value);
      }
    }

    if (fileEntries.length === 0) {
      return {
        success: false,
        error: "没有上传文件",
      };
    }

    if (!allowMultiple && fileEntries.length > 1) {
      return {
        success: false,
        error: "只允许上传一个文件",
      };
    }

    // 检查总大小
    const totalSize = fileEntries.reduce((sum, file) => sum + file.size, 0);
    if (config.totalLimit && totalSize > config.totalLimit) {
      return {
        success: false,
        error: `总文件大小超过限制 ${
          (config.totalLimit / 1024 / 1024).toFixed(2)
        }MB`,
      };
    }

    // 创建上传目录
    let targetDir = uploadDir;
    let urlSubdirPath = ""; // 用于构建 URL 路径的日期子目录

    if (createSubdirs) {
      const date = new Date();
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();

      // 获取子目录策略（默认：YYYY/mm/dd）
      const subdirStrategy = config.subdirStrategy || "YYYY/mm/dd";

      // 解析模板字符串
      let subdirPath: string;

      // 向后兼容：支持预设值
      if (subdirStrategy === "year") {
        subdirPath = String(year);
      } else if (subdirStrategy === "year-month") {
        subdirPath = `${year}/${String(month).padStart(2, "0")}`;
      } else if (subdirStrategy === "year-month-day") {
        subdirPath = `${year}/${String(month).padStart(2, "0")}/${
          String(day).padStart(2, "0")
        }`;
      } else {
        // 使用模板格式解析
        // 支持的占位符：YYYY, YY, mm, m, dd, d
        // 注意：按长度从长到短替换，避免短匹配覆盖长匹配
        let result = subdirStrategy;

        // 先替换长的占位符（避免被短占位符覆盖）
        result = result.replace(/YYYY/g, String(year)); // 4位年份：2026
        result = result.replace(/mm/g, String(month).padStart(2, "0")); // 2位月份：01
        result = result.replace(/dd/g, String(day).padStart(2, "0")); // 2位日期：02

        // 再替换短的占位符
        result = result.replace(/YY/g, String(year).slice(-2)); // 2位年份：26

        // 替换单个 m 和 d（使用正则确保只匹配独立的单个字符，不匹配已替换的 mm/dd）
        // 匹配分隔符（/、-、_）之间或开头/结尾的单个 m 或 d
        const monthStr = String(month);
        const dayStr = String(day);

        // 替换分隔符之间的单个 m 和 d
        result = result.replace(
          /([\/\-_]|^)(m)([\/\-_]|$)/g,
          `$1${monthStr}$3`,
        );
        result = result.replace(/([\/\-_]|^)(d)([\/\-_]|$)/g, `$1${dayStr}$3`);

        subdirPath = result;
      }

      // 构建完整路径（处理不同的路径分隔符）
      const subdirParts = subdirPath.split(/[/\\-]/);
      targetDir = path.join(uploadDir, ...subdirParts);

      // 保存用于 URL 路径的子目录（统一使用 / 作为分隔符）
      urlSubdirPath = subdirPath.replace(/[\\-]/g, "/");
    }
    await ensureDir(targetDir);

    // 处理每个文件
    for (const file of fileEntries) {
      // 验证文件大小
      const fileSizeLimit = config.perFileLimit || maxFileSize;
      if (file.size > fileSizeLimit) {
        errors.push(
          `${file.name}: 文件大小超过限制 ${
            (fileSizeLimit / 1024 / 1024).toFixed(2)
          }MB`,
        );
        continue;
      }

      // 验证文件类型
      if (!validateFileType(file.name, file.type, allowedTypes)) {
        errors.push(`${file.name}: 不允许的文件类型`);
        continue;
      }

      // 读取文件数据
      const arrayBuffer = await file.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer as ArrayBuffer);
      const finalFilename = await generateFilename(file.name, namingStrategy);
      const finalExtension = path.extname(file.name).slice(1);
      const finalMimeType = file.type;
      const finalSize = file.size;

      // 保存文件
      const filePath = path.join(targetDir, finalFilename);
      await Deno.writeFile(filePath, fileData);

      // 构建 URL 路径（使用 prefix 和日期子目录）
      let urlPath: string;
      console.log(
        `[File Upload Plugin] 构建文件 URL 路径，prefix: ${
          prefix ? `"${prefix}"` : "(空)"
        }, 日期子目录: ${urlSubdirPath || "(无)"}, 文件名: "${finalFilename}"`,
      );
      if (prefix) {
        // 如果设置了 prefix，使用 prefix + 日期子目录 + 文件名
        const prefixNormalized = prefix.startsWith("/") ? prefix : `/${prefix}`;
        console.log(
          `[File Upload Plugin]   使用 prefix 模式，标准化后的 prefix: "${prefixNormalized}"`,
        );
        if (urlSubdirPath) {
          urlPath = `${prefixNormalized}/${urlSubdirPath}/${finalFilename}`;
          console.log(
            `[File Upload Plugin]   生成的 URL 路径 (带日期子目录): "${urlPath}"`,
          );
        } else {
          urlPath = `${prefixNormalized}/${finalFilename}`;
          console.log(
            `[File Upload Plugin]   生成的 URL 路径 (无日期子目录): "${urlPath}"`,
          );
        }
      } else {
        // 如果没有设置 prefix，使用文件系统的相对路径（向后兼容）
        urlPath = path.relative(Deno.cwd(), filePath).replace(/\\/g, "/");
        console.log(
          `[File Upload Plugin]   使用文件系统相对路径模式: "${urlPath}"`,
        );
      }

      files.push({
        originalName: file.name,
        filename: finalFilename,
        path: urlPath,
        size: finalSize,
        mimeType: finalMimeType,
        extension: finalExtension,
      });
    }

    if (errors.length > 0 && files.length === 0) {
      return {
        success: false,
        error: "文件上传失败",
        errors,
      };
    }

    return {
      success: true,
      files,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "文件上传失败",
    };
  }
}

/**
 * 生成客户端上传脚本
 */
function generateClientScript(): string {
  return `
    <script>
      (function() {
        // 文件上传工具
        window.FileUploader = {
          upload: async function(formData, options = {}) {
            try {
              const response = await fetch(options.url || '/api/upload', {
                method: 'POST',
                body: formData,
                headers: options.headers || {}
              });

              if (!response.ok) {
                throw new Error('上传失败: ' + response.statusText);
              }

              return await response.json();
            } catch (error) {
              throw error;
            }
          },

          validateFile: function(file, options = {}) {
            const maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB
            const allowedTypes = options.allowedTypes || [];

            if (file.size > maxSize) {
              return { valid: false, error: '文件大小超过限制' };
            }

            if (allowedTypes.length > 0) {
              const ext = file.name.split('.').pop()?.toLowerCase();
              const mimeType = file.type;

              const isAllowed = allowedTypes.some(type => {
                if (type.startsWith('.')) {
                  return type.slice(1).toLowerCase() === ext;
                }
                if (type.includes('/')) {
                  return mimeType === type || mimeType.startsWith(type.replace('/*', '/'));
                }
                return type.toLowerCase() === ext;
              });

              if (!isAllowed) {
                return { valid: false, error: '不允许的文件类型' };
              }
            }

            return { valid: true };
          }
        };
      })();
    </script>
  `;
}

/**
 * 创建文件上传插件
 */
export function fileUpload(options: FileUploadPluginOptions = {}): Plugin {
  return {
    name: "file-upload",
    config: options as unknown as Record<string, unknown>,

    /**
     * 初始化钩子 - 从配置中读取 extendDirs 并构建映射
     */
    onInit(_app: AppLike, config: AppConfig) {
      // 清空之前的映射
      extendDirPrefixMap.clear();

      const extendDirs = config.static?.extendDirs || [];
      console.log(
        `[File Upload Plugin] 初始化，找到 ${extendDirs.length} 个 extendDirs 配置`,
      );

      // 构建目录到 prefix 的映射
      for (let i = 0; i < extendDirs.length; i++) {
        const extendDir = extendDirs[i];
        console.log(
          `[File Upload Plugin] 处理第 ${
            i + 1
          }/${extendDirs.length} 个 extendDir:`,
          typeof extendDir === "string"
            ? `"${extendDir}"`
            : JSON.stringify(extendDir),
        );

        let dir: string;
        let prefix: string | undefined;

        if (typeof extendDir === "string") {
          // 字符串格式：没有 prefix，使用 extendDir 作为 prefix
          dir = extendDir;
          console.log(
            `[File Upload Plugin]   类型: 字符串格式，dir = "${dir}"`,
          );
          // 去掉 ./ 前缀（如果有），然后加上 /
          const dirForPrefix = extendDir.replace(/^\.\//, "");
          console.log(
            `[File Upload Plugin]   去掉 ./ 前缀后: "${dirForPrefix}"`,
          );
          // 确保以 / 开头
          prefix = dirForPrefix.startsWith("/")
            ? dirForPrefix
            : `/${dirForPrefix}`;
          console.log(
            `[File Upload Plugin]   生成的 prefix: "${prefix}"`,
          );
        } else {
          // 对象格式：使用配置的 dir 和 prefix
          dir = extendDir.dir;
          prefix = extendDir.prefix;
          console.log(
            `[File Upload Plugin]   类型: 对象格式，dir = "${dir}", prefix = ${
              prefix ? `"${prefix}"` : "undefined"
            }`,
          );
        }

        // 标准化目录路径（去掉 ./ 前缀）
        const normalizedDir = normalizeDir(dir);
        console.log(
          `[File Upload Plugin]   标准化后的 dir: "${normalizedDir}"`,
        );

        // 如果 prefix 存在，确保以 / 开头
        let normalizedPrefix: string;
        if (prefix) {
          normalizedPrefix = prefix.startsWith("/") ? prefix : `/${prefix}`;
          console.log(
            `[File Upload Plugin]   标准化后的 prefix: "${normalizedPrefix}"`,
          );
        } else {
          normalizedPrefix = "";
          console.log(
            `[File Upload Plugin]   prefix 为空，将使用空字符串`,
          );
        }

        // 存储映射：key 使用标准化后的 dir（用于匹配），value 是 prefix（如果存在）
        extendDirPrefixMap.set(normalizedDir, normalizedPrefix);
        console.log(
          `[File Upload Plugin]   ✓ 已注册映射: "${normalizedDir}" -> ${
            normalizedPrefix ? `"${normalizedPrefix}"` : "(空)"
          }`,
        );
        console.log(""); // 空行分隔
      }

      if (extendDirPrefixMap.size === 0) {
        console.log(
          `[File Upload Plugin] 警告: 未找到 extendDirs 配置，将使用文件系统相对路径作为返回路径`,
        );
      }
    },

    /**
     * 请求处理钩子 - 注入客户端上传脚本
     */
    onRequest(_req: Request, res: Response) {
      // 只处理 HTML 响应
      if (!res.body || typeof res.body !== "string") {
        return;
      }

      const contentType = res.headers.get("Content-Type") || "";
      if (!contentType.includes("text/html")) {
        return;
      }

      if (options.injectClientScript !== false) {
        try {
          const html = res.body as string;

          // 注入上传脚本（在 </head> 之前）
          if (html.includes("</head>")) {
            const script = generateClientScript();
            res.body = html.replace("</head>", `${script}\n</head>`);
          }
        } catch (error) {
          console.error("[File Upload Plugin] 注入上传脚本时出错:", error);
        }
      }
    },
  };
}

// 导出类型和函数
export type {
  FileUploadConfig,
  FileUploadPluginOptions,
  UploadedFile,
  UploadResult,
} from "./types.ts";
