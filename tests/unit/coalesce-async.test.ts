/**
 * createCoalescedAsyncRunner：单飞 + 尾随合并
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import { createCoalescedAsyncRunner } from "../../src/utils/coalesce-async.ts";

describe("createCoalescedAsyncRunner", () => {
  it("并发调用应合并为单飞，并尾随再跑一轮", async () => {
    const calls: number[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const run = createCoalescedAsyncRunner(async (n: number) => {
      calls.push(n);
      await gate;
      return n * 10;
    });

    const p1 = run(1);
    const p2 = run(2);
    const p3 = run(3);
    expect(run.isBusy()).toBe(true);
    expect(calls).toEqual([1]);

    release();
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    expect(r1).toBe(10);
    // 尾随使用最后一次参数 3
    expect(r2).toBe(30);
    expect(r3).toBe(30);
    expect(calls).toEqual([1, 3]);
    expect(run.isBusy()).toBe(false);
  });

  it("首轮失败后仍应冲刷尾随调用", async () => {
    const calls: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const run = createCoalescedAsyncRunner(async (label: string) => {
      calls.push(label);
      await gate;
      if (label === "first") throw new Error("boom");
      return label;
    });

    const p1 = run("first");
    const p2 = run("second");
    release();

    let firstErr: unknown;
    try {
      await p1;
    } catch (e) {
      firstErr = e;
    }
    expect(firstErr).toBeInstanceOf(Error);
    expect(await p2).toBe("second");
    expect(calls).toEqual(["first", "second"]);
  });
});
