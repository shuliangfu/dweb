/**
 * 格式化辅助函数
 * 提供常用的数据格式化函数
 */

/**
 * 格式化数字（添加千分位）
 * @param num 数字
 * @param decimals 小数位数（默认0）
 * @returns 格式化后的字符串
 */
export function formatNumber(num: number, decimals: number = 0): string {
  return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 格式化货币
 * @param amount 金额
 * @param currency 货币符号（默认¥）
 * @param decimals 小数位数（默认2）
 * @returns 格式化后的货币字符串
 */
export function formatCurrency(amount: number, currency: string = '¥', decimals: number = 2): string {
  return `${currency}${formatNumber(amount, decimals)}`;
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @param decimals 小数位数（默认2）
 * @returns 格式化后的文件大小字符串
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * 格式化日期
 * @param date 日期对象或时间戳
 * @param pattern 格式模式（默认 YYYY-MM-DD HH:mm:ss）
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: Date | number, pattern: string = 'YYYY-MM-DD HH:mm:ss'): string {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return pattern
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 格式化相对时间
 * @param date 日期对象或时间戳
 * @returns 相对时间字符串（如：2小时前）
 */
export function formatRelativeTime(date: Date | number): string {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (Math.abs(seconds) < 60) {
    return seconds < 0 ? `${Math.abs(seconds)}秒后` : `${seconds}秒前`;
  } else if (Math.abs(minutes) < 60) {
    return minutes < 0 ? `${Math.abs(minutes)}分钟后` : `${minutes}分钟前`;
  } else if (Math.abs(hours) < 24) {
    return hours < 0 ? `${Math.abs(hours)}小时后` : `${hours}小时前`;
  } else if (Math.abs(days) < 30) {
    return days < 0 ? `${Math.abs(days)}天后` : `${days}天前`;
  } else if (Math.abs(months) < 12) {
    return months < 0 ? `${Math.abs(months)}个月后` : `${months}个月前`;
  } else {
    return years < 0 ? `${Math.abs(years)}年后` : `${years}年前`;
  }
}

/**
 * 格式化百分比
 * @param value 数值
 * @param total 总数
 * @param decimals 小数位数（默认2）
 * @returns 百分比字符串
 */
export function formatPercent(value: number, total: number, decimals: number = 2): string {
  if (total === 0) return '0%';
  const percent = (value / total) * 100;
  return `${percent.toFixed(decimals)}%`;
}

/**
 * 格式化手机号（隐藏中间4位）
 * @param phone 手机号
 * @returns 格式化后的手机号（如：138****5678）
 */
export function formatPhone(phone: string): string {
  if (phone.length !== 11) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(7)}`;
}

/**
 * 格式化身份证号（隐藏中间部分）
 * @param idCard 身份证号
 * @returns 格式化后的身份证号（如：110***********1234）
 */
export function formatIdCard(idCard: string): string {
  if (idCard.length !== 18) return idCard;
  return `${idCard.slice(0, 3)}${'*'.repeat(11)}${idCard.slice(14)}`;
}

/**
 * 格式化银行卡号（隐藏中间部分）
 * @param cardNumber 银行卡号
 * @returns 格式化后的银行卡号（如：6222 **** **** 1234）
 */
export function formatBankCard(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, '');
  if (cleaned.length < 8) return cardNumber;
  const visible = 4;
  const start = cleaned.slice(0, visible);
  const end = cleaned.slice(-visible);
  return `${start} ${'*'.repeat(cleaned.length - visible * 2)} ${end}`;
}

/**
 * 格式化文本（截断并添加省略号）
 * @param text 文本
 * @param maxLength 最大长度
 * @param suffix 后缀（默认...）
 * @returns 格式化后的文本
 */
export function formatText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + suffix;
}

