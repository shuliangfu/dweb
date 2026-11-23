/**
 * doctor：Node / Bun HTTP2Shell 修复线
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import { isRuntimeBrotliPatched } from "../../src/cmd/doctor.ts";

describe("isRuntimeBrotliPatched", () => {
  it("Deno 视为不受该 CVE 影响", () => {
    expect(isRuntimeBrotliPatched("deno", "2.5.0")).toBe(true);
  });

  it("Bun 须 >= 1.4.4", () => {
    expect(isRuntimeBrotliPatched("bun", "1.4.3")).toBe(false);
    expect(isRuntimeBrotliPatched("bun", "1.4.4")).toBe(true);
    expect(isRuntimeBrotliPatched("bun", "1.5.0")).toBe(true);
  });

  it("Node 22/24/26 补丁线及更高主版本", () => {
    expect(isRuntimeBrotliPatched("node", "22.23.3")).toBe(false);
    expect(isRuntimeBrotliPatched("node", "22.23.4")).toBe(true);
    expect(isRuntimeBrotliPatched("node", "24.22.0")).toBe(false);
    expect(isRuntimeBrotliPatched("node", "24.22.1")).toBe(true);
    expect(isRuntimeBrotliPatched("node", "26.12.0")).toBe(false);
    expect(isRuntimeBrotliPatched("node", "26.12.1")).toBe(true);
    expect(isRuntimeBrotliPatched("node", "27.0.0")).toBe(true);
    expect(isRuntimeBrotliPatched("node", "20.19.0")).toBe(false);
  });
});
