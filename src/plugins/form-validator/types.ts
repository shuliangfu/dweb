/**
 * 表单验证插件类型定义
 */

/**
 * 验证规则类型
 */
export type ValidationRule =
  | "required"
  | "email"
  | "url"
  | "number"
  | "min"
  | "max"
  | "minLength"
  | "maxLength"
  | "pattern"
  | "custom";

/**
 * 验证规则配置
 */
export interface ValidationRuleConfig {
  /** 规则类型 */
  type: ValidationRule;
  /** 规则值（用于 min, max, minLength, maxLength, pattern） */
  value?: number | string | RegExp;
  /** 错误消息 */
  message?: string;
  /** 自定义验证函数 */
  validator?: (value: unknown) => boolean | string;
}

/**
 * 字段验证配置
 */
export interface FieldValidation {
  /** 字段名 */
  name: string;
  /** 验证规则列表 */
  rules: ValidationRuleConfig[];
  /** 标签（用于错误消息） */
  label?: string;
}

/**
 * 表单验证配置
 */
export interface FormValidationConfig {
  /** 字段验证配置 */
  fields: FieldValidation[];
  /** 全局错误消息模板 */
  messages?: {
    required?: string;
    email?: string;
    url?: string;
    number?: string;
    min?: string;
    max?: string;
    minLength?: string;
    maxLength?: string;
    pattern?: string;
  };
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否通过验证 */
  valid: boolean;
  /** 错误消息 */
  errors: Record<string, string[]>;
}

/**
 * 表单验证插件选项
 */
export interface FormValidatorPluginOptions {
  /** 是否在客户端注入验证脚本 */
  injectClientScript?: boolean;
  /** 默认验证配置 */
  defaultConfig?: FormValidationConfig;
}
