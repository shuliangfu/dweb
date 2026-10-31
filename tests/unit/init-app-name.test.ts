/**
 * 多应用 init：API / Console 目录名固定，Web 手输时不能占用这两个名字。
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  fixedMultiAppDirName,
  rejectTypedAppName,
  selectableAppKinds,
} from "../../src/cmd/init/helpers.ts";

describe("init multi-app directory names", () => {
  it("fixes api and console, leaves web for the user", () => {
    expect(fixedMultiAppDirName("api")).toBe("api");
    expect(fixedMultiAppDirName("console")).toBe("console");
    expect(fixedMultiAppDirName("web")).toBe(undefined);
  });

  it("drops api and console from the menu once each is taken", () => {
    expect(selectableAppKinds({ api: false, console: false })).toEqual([
      "web",
      "api",
      "console",
    ]);
    expect(selectableAppKinds({ api: true, console: false })).toEqual([
      "web",
      "console",
    ]);
    expect(selectableAppKinds({ api: false, console: true })).toEqual([
      "web",
      "api",
    ]);
    expect(selectableAppKinds({ api: true, console: true })).toEqual(["web"]);
  });

  it("reserves api and console when the user types a web app name", () => {
    expect(rejectTypedAppName("api", [])).toBe("reserved-api");
    expect(rejectTypedAppName("console", [])).toBe("reserved-console");
    expect(rejectTypedAppName("web", ["web"])).toBe("duplicate");
    expect(rejectTypedAppName("frontend", [])).toBe(null);
    expect(rejectTypedAppName("", [])).toBe("empty");
    expect(rejectTypedAppName("-bad", [])).toBe("invalid");
  });
});
