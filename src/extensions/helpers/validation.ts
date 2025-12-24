/**
 * 验证辅助函数
 * 提供常用的数据验证函数
 */

/**
 * 验证邮箱地址
 * @param email 邮箱地址
 * @returns 是否为有效邮箱
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证URL
 * @param url URL地址
 * @returns 是否为有效URL
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
 * @param phone 手机号
 * @returns 是否为有效手机号
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 验证身份证号（中国）
 * @param idCard 身份证号
 * @returns 是否为有效身份证号
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
 * @param password 密码
 * @param minLength 最小长度（默认8）
 * @returns 验证结果对象
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
 * @param value 数值
 * @param min 最小值
 * @param max 最大值
 * @returns 是否在范围内
 */
export function validateRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * 验证字符串长度
 * @param str 字符串
 * @param min 最小长度
 * @param max 最大长度
 * @returns 是否在长度范围内
 */
export function validateLength(str: string, min: number, max: number): boolean {
  return str.length >= min && str.length <= max;
}

/**
 * 验证是否为数字
 * @param value 值
 * @returns 是否为数字
 */
export function validateNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * 验证是否为整数
 * @param value 值
 * @returns 是否为整数
 */
export function validateInteger(value: unknown): value is number {
  return validateNumber(value) && Number.isInteger(value);
}

/**
 * 验证是否为正数
 * @param value 值
 * @returns 是否为正数
 */
export function validatePositive(value: unknown): value is number {
  return validateNumber(value) && value > 0;
}

/**
 * 验证是否为空值
 * @param value 值
 * @returns 是否为空
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

