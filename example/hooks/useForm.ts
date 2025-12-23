/**
 * 表单处理 Hook
 * 提供表单状态管理、验证、提交等功能
 */

import { useState, useCallback } from 'preact/hooks';

/**
 * 表单验证规则
 */
export interface ValidationRule {
  /** 是否必填 */
  required?: boolean;
  /** 最小长度（字符串）或最小值（数字） */
  min?: number;
  /** 最大长度（字符串）或最大值（数字） */
  max?: number;
  /** 正则表达式验证 */
  pattern?: RegExp;
  /** 自定义验证函数，返回错误信息或 null */
  validator?: (value: any) => string | null;
  /** 自定义错误信息 */
  message?: string;
}

/**
 * 表单字段验证规则
 */
export type FormValidationRules<T extends Record<string, any>> = {
  [K in keyof T]?: ValidationRule;
};

/**
 * 表单错误信息
 */
export type FormErrors<T extends Record<string, any>> = {
  [K in keyof T]?: string;
};

/**
 * useForm Hook 返回值
 */
export interface UseFormReturn<T extends Record<string, any>> {
  /** 表单数据 */
  values: T;
  /** 表单错误信息 */
  errors: FormErrors<T>;
  /** 是否正在提交 */
  isSubmitting: boolean;
  /** 是否已提交过 */
  isSubmitted: boolean;
  /** 是否验证通过 */
  isValid: boolean;
  /** 更新字段值 */
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  /** 更新多个字段值 */
  setValues: (values: Partial<T>) => void;
  /** 设置字段错误 */
  setError: <K extends keyof T>(field: K, error: string) => void;
  /** 设置多个字段错误 */
  setErrors: (errors: Partial<FormErrors<T>>) => void;
  /** 清除字段错误 */
  clearError: <K extends keyof T>(field: K) => void;
  /** 清除所有错误 */
  clearErrors: () => void;
  /** 验证单个字段 */
  validateField: <K extends keyof T>(field: K) => boolean;
  /** 验证所有字段 */
  validate: () => boolean;
  /** 重置表单 */
  reset: (values?: Partial<T>) => void;
  /** 提交表单 */
  handleSubmit: (onSubmit: (values: T) => Promise<void> | void) => (e: Event) => Promise<void>;
  /** 获取字段值 */
  getValue: <K extends keyof T>(field: K) => T[K];
}

/**
 * 表单处理 Hook
 * @param initialValues 初始表单值
 * @param validationRules 验证规则（可选）
 * @returns 表单处理对象
 * 
 * @example
 * ```typescript
 * const form = useForm({
 *   username: '',
 *   email: '',
 *   password: ''
 * }, {
 *   username: {
 *     required: true,
 *     min: 3,
 *     max: 20
 *   },
 *   email: {
 *     required: true,
 *     pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
 *     message: '邮箱格式不正确'
 *   },
 *   password: {
 *     required: true,
 *     min: 8
 *   }
 * });
 * 
 * // 在组件中使用
 * <form onSubmit={form.handleSubmit(async (values) => {
 *   console.log('提交数据:', values);
 * })}>
 *   <input
 *     value={form.values.username}
 *     onInput={(e) => form.setValue('username', e.currentTarget.value)}
 *   />
 *   {form.errors.username && <span>{form.errors.username}</span>}
 *   <button type="submit" disabled={form.isSubmitting}>
 *     提交
 *   </button>
 * </form>
 * ```
 */
