/**
 * 邮件服务示例
 * 注意：这是一个瞬态服务示例（每次获取都创建新实例）
 */

export interface EmailOptions {
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
}

export class EmailService {
  private sentEmails: Array<EmailOptions & { sentAt: string }> = [];

  /**
   * 发送邮件
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    // 模拟发送邮件
    console.log(
      `📧 发送邮件到: ${
        Array.isArray(options.to) ? options.to.join(", ") : options.to
      }`,
    );
    console.log(`主题: ${options.subject}`);
    console.log(`内容: ${options.body}`);

    this.sentEmails.push({
      ...options,
      sentAt: new Date().toISOString(),
    });

    // 模拟异步操作
    await new Promise((resolve) => setTimeout(resolve, 100));

    return true;
  }

  /**
   * 获取已发送的邮件列表
   */
  getSentEmails(): Array<EmailOptions & { sentAt: string }> {
    return [...this.sentEmails];
  }

  /**
   * 清空已发送邮件记录
   */
  clearSentEmails(): void {
    this.sentEmails = [];
  }
}
