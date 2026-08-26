/**
 * CORS / Socket Origin 装配解析
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  resolveHttpCorsOptions,
  resolveSocketIoCorsOptions,
  shouldWarnOpenCors,
} from "../../src/utils/cors-resolve.ts";

describe("cors-resolve", () => {
  it("resolveHttpCorsOptions: true → {}；对象透传；缺省 undefined", () => {
    expect(resolveHttpCorsOptions(undefined)).toBeUndefined();
    expect(resolveHttpCorsOptions(true)).toEqual({});
    expect(
      resolveHttpCorsOptions({
        origin: ["https://a.example"],
        credentials: true,
      }),
    ).toEqual({ origin: ["https://a.example"], credentials: true });
  });

  it("shouldWarnOpenCors: 仅非 dev 的 cors:true", () => {
    expect(shouldWarnOpenCors(true, false)).toBe(true);
    expect(shouldWarnOpenCors(true, true)).toBe(false);
    expect(shouldWarnOpenCors({ origin: "*" }, false)).toBe(false);
    expect(shouldWarnOpenCors(undefined, false)).toBe(false);
  });

  it("resolveSocketIoCorsOptions: socket.cors 优先", () => {
    expect(
      resolveSocketIoCorsOptions(
        { origin: ["https://app.example"] },
        { origin: ["https://socket.example"] },
        true,
      ),
    ).toEqual({ origin: ["https://socket.example"] });
  });

  it("resolveSocketIoCorsOptions: 桥接 AppConfig.cors.origin", () => {
    expect(
      resolveSocketIoCorsOptions(
        { origin: ["https://app.example"], credentials: true },
        undefined,
        true,
      ),
    ).toEqual({
      origin: ["https://app.example"],
      methods: undefined,
      credentials: true,
    });
  });

  it("resolveSocketIoCorsOptions: 无配置时显式 origin:'*'", () => {
    expect(resolveSocketIoCorsOptions(true, undefined, true)).toEqual({
      origin: "*",
    });
    expect(resolveSocketIoCorsOptions(undefined, undefined, undefined))
      .toEqual({ origin: "*" });
  });

  it("resolveSocketIoCorsOptions: allowCORS:false 不强制注入", () => {
    expect(
      resolveSocketIoCorsOptions(
        { origin: ["https://app.example"] },
        undefined,
        false,
      ),
    ).toBeUndefined();
  });
});
