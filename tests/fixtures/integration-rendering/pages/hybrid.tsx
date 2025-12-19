
import { h } from 'preact';
import type { PageProps } from '../../../../src/types/index.ts';

// 明确指定 Hybrid 模式
export const renderMode = 'hybrid';

export default function HybridPage({ params, query }: PageProps) {
  return (
    <div>
      <h1>Hybrid Page</h1>
      <p>This is a hybrid rendered page (SSR + Hydration)</p>
    </div>
  );
}
