/**
 * 邮件发送插件类型定义
 */

/**
 * SMTP 配置
 */
export interface SMTPConfig {
  /** SMTP 服务器地址 */
  host: string;
  /** SMTP 端口 */
  port: number;
  /** 是否使用 TLS */
  secure?: boolean;
  /** 用户名 */
  user: string;
  /** 密码 */
  password: string;
  /** 发件人邮箱 */
  from: string;
  /** 发件人名称 */
  fromName?: string;
}

/**
 * 邮件附件
 */
export interface EmailAttachment {
  /** 文件名 */
  filename: string;
  /** 文件内容（Base64 或 Buffer） */
  content: string | Uint8Array;
  /** 内容类型 */
  contentType?: string;
}

/**
 * 邮件选项
 */
export interface EmailOptions {
  /** 收件人邮箱 */
  to: string | string[];
  /** 抄送 */
  cc?: string | string[];
  /** 密送 */
  bcc?: string | string[];
  /** 主题 */
  subject: string;
  /** 文本内容 */
  text?: string;
  /** HTML 内容 */
  html?: string;
  /** 附件 */
  attachments?: EmailAttachment[];
  /** 回复地址 */
  replyTo?: string;
}

/**
 * 邮件发送结果
 */
export interface EmailResult {
  /** 是否成功 */
  success: boolean;
  /** 消息 ID */
  messageId?: string;
  /** 错误消息 */
  error?: string;
}

/**
 * 邮件模板配置
 */
export interface EmailTemplate {
  /** 模板名称 */
  name: string;
  /** 模板内容（HTML） */
  html: string;
  /** 文本版本 */
  text?: string;
  /** 变量占位符格式（默认 {{variable}}） */
  variableFormat?: string;
}

/**
 * 邮件发送插件选项
 */
export interface EmailPluginOptions {
  /** SMTP 配置 */
  smtp: SMTPConfig;
  /** 邮件模板列表 */
  templates?: EmailTemplate[];
  /** 默认选项 */
  defaults?: Partial<EmailOptions>;
}
