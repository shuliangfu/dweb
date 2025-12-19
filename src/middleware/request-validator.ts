/**
 * 请求验证中间件
 * 验证请求参数、查询参数和请求体
 */

import type { Middleware } from '../types/index.ts';

/**
 * 验证规则
 */
export interface ValidationRule {
  /**
   * 字段名
   */
  field: string;
  
  /**
   * 验证类型
   */
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url' | 'date';
  
  /**
   * 是否必需
   */
  required?: boolean;
  
  /**
   * 最小值（用于数字或字符串长度）
   */
  min?: number;
  
  /**
   * 最大值（用于数字或字符串长度）
   */
  max?: number;
  
  /**
   * 最小长度（用于字符串或数组）
   */
  minLength?: number;
  
  /**
   * 最大长度（用于字符串或数组）
   */
  maxLength?: number;
  
  /**
   * 正则表达式模式
   */
  pattern?: string | RegExp;
  
  /**
   * 枚举值（允许的值列表）
   */
  enum?: (string | number | boolean)[];
  
  /**
   * 自定义验证函数
   */
  validate?: (value: unknown, field: string) => boolean | string;
  
  /**
   * 错误消息
   */
  message?: string;
  
  /**
   * 嵌套验证规则（用于对象类型）
   */
  properties?: Record<string, ValidationRule>;
}

/**
 * 验证配置
 */
export interface ValidationConfig {
  /**
   * 查询参数验证规则
   */
  query?: ValidationRule[];
  
  /**
   * 路径参数验证规则
   */
  params?: ValidationRule[];
  
  /**
   * 请求体验证规则
   */
  body?: ValidationRule[];
  
  /**
   * 是否允许额外字段（默认 false）
   */
  allowExtra?: boolean;
  
  /**
   * 自定义错误格式化函数
   */
  formatError?: (errors: ValidationError[]) => unknown;
}

/**
 * 验证错误
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * 请求验证选项
 */
export interface RequestValidatorOptions {
  /**
   * 验证配置（可以是函数，根据请求动态返回配置）
   */
  validation?: ValidationConfig | ((req: { url: string; method: string }) => ValidationConfig | null);
  
  /**
   * 跳过验证的路径（支持 glob 模式）
   */
  skip?: string[];
  
  /**
   * 自定义错误状态码（默认 400）
   */
  statusCode?: number;
}

/**
 * 检查路径是否匹配模式（简单的 glob 匹配）
 */
function matchesPattern(path: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    // 精确匹配
    if (pattern === path) {
      return true;
    }
    
    // 前缀匹配
    if (pattern.endsWith('*') && path.startsWith(pattern.slice(0, -1))) {
      return true;
    }
    
    // 后缀匹配
    if (pattern.startsWith('*') && path.endsWith(pattern.slice(1))) {
      return true;
    }
    
    // 通配符匹配（简单实现）
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    if (regex.test(path)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 验证单个值
 */
function validateValue(value: unknown, rule: ValidationRule, field: string): ValidationError | null {
  // 检查必需字段
  if (rule.required && (value === undefined || value === null || value === '')) {
    return {
      field,
      message: rule.message || `${field} is required`,
      value,
    };
  }
  
  // 如果字段不是必需的且值为空，跳过其他验证
  if (!rule.required && (value === undefined || value === null || value === '')) {
    return null;
  }
  
  // 类型验证
  if (rule.type) {
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          return {
            field,
            message: rule.message || `${field} must be a string`,
            value,
          };
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return {
            field,
            message: rule.message || `${field} must be a number`,
            value,
          };
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return {
            field,
            message: rule.message || `${field} must be a boolean`,
            value,
          };
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          return {
            field,
            message: rule.message || `${field} must be an array`,
            value,
          };
        }
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return {
            field,
            message: rule.message || `${field} must be an object`,
            value,
          };
        }
        break;
      case 'email':
        if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return {
            field,
            message: rule.message || `${field} must be a valid email address`,
            value,
          };
        }
        break;
      case 'url':
        try {
          new URL(value as string);
        } catch {
          return {
            field,
            message: rule.message || `${field} must be a valid URL`,
            value,
          };
        }
        break;
      case 'date':
        if (isNaN(Date.parse(value as string))) {
          return {
            field,
            message: rule.message || `${field} must be a valid date`,
            value,
          };
        }
        break;
    }
  }
  
  // 长度验证（字符串或数组）
  if (rule.minLength !== undefined) {
    const length = Array.isArray(value) ? value.length : (typeof value === 'string' ? value.length : 0);
    if (length < rule.minLength) {
      return {
        field,
        message: rule.message || `${field} must be at least ${rule.minLength} characters/items`,
        value,
      };
    }
  }
  
  if (rule.maxLength !== undefined) {
    const length = Array.isArray(value) ? value.length : (typeof value === 'string' ? value.length : 0);
    if (length > rule.maxLength) {
      return {
        field,
        message: rule.message || `${field} must be at most ${rule.maxLength} characters/items`,
        value,
      };
    }
  }
  
  // 数值范围验证
  if (rule.min !== undefined && typeof value === 'number') {
    if (value < rule.min) {
      return {
        field,
        message: rule.message || `${field} must be at least ${rule.min}`,
        value,
      };
    }
  }
  
  if (rule.max !== undefined && typeof value === 'number') {
    if (value > rule.max) {
      return {
        field,
        message: rule.message || `${field} must be at most ${rule.max}`,
        value,
      };
    }
  }
  
  // 正则表达式验证
  if (rule.pattern) {
    const regex = typeof rule.pattern === 'string' ? new RegExp(rule.pattern) : rule.pattern;
    if (typeof value === 'string' && !regex.test(value)) {
      return {
        field,
        message: rule.message || `${field} does not match the required pattern`,
        value,
      };
    }
  }
  
  // 枚举值验证
  if (rule.enum && !rule.enum.includes(value as string | number | boolean)) {
    return {
      field,
      message: rule.message || `${field} must be one of: ${rule.enum.join(', ')}`,
      value,
    };
  }
  
  // 自定义验证函数
  if (rule.validate) {
    const result = rule.validate(value, field);
    if (result !== true) {
      return {
        field,
        message: typeof result === 'string' ? result : rule.message || `${field} validation failed`,
        value,
      };
    }
  }
  
  // 嵌套对象验证
  if (rule.properties && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    for (const [propName, propRule] of Object.entries(rule.properties)) {
      const error = validateValue(obj[propName], propRule, `${field}.${propName}`);
      if (error) {
        return error;
      }
    }
  }
  
  return null;
}

