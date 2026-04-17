/**
 * 路由上下文模块测试
 *
 * 测试 src/types/context.ts：
 * - parseCookies 解析 Cookie 头
 * - createLoadContext 构建 LoadContext
 * - createMetaContext 构建 MetaContext
 * - createServerResponse 及 redirect/json/html/text/binary/body/status
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  createLoadContext,
  createMetaContext,
  createServerResponse,
  parseCookies,
} from "../../src/types/context.ts";

describe("context.ts", () => {
  describe("parseCookies()", () => {
    it("无 Cookie 头时返回空对象", () => {
      const req = new Request("https://example.com/", {
        headers: {},
      });
      expect(parseCookies(req)).toEqual({});
    });

    it("Cookie 头为空字符串时返回空对象", () => {
      const req = new Request("https://example.com/", {
        headers: { Cookie: "" },
      });
      expect(parseCookies(req)).toEqual({});
    });

    it("解析单个 cookie", () => {
      const req = new Request("https://example.com/", {
        headers: { Cookie: "foo=bar" },
      });
      expect(parseCookies(req)).toEqual({ foo: "bar" });
    });

    it("解析多个 cookie（分号分隔）", () => {
      const req = new Request("https://example.com/", {
        headers: { Cookie: "a=1; b=2; c=three" },
      });
      expect(parseCookies(req)).toEqual({ a: "1", b: "2", c: "three" });
    });

    it("重复键时保留最后一个值", () => {
      const req = new Request("https://example.com/", {
        headers: { Cookie: "x=1; x=2" },
      });
      expect(parseCookies(req)).toEqual({ x: "2" });
    });

    it("去除 name 与 value 首尾空格", () => {
      const req = new Request("https://example.com/", {
        headers: { Cookie: "  name = value  " },
      });
      expect(parseCookies(req)).toEqual({ name: "value" });
    });

    it("无等号或等号在首位时跳过该段", () => {
      const req = new Request("https://example.com/", {
        headers: { Cookie: "a=1; invalid; b=2" },
      });
      expect(parseCookies(req)).toEqual({ a: "1", b: "2" });
    });
  });

  describe("createMetaContext()", () => {
    it("返回包含 url、params、query 的对象", () => {
      const ctx = createMetaContext({
        url: "/about",
        params: { id: "123" },
        query: { q: "hello" },
      });
      expect(ctx).toEqual({
        url: "/about",
        params: { id: "123" },
        query: { q: "hello" },
      });
    });
  });

  describe("createLoadContext()", () => {
    it("从 req 填充 method、headers、cookies 并包含 url/params/query", () => {
      const req = new Request("https://example.com/path?k=v", {
        method: "GET",
        headers: { Cookie: "sid=abc" },
      });
      const ctx = createLoadContext({
        req,
        url: "/path?k=v",
        params: {},
        query: { k: "v" },
      });
      expect(ctx.url).toBe("/path?k=v");
      expect(ctx.params).toEqual({});
      expect(ctx.query).toEqual({ k: "v" });
      expect(ctx.req).toBe(req);
      expect(ctx.method).toBe("GET");
      expect(ctx.cookies).toEqual({ sid: "abc" });
      expect(ctx.headers).toBe(req.headers);
      expect(ctx.session).toBeUndefined();
      expect(ctx.res).toBeUndefined();
    });

    it("可注入可选的 session 与 res", () => {
      const req = new Request("https://example.com/");
      const resp = createServerResponse();
      const session = { userId: "u1" } as { userId: string };
      const ctx = createLoadContext({
        req,
        url: "/",
        params: { id: "x" },
        query: {},
        session,
        res: resp,
      });
      expect(ctx.session).toBe(session);
      expect(ctx.res).toBe(resp);
      expect(ctx.params).toEqual({ id: "x" });
    });
  });

  describe("createServerResponse()", () => {
    const res = createServerResponse();

    describe("redirect()", () => {
      it("默认返回 302 且 Location 为给定 url", () => {
        const r = res.redirect("/login");
        expect(r.status).toBe(302);
        expect(r.headers.get("Location")).toBe("/login");
      });

      it("可指定 status（如 301）", () => {
        const r = res.redirect("/moved", 301);
        expect(r.status).toBe(301);
        expect(r.headers.get("Location")).toBe("/moved");
      });
    });

    describe("json()", () => {
      it("返回 application/json 且 body 为 JSON 字符串", async () => {
        const r = res.json({ a: 1 });
        expect(r.headers.get("Content-Type")).toContain("application/json");
        expect(await r.json()).toEqual({ a: 1 });
      });
    });

    describe("html()", () => {
      it("返回 text/html 且 body 为给定字符串", async () => {
        const r = res.html("<p>hi</p>");
        expect(r.headers.get("Content-Type")).toContain("text/html");
        expect(await r.text()).toBe("<p>hi</p>");
      });
    });

    describe("text()", () => {
      it("返回 text/plain 且 body 为给定字符串", async () => {
        const r = res.text("plain");
        expect(r.headers.get("Content-Type")).toContain("text/plain");
        expect(await r.text()).toBe("plain");
      });
    });

    describe("binary()", () => {
      it("返回 application/octet-stream 且 body 为 Uint8Array", async () => {
        const data = new Uint8Array([1, 2, 3]);
        const r = res.binary(data);
        expect(r.headers.get("Content-Type")).toBe(
          "application/octet-stream",
        );
        const buf = await r.arrayBuffer();
        expect(new Uint8Array(buf)).toEqual(data);
      });

      it("接受 ArrayBuffer", async () => {
        const data = new ArrayBuffer(2);
        new Uint8Array(data).set([4, 5]);
        const r = res.binary(data);
        const buf = await r.arrayBuffer();
        expect(new Uint8Array(buf)).toEqual(new Uint8Array([4, 5]));
      });
    });

    describe("body()", () => {
      it("返回任意 body 与 init 的 Response", async () => {
        const r = res.body("custom", { status: 201 });
        expect(r.status).toBe(201);
        expect(await r.text()).toBe("custom");
      });
    });

    describe("status()", () => {
      it("仅设置状态码，无 body", () => {
        const r = res.status(204);
        expect(r.status).toBe(204);
        expect(r.body).toBeNull();
      });

      it("可指定 statusText", () => {
        const r = res.status(404, "Not Found");
        expect(r.status).toBe(404);
        expect(r.statusText).toBe("Not Found");
      });
    });
  });
});
