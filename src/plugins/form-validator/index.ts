/**
 * 表单验证插件
 * 提供客户端和服务端表单验证功能
 */

import type { Plugin, Request, Response } from "../../common/types/index.ts";
import type {
  FormValidatorPluginOptions,
  ValidationResult,
  ValidationRuleConfig,
} from "./types.ts";

/**
 * 验证单个值
 */
function validateValue(
  value: unknown,
  rules: ValidationRuleConfig[],
  messages?: Record<string, string>,
): string[] {
  const errors: string[] = [];

  for (const rule of rules) {
    let isValid = true;
    let errorMessage = rule.message;

    switch (rule.type) {
      case "required":
        if (value === null || value === undefined || value === "") {
          isValid = false;
          errorMessage = errorMessage || messages?.required || "此字段为必填项";
        }
        break;

      case "email":
        if (value && typeof value === "string") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            isValid = false;
            errorMessage = errorMessage || messages?.email ||
              "请输入有效的邮箱地址";
          }
        }
        break;

      case "url":
        if (value && typeof value === "string") {
          try {
            new URL(value);
          } catch {
            isValid = false;
            errorMessage = errorMessage || messages?.url || "请输入有效的 URL";
          }
        }
        break;

      case "number":
        if (value !== null && value !== undefined && value !== "") {
          if (isNaN(Number(value))) {
            isValid = false;
            errorMessage = errorMessage || messages?.number ||
              "请输入有效的数字";
          }
        }
        break;

      case "min":
        if (value !== null && value !== undefined && value !== "") {
          const num = Number(value);
          const min = typeof rule.value === "number"
            ? rule.value
            : Number(rule.value);
          if (isNaN(num) || num < min) {
            isValid = false;
            errorMessage = errorMessage || messages?.min || `值不能小于 ${min}`;
          }
        }
        break;

      case "max":
        if (value !== null && value !== undefined && value !== "") {
          const num = Number(value);
          const max = typeof rule.value === "number"
            ? rule.value
            : Number(rule.value);
          if (isNaN(num) || num > max) {
            isValid = false;
            errorMessage = errorMessage || messages?.max || `值不能大于 ${max}`;
          }
        }
        break;

      case "minLength":
        if (value && typeof value === "string") {
          const minLen = typeof rule.value === "number"
            ? rule.value
            : Number(rule.value);
          if (value.length < minLen) {
            isValid = false;
            errorMessage = errorMessage || messages?.minLength ||
              `长度不能少于 ${minLen} 个字符`;
          }
        }
        break;

      case "maxLength":
        if (value && typeof value === "string") {
          const maxLen = typeof rule.value === "number"
            ? rule.value
            : Number(rule.value);
          if (value.length > maxLen) {
            isValid = false;
            errorMessage = errorMessage || messages?.maxLength ||
              `长度不能超过 ${maxLen} 个字符`;
          }
        }
        break;

      case "pattern":
        if (value && typeof value === "string") {
          const pattern = rule.value instanceof RegExp
            ? rule.value
            : new RegExp(rule.value as string);
          if (!pattern.test(value)) {
            isValid = false;
            errorMessage = errorMessage || messages?.pattern || "格式不正确";
          }
        }
        break;

      case "custom":
        if (rule.validator) {
          const result = rule.validator(value);
          if (result !== true) {
            isValid = false;
            errorMessage = typeof result === "string"
              ? result
              : (errorMessage || "验证失败");
          }
        }
        break;
    }

    if (!isValid && errorMessage) {
      errors.push(errorMessage);
    }
  }

  return errors;
}

/**
 * 验证表单数据
 */
export function validateForm(
  data: Record<string, unknown>,
  fields: Array<{ name: string; rules: ValidationRuleConfig[] }>,
  messages?: Record<string, string>,
): ValidationResult {
  const errors: Record<string, string[]> = {};
  let valid = true;

  for (const field of fields) {
    const value = data[field.name];
    const fieldErrors = validateValue(value, field.rules, messages);

    if (fieldErrors.length > 0) {
      errors[field.name] = fieldErrors;
      valid = false;
    }
  }

  return { valid, errors };
}