export function useForm<T extends Record<string, any>>(
  initialValues: T,
  validationRules?: FormValidationRules<T>,
): UseFormReturn<T> {
  // 表单数据
  const [values, setValuesState] = useState<T>(initialValues);
  
  // 表单错误信息
  const [errors, setErrors] = useState<FormErrors<T>>({});
  
  // 是否正在提交
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 是否已提交过
  const [isSubmitted, setIsSubmitted] = useState(false);

  /**
   * 验证单个字段
   */
  const validateField = useCallback(<K extends keyof T>(field: K): boolean => {
    if (!validationRules || !validationRules[field]) {
      return true;
    }

    const rule = validationRules[field]!;
    const value = values[field];

    // 必填验证
    if (rule.required) {
      if (value === null || value === undefined || value === '') {
        const error = rule.message || `${String(field)} 是必填字段`;
        setErrors((prev) => ({ ...prev, [field]: error }));
        return false;
      }
    }

    // 如果值为空且不是必填，跳过其他验证
    if (value === null || value === undefined || value === '') {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
      return true;
    }

    // 类型检查
    const valueType = typeof value;
    const isString = valueType === 'string';
    const isNumber = valueType === 'number';
    const isArray = Array.isArray(value);

    // 长度验证（字符串或数组）
    if (rule.min !== undefined) {
      const length = isString || isArray ? (value as string | any[]).length : (isNumber ? value : 0);
      if (length < rule.min) {
        const error = rule.message || `${String(field)} 长度不能少于 ${rule.min}`;
        setErrors((prev) => ({ ...prev, [field]: error }));
        return false;
      }
    }

    if (rule.max !== undefined) {
      const length = isString || isArray ? (value as string | any[]).length : (isNumber ? value : 0);
      if (length > rule.max) {
        const error = rule.message || `${String(field)} 长度不能超过 ${rule.max}`;
        setErrors((prev) => ({ ...prev, [field]: error }));
        return false;
      }
    }

    // 正则表达式验证
    if (rule.pattern && isString) {
      if (!rule.pattern.test(value as string)) {
        const error = rule.message || `${String(field)} 格式不正确`;
        setErrors((prev) => ({ ...prev, [field]: error }));
        return false;
      }
    }

    // 自定义验证
    if (rule.validator) {
      const error = rule.validator(value);
      if (error) {
        setErrors((prev) => ({ ...prev, [field]: error }));
        return false;
      }
    }

    // 验证通过，清除错误
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });

    return true;
  }, [values, validationRules]);

  /**
   * 验证所有字段
   */
  const validate = useCallback((): boolean => {
    if (!validationRules) {
      return true;
    }

    let isValid = true;

    for (const field in validationRules) {
      const fieldValid = validateField(field);
      if (!fieldValid) {
        isValid = false;
      }
    }

    return isValid;
  }, [validateField, validationRules]);

  /**
   * 更新字段值
   */
  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]): void => {
    setValuesState((prev) => ({ ...prev, [field]: value }));
    
    // 如果已提交过，实时验证
    if (isSubmitted && validationRules?.[field]) {
      validateField(field);
    }
  }, [isSubmitted, validationRules, validateField]);

  /**
   * 更新多个字段值
   */
  const setValues = useCallback((newValues: Partial<T>): void => {
    setValuesState((prev) => ({ ...prev, ...newValues }));
  }, []);

  /**
   * 设置字段错误
   */
  const setError = useCallback(<K extends keyof T>(field: K, error: string): void => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  }, []);

  /**
   * 设置多个字段错误
   */
  const setErrorsCallback = useCallback((newErrors: Partial<FormErrors<T>>): void => {
    setErrors((prev) => ({ ...prev, ...newErrors }));
  }, []);

  /**
   * 清除字段错误
   */
  const clearError = useCallback(<K extends keyof T>(field: K): void => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  /**
   * 清除所有错误
   */
  const clearErrors = useCallback((): void => {
    setErrors({});
  }, []);

  /**
   * 重置表单
   */
  const reset = useCallback((newValues?: Partial<T>): void => {
    setValuesState(newValues ? { ...initialValues, ...newValues } : initialValues);
    setErrors({});
    setIsSubmitting(false);
    setIsSubmitted(false);
  }, [initialValues]);

  /**
   * 获取字段值
   */
  const getValue = useCallback(<K extends keyof T>(field: K): T[K] => {
    return values[field];
  }, [values]);

  /**
   * 提交表单处理函数
   */
  const handleSubmit = useCallback((onSubmit: (values: T) => Promise<void> | void) => {
    return async (e: Event): Promise<void> => {
      e.preventDefault();
      setIsSubmitted(true);

      // 验证表单
      const isValid = validate();
      if (!isValid) {
        return;
      }

      // 提交表单
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } catch (error) {
        // 提交失败，可以设置错误信息
        const errorMessage = error instanceof Error ? error.message : String(error);
        setErrorsCallback({ _submit: errorMessage } as Partial<FormErrors<T>>);
      } finally {
        setIsSubmitting(false);
      }
    };
  }, [values, validate, setErrorsCallback]);

  // 计算是否验证通过
  const isValid = Object.keys(errors).length === 0;

  return {
    values,
    errors,
    isSubmitting,
    isSubmitted,
    isValid,
    setValue,
    setValues,
    setError,
    setErrors: setErrorsCallback,
    clearError,
    clearErrors,
    validateField,
    validate,
    reset,
    handleSubmit,
    getValue,
  };
}

