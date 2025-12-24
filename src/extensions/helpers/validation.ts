/**
 * 验证辅助函数
 * 提供常用的数据验证函数，包括邮箱、手机号、身份证等验证
 * 
 * 环境兼容性：
 * - 通用：所有函数都可以在服务端和客户端使用
 */

/**
 * 验证邮箱地址
 * 验证字符串是否符合邮箱格式
 * 
 * @param email 邮箱地址
 * @returns 是否为有效邮箱
 * 
 * @example
 * ```typescript
 * validateEmail('user@example.com'); // true
 * validateEmail('invalid-email'); // false
 * ```
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证URL
 * 验证字符串是否为有效的 URL 地址
 * 
 * @param url URL地址
 * @returns 是否为有效URL
 * 
 * @example
 * ```typescript
 * validateUrl('https://example.com'); // true
 * validateUrl('not-a-url'); // false
 * ```
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证手机号（中国）
 * 验证字符串是否符合中国大陆手机号格式（11位，1开头，第二位为3-9）
 * 
 * @param phone 手机号
 * @returns 是否为有效手机号
 * 
 * @example
 * ```typescript
 * validatePhone('13812345678'); // true
 * validatePhone('12812345678'); // false（第二位不是3-9）
 * ```
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 验证身份证号（中国）
 * 验证字符串是否符合中国大陆18位身份证号格式，包括校验码验证
 * 
 * @param idCard 身份证号
 * @returns 是否为有效身份证号
 * 
 * @example
 * ```typescript
 * validateIdCard('110101199001011234'); // true（如果校验码正确）
 * validateIdCard('123456789012345678'); // false
 * ```
 */
export function validateIdCard(idCard: string): boolean {
  const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;
  if (!idCardRegex.test(idCard)) {
    return false;
  }

  // 验证校验码
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  let sum = 0;

  for (let i = 0; i < 17; i++) {
    sum += parseInt(idCard[i]) * weights[i];
  }

  const checkCode = checkCodes[sum % 11];
  return idCard[17].toUpperCase() === checkCode;
}

/**
 * 验证密码强度
 * 验证密码强度，检查长度和字符类型（大小写字母、数字、特殊字符）
 * 
 * @param password 密码
 * @param minLength 最小长度（默认8）
 * @returns 验证结果对象，包含是否有效、强度等级和提示信息
 * 
 * @example
 * ```typescript
 * const result = validatePassword('MyP@ssw0rd');
 * // { valid: true, strength: 'strong', message: '密码强度强' }
 * 
 * const weak = validatePassword('123');
 * // { valid: false, strength: 'weak', message: '密码长度至少为 8 位' }
 * ```
 */
export function validatePassword(
  password: string,
  minLength: number = 8
): { valid: boolean; strength: 'weak' | 'medium' | 'strong'; message: string } {
  if (password.length < minLength) {
    return {
      valid: false,
      strength: 'weak',
      message: `密码长度至少为 ${minLength} 位`,
    };
  }

  let strength = 0;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  if (strength < 2) {
    return {
      valid: false,
      strength: 'weak',
      message: '密码强度太弱，建议包含大小写字母、数字和特殊字符',
    };
  } else if (strength === 2) {
    return {
      valid: true,
      strength: 'medium',
      message: '密码强度中等',
    };
  } else {
    return {
      valid: true,
      strength: 'strong',
      message: '密码强度强',
    };
  }
}

/**
 * 验证数字范围
 * 验证数值是否在指定的最小值和最大值之间（包含边界）
 * 
 * @param value 数值
 * @param min 最小值
 * @param max 最大值
 * @returns 是否在范围内
 * 
 * @example
 * ```typescript
 * validateRange(5, 0, 10); // true
 * validateRange(15, 0, 10); // false
 * validateRange(0, 0, 10); // true（包含边界）
 * ```
 */
export function validateRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * 验证字符串长度
 * 验证字符串长度是否在指定的最小值和最大值之间（包含边界）
 * 
 * @param str 字符串
 * @param min 最小长度
 * @param max 最大长度
 * @returns 是否在长度范围内
 * 
 * @example
 * ```typescript
 * validateLength('hello', 3, 10); // true
 * validateLength('hi', 3, 10); // false
 * validateLength('hello world', 3, 10); // false
 * ```
 */
export function validateLength(str: string, min: number, max: number): boolean {
  return str.length >= min && str.length <= max;
}

/**
 * 验证是否为数字
 * 类型守卫函数，验证值是否为有效的数字（不是 NaN）
 * 
 * @param value 值
 * @returns 是否为数字（类型守卫）
 * 
 * @example
 * ```typescript
 * if (validateNumber(value)) {
 *   // TypeScript 会推断 value 为 number 类型
 *   console.log(value.toFixed(2));
 * }
 * ```
 */
export function validateNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * 验证是否为整数
 * 类型守卫函数，验证值是否为整数
 * 
 * @param value 值
 * @returns 是否为整数（类型守卫）
 * 
 * @example
 * ```typescript
 * if (validateInteger(value)) {
 *   // TypeScript 会推断 value 为 number 类型
 *   console.log(value);
 * }
 * ```
 */
export function validateInteger(value: unknown): value is number {
  return validateNumber(value) && Number.isInteger(value);
}

/**
 * 验证是否为正数
 * 类型守卫函数，验证值是否为正数（大于0）
 * 
 * @param value 值
 * @returns 是否为正数（类型守卫）
 * 
 * @example
 * ```typescript
 * if (validatePositive(value)) {
 *   // TypeScript 会推断 value 为 number 类型
 *   console.log(value);
 * }
 * ```
 */
export function validatePositive(value: unknown): value is number {
  return validateNumber(value) && value > 0;
}

/**
 * 验证是否为空值
 * 检查值是否为空（null、undefined、空字符串、空数组、空对象）
 * 
 * @param value 值
 * @returns 是否为空
 * 
 * @example
 * ```typescript
 * validateEmpty(null); // true
 * validateEmpty(''); // true
 * validateEmpty([]); // true
 * validateEmpty({}); // true
 * validateEmpty(0); // false
 * validateEmpty('hello'); // false
 * ```
 */
export function validateEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  return false;
}

