/**
 * 路由字符串解析测试
 *
 * 测试 src/utils/route.ts 的 parseRoutePath。
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import { parseRoutePath } from "../../src/utils/route.ts";

describe("parseRoutePath (route.ts)", () => {
  it("无 query 时 pathname 原样返回、search 为空串", () => {
    expect(parseRoutePath("/about")).toEqual({
      pathname: "/about",
      search: "",
    });
  });

  it("带 query 时应拆出 pathname 与含问号的 search", () => {
    expect(parseRoutePath("/user?id=1")).toEqual({
      pathname: "/user",
      search: "?id=1",
    });
  });

  it("多个问号时只按第一个拆分", () => {
    expect(parseRoutePath("/q?a=1?b=2")).toEqual({
      pathname: "/q",
      search: "?a=1?b=2",
    });
  });

  it("问号在开头时 pathname 为空", () => {
    expect(parseRoutePath("?x=1")).toEqual({
      pathname: "",
      search: "?x=1",
    });
  });
});
