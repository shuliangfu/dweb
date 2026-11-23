/**
 * 配置合并：拒绝原型污染键
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  deepMergeConfig,
  deepMergeParams,
} from "../../src/core/config-merge.ts";

describe("config merge prototype safety", () => {
  it("deepMergeConfig 忽略 __proto__ / constructor / prototype", () => {
    const polluted = JSON.parse('{"__proto__": {"polluted": true}, "port": 9}');
    const result = deepMergeConfig({ port: 1 } as never, polluted);
    expect((result as { port?: number }).port).toBe(9);
    expect(Object.prototype.hasOwnProperty.call(result, "__proto__")).toBe(
      false,
    );
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it("deepMergeParams 忽略危险键", () => {
    const source = JSON.parse(
      '{"__proto__": {"polluted": true}, "ok": 1, "constructor": {"x": 1}}',
    ) as Record<string, unknown>;
    const result = deepMergeParams({ keep: true }, source);
    expect(result.ok).toBe(1);
    expect(result.keep).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(result, "__proto__")).toBe(
      false,
    );
    expect(Object.prototype.hasOwnProperty.call(result, "constructor")).toBe(
      false,
    );
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });
});
