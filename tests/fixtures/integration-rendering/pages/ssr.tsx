
import { h } from 'preact';
import type { PageProps } from '../../../../src/types/index.ts';

export default function SSRPage({ params, query }: PageProps) {
  return (
    <div>
      <h1>SSR Page</h1>
      <p>Params: {JSON.stringify(params)}</p>
      <p>Query: {JSON.stringify(query)}</p>
    </div>
  );
}
