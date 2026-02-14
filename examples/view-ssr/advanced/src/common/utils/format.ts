/**
 * 格式化工具函数
 */

/**
 * 格式化日期
 * @param date - 日期字符串或 Date 对象
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * 格式化时间
 * @param date - 日期字符串或 Date 对象
 * @returns 格式化后的时间字符串
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 格式化相对时间
 * @param date - 日期字符串或 Date 对象
 * @returns 相对时间字符串
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} 天前`;
  if (hours > 0) return `${hours} 小时前`;
  if (minutes > 0) return `${minutes} 分钟前`;
  return "刚刚";
}
