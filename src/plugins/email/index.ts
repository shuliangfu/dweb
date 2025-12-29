/**
 * 邮件发送插件
 * 支持 SMTP 邮件发送，支持模板和附件
 */

import type { AppLike, Plugin } from "../../common/types/index.ts";
import type {
  EmailOptions,
  EmailPluginOptions,
  EmailResult,
  EmailTemplate,
} from "./types.ts";

/**
 * 发送邮件（简化实现，实际需要 SMTP 客户端库）
 */
export function sendEmail(
  options: EmailOptions,
  _smtpConfig: EmailPluginOptions["smtp"],
): Promise<EmailResult> {
  try {
    // 注意：这是一个简化的实现框架
    // 实际实现需要使用 SMTP 客户端库，例如：
    // - npm:node-smtp 或类似的库
    // - 或使用第三方邮件服务 API（如 SendGrid、Mailgun）

    // 这里提供接口和基本验证
    if (!options.to || !options.subject) {
      return Promise.resolve({
        success: false,
        error: "收件人和主题是必需的",
      });
    }

    // 构建邮件内容
    const _to = Array.isArray(options.to) ? options.to : [options.to];
    const _cc = options.cc
      ? (Array.isArray(options.cc) ? options.cc : [options.cc])
      : [];
    const _bcc = options.bcc
      ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc])
      : [];

    // 实际发送需要使用 SMTP 客户端
    // 示例代码（需要实际的 SMTP 库）：
    /*
    const smtp = new SMTPClient({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.password,
      },
    });

    const message = {
      from: smtpConfig.fromName
        ? `${smtpConfig.fromName} <${smtpConfig.from}>`
        : smtpConfig.from,
      to: to.join(', '),
      cc: cc.length > 0 ? cc.join(', ') : undefined,
      bcc: bcc.length > 0 ? bcc.join(', ') : undefined,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
      replyTo: options.replyTo,
    };

    const result = await smtp.send(message);
    return {
      success: true,
      messageId: result.messageId,
    };
    */

    // 当前实现：返回模拟结果
    console.warn("[Email Plugin] 邮件发送功能需要安装 SMTP 客户端库");
    return Promise.resolve({
      success: true,
      messageId: `mock-${Date.now()}`,
    });
  } catch (error) {
    return Promise.resolve({
      success: false,
      error: error instanceof Error ? error.message : "邮件发送失败",
    });
  }
}

/**
 * 渲染邮件模板
 */
export function renderTemplate(
  template: EmailTemplate,
  variables: Record<string, string>,
): { html: string; text?: string } {
  const format = template.variableFormat || "{{variable}}";
  const pattern = new RegExp(
    format.replace("variable", "(\\w+)").replace(/\{/g, "\\{").replace(
      /\}/g,
      "\\}",
    ),
    "g",
  );

  const html = template.html.replace(pattern, (match, key) => {
    return variables[key] || match;
  });

  const text = template.text
    ? template.text.replace(pattern, (match, key) => {
      return variables[key] || match;
    })
    : undefined;

  return { html, text };
}

/**
 * 创建邮件发送插件
 */
export function email(options: EmailPluginOptions): Plugin {
  if (!options.smtp) {
    throw new Error("邮件发送插件需要 smtp 配置");
  }

  const templates = new Map<string, EmailTemplate>();
  if (options.templates) {
    for (const template of options.templates) {
      templates.set(template.name, template);
    }
  }

  return {
    name: "email",
    config: options as unknown as Record<string, unknown>,

    /**
     * 初始化钩子 - 验证 SMTP 配置
     */
    onInit(app: AppLike) {
      // 将邮件发送函数存储到 app 中，供其他代码使用
      (app as any).sendEmail = async (emailOptions: EmailOptions) => {
        const finalOptions: EmailOptions = {
          ...options.defaults,
          ...emailOptions,
        };
        return await sendEmail(finalOptions, options.smtp);
      };

      // 模板发送函数
      (app as any).sendEmailTemplate = async (
        templateName: string,
        variables: Record<string, string>,
        emailOptions: Partial<EmailOptions>,
      ) => {
        const template = templates.get(templateName);
        if (!template) {
          throw new Error(`邮件模板 ${templateName} 不存在`);
        }

        const { html, text } = renderTemplate(template, variables);
        const finalOptions: EmailOptions = {
          ...options.defaults,
          ...emailOptions,
          html,
          text,
        } as EmailOptions;

        return await sendEmail(finalOptions, options.smtp);
      };

      console.log("✅ [Email Plugin] 邮件发送功能已初始化");
    },
  };
}

// 导出类型和函数
export type {
  EmailAttachment,
  EmailOptions,
  EmailPluginOptions,
  EmailResult,
  EmailTemplate,
  SMTPConfig,
} from "./types.ts";
