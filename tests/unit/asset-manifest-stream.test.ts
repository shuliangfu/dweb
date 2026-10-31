/**
 * asset-manifest 流式替换须与整页 split/join 一致，包括路径被切在两个 chunk 里。
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  applyAssetManifest,
  createAssetPathReplaceTransform,
} from "../../src/utils/asset-manifest.ts";

async function streamReplace(
  html: string,
  manifest: Record<string, string>,
  chunkSize: number,
): Promise<string> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(html);
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += chunkSize) {
        controller.enqueue(bytes.subarray(i, i + chunkSize));
      }
      controller.close();
    },
  });
  const out = source.pipeThrough(createAssetPathReplaceTransform(manifest));
  const reader = out.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(merged);
}

describe("applyAssetManifest stream", () => {
  const manifest = {
    "/assets/app.js": "/assets/app-ABCD12.js",
    "/assets/app.css": "/assets/app-EF3456.css",
  };
  const html =
    `<link href="/assets/app.css"><script src="/assets/app.js"></script>`;

  it("整页替换与流式替换一致，且路径可被 1 字节切开", async () => {
    const expected = applyAssetManifest(html, manifest);
    expect(expected).toBe(
      `<link href="/assets/app-EF3456.css"><script src="/assets/app-ABCD12.js"></script>`,
    );
    expect(await streamReplace(html, manifest, 1)).toBe(expected);
    expect(await streamReplace(html, manifest, 3)).toBe(expected);
    expect(await streamReplace(html, manifest, 64)).toBe(expected);
  });

  it("空 manifest 原样通过", async () => {
    expect(await streamReplace(html, {}, 2)).toBe(html);
  });
});
