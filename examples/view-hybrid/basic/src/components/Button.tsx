/**
 * @module components/Button
 * @description 可复用按钮：供首页计数器、WebSocket 发送等使用，统一样式与 `type="button"`。
 */

/** 预设视觉风格，与首页原 Tailwind 一致 */
export type ButtonVariant = "primary" | "secondary" | "muted";

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "rounded-lg border-0 bg-[#667eea] px-4 py-2 text-sm font-medium text-white shadow-none transition-colors hover:bg-[#5a6fd6]",
  secondary:
    "rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50",
  muted:
    "rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200",
};

/**
 * 按钮展示与交互参数
 */
export interface ButtonProps {
  /** 按钮文案 */
  label: string;
  /** 可选：点击回调 */
  onClick?: () => void;
  /** 视觉变体，默认 primary */
  variant?: ButtonVariant;
  /** 追加到按钮上的 Tailwind class（可选） */
  class?: string;
  /** 可选：供 e2e 等使用的 data-testid */
  testId?: string;
}

/**
 * 共享 Button 组件
 * @param props 文案、变体与可选 onClick
 * @returns 原生 button 节点
 */
export function Button(props: ButtonProps) {
  const v = props.variant ?? "primary";
  const base = variantClass[v];
  const extra = props.class ? ` ${props.class}` : "";
  return (
    <button
      type="button"
      class={base + extra}
      data-testid={props.testId}
      onClick={() => {
        props.onClick?.();
      }}
    >
      {props.label}
    </button>
  );
}
