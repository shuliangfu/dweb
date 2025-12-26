/**
 * 安全的 Preact Hooks 包装器
 * 确保在 SSR 和客户端环境下都能正常工作
 * 
 * 这些 hooks 会直接使用 preact/hooks，确保与 preact-render-to-string 使用相同的 hooks 实例
 * 这样可以避免 hooks 上下文冲突问题
 * 
 * 注意：在 SSR 时，hooks 上下文需要在组件执行前初始化
 * 框架会在渲染前自动初始化 hooks 上下文
 */

// 直接重新导出 preact/hooks，确保使用相同的实例
// 这样在 SSR 时，preact-render-to-string 能够正确访问 hooks 上下文
// 关键：使用与框架相同的 preact 实例，避免多个 Preact 实例导致的 hooks 上下文问题
// 
// 在 SSR 环境中，hooks 上下文需要在组件执行前初始化
// 框架会在 route-handler.ts 中自动初始化 hooks 上下文
// 所以这里直接重新导出即可，不需要额外的包装
export {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useContext,
  useReducer,
  useLayoutEffect,
} from 'preact/hooks';