/**
 * 生成客户端验证脚本
 */
function generateClientScript(): string {
  return `
    <script>
      (function() {
        // 表单验证工具
        window.FormValidator = {
          validate: function(data, fields, messages) {
            const errors = {};
            let valid = true;
            
            for (const field of fields) {
              const value = data[field.name];
              const fieldErrors = [];
              
              for (const rule of field.rules) {
                let isValid = true;
                let errorMessage = rule.message;
                
                switch (rule.type) {
                  case 'required':
                    if (value === null || value === undefined || value === '') {
                      isValid = false;
                      errorMessage = errorMessage || messages?.required || '此字段为必填项';
                    }
                    break;
                  case 'email':
                    if (value && typeof value === 'string') {
                      const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
                      if (!emailRegex.test(value)) {
                        isValid = false;
                        errorMessage = errorMessage || messages?.email || '请输入有效的邮箱地址';
                      }
                    }
                    break;
                  case 'number':
                    if (value !== null && value !== undefined && value !== '') {
                      if (isNaN(Number(value))) {
                        isValid = false;
                        errorMessage = errorMessage || messages?.number || '请输入有效的数字';
                      }
                    }
                    break;
                  case 'minLength':
                    if (value && typeof value === 'string') {
                      const minLen = typeof rule.value === 'number' ? rule.value : Number(rule.value);
                      if (value.length < minLen) {
                        isValid = false;
                        errorMessage = errorMessage || messages?.minLength || '长度不能少于 ' + minLen + ' 个字符';
                      }
                    }
                    break;
                  case 'maxLength':
                    if (value && typeof value === 'string') {
                      const maxLen = typeof rule.value === 'number' ? rule.value : Number(rule.value);
                      if (value.length > maxLen) {
                        isValid = false;
                        errorMessage = errorMessage || messages?.maxLength || '长度不能超过 ' + maxLen + ' 个字符';
                      }
                    }
                    break;
                  case 'pattern':
                    if (value && typeof value === 'string') {
                      const pattern = rule.value instanceof RegExp ? rule.value : new RegExp(rule.value);
                      if (!pattern.test(value)) {
                        isValid = false;
                        errorMessage = errorMessage || messages?.pattern || '格式不正确';
                      }
                    }
                    break;
                }
                
                if (!isValid && errorMessage) {
                  fieldErrors.push(errorMessage);
                }
              }
              
              if (fieldErrors.length > 0) {
                errors[field.name] = fieldErrors;
                valid = false;
              }
            }
            
            return { valid, errors };
          }
        };
      })();
    </script>
  `;
}

/**
 * 创建表单验证插件
 */
export function formValidator(
  options: FormValidatorPluginOptions = {},
): Plugin {
  return {
    name: "form-validator",
    config: options as unknown as Record<string, unknown>,

    /**
     * 请求处理钩子 - 注入客户端验证脚本
     */
    onRequest(_req: Request, res: Response) {
      // 只处理 HTML 响应
      if (!res.body || typeof res.body !== "string") {
        return;
      }

      const contentType = res.headers.get("Content-Type") || "";
      if (!contentType.includes("text/html")) {
        return;
      }

      if (options.injectClientScript !== false) {
        try {
          const html = res.body as string;

          // 注入验证脚本（在 </head> 之前）
          if (html.includes("</head>")) {
            const script = generateClientScript();
            res.body = html.replace("</head>", `${script}\n</head>`);
          }
        } catch (error) {
          console.error("[Form Validator Plugin] 注入验证脚本时出错:", error);
        }
      }
    },
  };
}

// 导出类型和函数
export type {
  FieldValidation,
  FormValidationConfig,
  FormValidatorPluginOptions,
  ValidationResult,
  ValidationRuleConfig,
} from "./types.ts";
export { validateValue };
