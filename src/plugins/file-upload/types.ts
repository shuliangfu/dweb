/**
 * 文件上传插件类型定义
 */

/**
 * 文件上传配置
 */
export interface FileUploadConfig {
  /** 上传目录（相对于项目根目录） */
  uploadDir?: string;
  /** 最大文件大小（字节） */
  maxFileSize?: number;
  /** 允许的文件类型（MIME 类型或扩展名） */
  allowedTypes?: string[];
  /** 是否允许多文件上传 */
  allowMultiple?: boolean;
  /** 文件命名策略 */
  namingStrategy?: 'original' | 'timestamp' | 'uuid' | 'hash';
  /** 是否创建子目录（按日期） */
  createSubdirs?: boolean;
  /** 文件大小限制（每个文件） */
  perFileLimit?: number;
  /** 总大小限制（所有文件） */
  totalLimit?: number;
}

/**
 * 上传的文件信息
 */
export interface UploadedFile {
  /** 原始文件名 */
  originalName: string;
  /** 保存的文件名 */
  filename: string;
  /** 文件路径（相对路径） */
  path: string;
  /** 文件大小（字节） */
  size: number;
  /** MIME 类型 */
  mimeType: string;
  /** 文件扩展名 */
  extension: string;
}

/**
 * 文件上传结果
 */
export interface UploadResult {
  /** 是否成功 */
  success: boolean;
  /** 上传的文件列表 */
  files?: UploadedFile[];
  /** 错误消息 */
  error?: string;
  /** 错误详情 */
  errors?: string[];
}

/**
 * 文件上传插件选项
 */
export interface FileUploadPluginOptions {
  /** 文件上传配置 */
  config?: FileUploadConfig;
  /** 是否在客户端注入上传脚本 */
  injectClientScript?: boolean;
}

