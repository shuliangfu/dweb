/**
 * planRenderPipeline / ensureClientBuildForRender 轻量单测
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import { planRenderPipeline } from "../../src/core/app-render-pipeline.ts";

describe("planRenderPipeline", () => {
  it("csr/hybrid 应需要 load-data 与 ensureClientBuild", () => {
    expect(planRenderPipeline("csr")).toEqual({
      mode: "csr",
      loadData: true,
      clientScript: true,
      ensureClientBuild: true,
    });
    expect(planRenderPipeline("hybrid")).toEqual({
      mode: "hybrid",
      loadData: true,
      clientScript: true,
      ensureClientBuild: true,
    });
  });

  it("ssg 不应 ensureClientBuild / load-data", () => {
    expect(planRenderPipeline("ssg")).toEqual({
      mode: "ssg",
      loadData: false,
      clientScript: true,
      ensureClientBuild: false,
    });
  });

  it("缺省与未知 mode 应按 ssr", () => {
    expect(planRenderPipeline(undefined).mode).toBe("ssr");
    expect(planRenderPipeline("nope").mode).toBe("ssr");
    expect(planRenderPipeline("ssr")).toEqual({
      mode: "ssr",
      loadData: false,
      clientScript: true,
      ensureClientBuild: true,
    });
  });
});