/**
 * 验证数据对象
 */
function validateData(
  data: Record<string, unknown>,
  rules: ValidationRule[],
  allowExtra: boolean
): ValidationError[] {
  const errors: ValidationError[] = [];
  const validatedFields = new Set<string>();
  
  // 验证每个规则
  for (const rule of rules) {
    validatedFields.add(rule.field);
    const error = validateValue(data[rule.field], rule, rule.field);
    if (error) {
      errors.push(error);
    }
  }
  
  // 检查额外字段
  if (!allowExtra) {
    for (const field of Object.keys(data)) {
      if (!validatedFields.has(field)) {
        errors.push({
          field,
          message: `Unexpected field: ${field}`,
          value: data[field],
        });
      }
    }
  }
  
  return errors;
}

/**
 * 创建请求验证中间件
 * @param options 请求验证选项
 * @returns 中间件函数
 */
export function requestValidator(options: RequestValidatorOptions = {}): Middleware {
  const {
    validation,
    skip = [],
    statusCode = 400,
  } = options;
  
  return async (req, res, next) => {
    const url = new URL(req.url);
    const path = url.pathname;
    
    // 检查是否需要跳过验证
    if (skip.length > 0 && matchesPattern(path, skip)) {
      await next();
      return;
    }
    
    // 获取验证配置
    let config: ValidationConfig | null = null;
    if (validation) {
      if (typeof validation === 'function') {
        config = validation({ url: req.url, method: req.method });
      } else {
        config = validation;
      }
    }
    
    // 如果没有配置，跳过验证
    if (!config) {
      await next();
      return;
    }
    
    const errors: ValidationError[] = [];
    
    // 验证查询参数
    if (config.query && Object.keys(req.query).length > 0) {
      const queryErrors = validateData(req.query as Record<string, unknown>, config.query, config.allowExtra || false);
      errors.push(...queryErrors);
    }
    
    // 验证路径参数
    if (config.params && Object.keys(req.params).length > 0) {
      const paramsErrors = validateData(req.params, config.params, config.allowExtra || false);
      errors.push(...paramsErrors);
    }
    
    // 验证请求体
    if (config.body && req.body && typeof req.body === 'object') {
      const bodyErrors = validateData(req.body as Record<string, unknown>, config.body, config.allowExtra || false);
      errors.push(...bodyErrors);
    }
    
    // 如果有错误，返回错误响应
    if (errors.length > 0) {
      res.status = statusCode;
      
      if (config.formatError) {
        res.json(config.formatError(errors));
      } else {
        res.json({
          error: 'Validation failed',
          message: 'Request validation failed',
          errors,
        });
      }
      return;
    }
    
    // 验证通过，继续处理
    await next();
  };
}

