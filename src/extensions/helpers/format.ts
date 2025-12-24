/**
 * 格式化辅助函数
 * 提供常用的数据格式化函数，包括数字、日期、文本等格式化
 * 
 * 环境兼容性：
 * - 通用：所有函数都可以在服务端和客户端使用
 */

/**
 * 格式化数字（添加千分位）
 * 将数字格式化为带千分位分隔符的字符串
 * 
 * @param num 数字
 * @param decimals 小数位数（默认0）
 * @returns 格式化后的字符串
 * 
 * @example
 * ```typescript
 * formatNumber(1234567); // '1,234,567'
 * formatNumber(1234.567, 2); // '1,234.57'
 * ```
 */
export function formatNumber(num: number, decimals: number = 0): string {
  return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 格式化货币
 * 将金额格式化为货币格式，包含货币符号和千分位
 * 
 * @param amount 金额
 * @param currency 货币符号（默认¥）
 * @param decimals 小数位数（默认2）
 * @returns 格式化后的货币字符串
 * 
 * @example
 * ```typescript
 * formatCurrency(1234.56); // '¥1,234.56'
 * formatCurrency(1234.56, '$', 2); // '$1,234.56'
 * ```
 */
export function formatCurrency(amount: number, currency: string = '¥', decimals: number = 2): string {
  return `${currency}${formatNumber(amount, decimals)}`;
}

/**
 * 格式化文件大小
 * 将字节数格式化为可读的文件大小（Bytes, KB, MB, GB 等）
 * 
 * @param bytes 字节数
 * @param decimals 小数位数（默认2）
 * @returns 格式化后的文件大小字符串
 * 
 * @example
 * ```typescript
 * formatFileSize(1024); // '1 KB'
 * formatFileSize(1048576); // '1 MB'
 * formatFileSize(1073741824); // '1 GB'
 * ```
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
 * 将日期格式化为指定格式的字符串，支持丰富的格式选项
 * 
 * @param date 日期对象或时间戳
 * @param pattern 格式模式（默认 YYYY-MM-DD HH:mm:ss）
 *   - YYYY: 年份（4位，如：2024）
 *   - YY: 年份（2位，如：24）
 *   - MM: 月份（2位，如：01）
 *   - M: 月份（1-2位，如：1）
 *   - DD: 日期（2位，如：01）
 *   - D: 日期（1-2位，如：1）
 *   - HH: 小时（2位，24小时制，如：09）
 *   - H: 小时（1-2位，24小时制，如：9）
 *   - hh: 小时（2位，12小时制，如：09）
 *   - h: 小时（1-2位，12小时制，如：9）
 *   - mm: 分钟（2位，如：05）
 *   - m: 分钟（1-2位，如：5）
 *   - ss: 秒数（2位，如：05）
 *   - s: 秒数（1-2位，如：5）
 *   - SSS: 毫秒（3位，如：001）
 *   - A: 上午/下午（AM/PM）
 *   - a: 上午/下午（am/pm）
 *   - ddd: 星期几（简写，如：周一）
 *   - dddd: 星期几（完整，如：星期一）
 *   - MMM: 月份（简写，如：1月）
 *   - MMMM: 月份（完整，如：一月）
 *   - Q: 季度（如：Q1）
 * @returns 格式化后的日期字符串
 * 
 * @example
 * ```typescript
 * formatDate(new Date(), 'YYYY-MM-DD'); // '2024-01-15'
 * formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss'); // '2024-01-15 10:30:45'
 * formatDate(new Date(), 'YYYY年MM月DD日 HH:mm:ss'); // '2024年01月15日 10:30:45'
 * formatDate(new Date(), 'hh:mm:ss A'); // '10:30:45 AM'
 * formatDate(new Date(), 'YYYY-MM-DD dddd'); // '2024-01-15 星期一'
 * formatDate(new Date(), 'YYYY年MMM'); // '2024年1月'
 * ```
 */
export function formatDate(date: Date | number, pattern: string = 'YYYY-MM-DD HH:mm:ss'): string {
  const d = date instanceof Date ? date : new Date(date);
  
  // 基础值
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours24 = d.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = d.getMinutes();
  const seconds = d.getSeconds();
  const milliseconds = d.getMilliseconds();
  const dayOfWeek = d.getDay();
  
  // 星期几名称（中文）
  const weekdaysShort = ['日', '一', '二', '三', '四', '五', '六'];
  const weekdaysLong = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  
  // 月份名称（中文）
  const monthsShort = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const monthsLong = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
  
  // 季度
  const quarter = Math.floor(month / 3) + (month % 3 === 0 ? 0 : 1);
  
  // 替换规则
  const replacements: Record<string, string> = {
    // 年份
    YYYY: String(year),
    YY: String(year).slice(-2),
    // 月份
    MMMM: `${monthsLong[month - 1]}月`,
    MMM: `${monthsShort[month - 1]}月`,
    MM: String(month).padStart(2, '0'),
    M: String(month),
    // 日期
    DD: String(day).padStart(2, '0'),
    D: String(day),
    // 小时（24小时制）
    HH: String(hours24).padStart(2, '0'),
    H: String(hours24),
    // 小时（12小时制）
    hh: String(hours12).padStart(2, '0'),
    h: String(hours12),
    // 分钟
    mm: String(minutes).padStart(2, '0'),
    m: String(minutes),
    // 秒数
    ss: String(seconds).padStart(2, '0'),
    s: String(seconds),
    // 毫秒
    SSS: String(milliseconds).padStart(3, '0'),
    // 上午/下午
    A: hours24 >= 12 ? 'PM' : 'AM',
    a: hours24 >= 12 ? 'pm' : 'am',
    // 星期几
    dddd: weekdaysLong[dayOfWeek],
    ddd: `周${weekdaysShort[dayOfWeek]}`,
    // 季度
    Q: `Q${quarter}`,
  };
  
  // 按长度从长到短排序，避免短匹配覆盖长匹配
  const sortedKeys = Object.keys(replacements).sort((a, b) => b.length - a.length);
  
  let result = pattern;
  for (const key of sortedKeys) {
    result = result.replace(new RegExp(key, 'g'), replacements[key]);
  }
  
  return result;
}

/**
 * 格式化相对时间
 * 将日期格式化为相对时间字符串（如：2小时前、3天前等）
 * 
 * @param date 日期对象或时间戳
 * @returns 相对时间字符串（如：2小时前、3天前、1个月前等）
 * 
 * @example
 * ```typescript
 * const oneHourAgo = new Date(Date.now() - 3600000);
 * formatRelativeTime(oneHourAgo); // '1小时前'
 * 
 * const tomorrow = new Date(Date.now() + 86400000);
 * formatRelativeTime(tomorrow); // '1天后'
 * ```
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
 * 计算并格式化百分比值
 * 
 * @param value 数值
 * @param total 总数
 * @param decimals 小数位数（默认2）
 * @returns 百分比字符串
 * 
 * @example
 * ```typescript
 * formatPercent(25, 100); // '25.00%'
 * formatPercent(1, 3); // '33.33%'
 * formatPercent(1, 3, 0); // '33%'
 * ```
 */
export function formatPercent(value: number, total: number, decimals: number = 2): string {
  if (total === 0) return '0%';
  const percent = (value / total) * 100;
  return `${percent.toFixed(decimals)}%`;
}

/**
 * 格式化手机号（隐藏中间4位）
 * 将手机号格式化为脱敏格式，隐藏中间4位数字
 * 
 * @param phone 手机号
 * @returns 格式化后的手机号（如：138****5678）
 * 
 * @example
 * ```typescript
 * formatPhone('13812345678'); // '138****5678'
 * ```
 */
export function formatPhone(phone: string): string {
  if (phone.length !== 11) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(7)}`;
}

/**
 * 格式化身份证号（隐藏中间部分）
 * 将身份证号格式化为脱敏格式，隐藏中间11位
 * 
 * @param idCard 身份证号
 * @returns 格式化后的身份证号（如：110***********1234）
 * 
 * @example
 * ```typescript
 * formatIdCard('110101199001011234'); // '110***********1234'
 * ```
 */
export function formatIdCard(idCard: string): string {
  if (idCard.length !== 18) return idCard;
  return `${idCard.slice(0, 3)}${'*'.repeat(11)}${idCard.slice(14)}`;
}

/**
 * 格式化银行卡号（隐藏中间部分）
 * 将银行卡号格式化为脱敏格式，只显示前后各4位
 * 
 * @param cardNumber 银行卡号
 * @returns 格式化后的银行卡号（如：6222 **** **** 1234）
 * 
 * @example
 * ```typescript
 * formatBankCard('6222021234567890123'); // '6222 **** **** 0123'
 * ```
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
 * 如果文本超过指定长度，则截断并添加省略号
 * 
 * @param text 文本
 * @param maxLength 最大长度
 * @param suffix 后缀（默认...）
 * @returns 格式化后的文本
 * 
 * @example
 * ```typescript
 * formatText('这是一段很长的文本', 5); // '这是一段很...'
 * formatText('短文本', 10); // '短文本'（不截断）
 * ```
 */
export function formatText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + suffix;
}

