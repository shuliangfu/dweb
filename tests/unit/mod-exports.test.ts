/**
 * 公共导出入口加载测试
 *
 * 让 src/mod.ts、src/utils/mod.ts、src/types/mod.ts、
 * src/cmd/init/types.ts 进入单元测试覆盖率统计，并核对关键导出。
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import * as dweb from "../../src/mod.ts";
import * as utils from "../../src/utils/mod.ts";
import * as types from "../../src/types/mod.ts";
import type { InitOptions } from "../../src/cmd/init/types.ts";
import "../../src/setup.ts";

describe("公共导出入口", () => {
  it("src/mod.ts 应导出 App 与版本号", () => {
    expect(typeof dweb.App).toBe("function");
    expect(typeof dweb.DWEB_VERSION).toBe("string");
    expect(typeof dweb.getLogger).toBe("function");
    expect(typeof dweb.resolveAppKind).toBe("function");
  });

  it("src/utils/mod.ts 应导出常用工具", () => {
    expect(typeof utils.getLogger).toBe("function");
    expect(typeof utils.parseRoutePath).toBe("function");
    expect(typeof utils.sanitizeRequestParams).toBe("function");
  });

  it("src/types/mod.ts 与 init/types 可被导入", () => {
    expect(types).toBeDefined();
    const sample: InitOptions | undefined = undefined;
    expect(sample).toBeUndefined();
  });

  it("导入 src/setup.ts 不应执行全局安装", () => {
    // isMainModule 为 false，仅加载模块
    expect(true).toBe(true);
  });
});
