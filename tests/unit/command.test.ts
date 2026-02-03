/**
 * CLI 命令模块测试
 *
 * 测试 src/feature/command.ts 的功能：
 * - Command 类构造函数
 * - Command.initApp() 初始化 App 实例
 * - Command.app 获取 App 实例
 * - Command.container 获取服务容器
 * - Command.action() 设置命令处理函数
 * - Command.command() 创建子命令
 * - 重导出的 API
 *
 * 注意：测试输出文件存放在 tests/data 目录下
 */

import { describe, expect, it } from "@dreamer/test";
import {
  clearLine,
  clearScreen,
  colorize,
  colors,
  Command,
  confirm,
  error,
  hideCursor,
  info,
  input,
  keyValue,
  keyValuePairs,
  keyValueTable,
  list,
  moveCursor,
  numberedList,
  progressBar,
  select,
  separator,
  shouldUseColor,
  showCursor,
  stripAnsiCodes,
  success,
  table,
  title,
  warning,
} from "../../src/feature/command.ts";

describe("CLI 命令模块 (command.ts)", () => {
  describe("Command 类构造函数", () => {
    it("应该创建 Command 实例", () => {
      const cmd = new Command("test");

      expect(cmd).toBeDefined();
      expect(cmd).toBeInstanceOf(Command);
    });

    it("应该使用名称和描述创建 Command 实例", () => {
      const cmd = new Command("test", "测试命令");

      expect(cmd).toBeDefined();
      expect(cmd).toBeInstanceOf(Command);
    });

    it("应该创建服务容器", () => {
      const cmd = new Command("test");

      expect(cmd.container).toBeDefined();
      expect(typeof cmd.container.get).toBe("function");
    });

    it("每个 Command 实例应该有独立的服务容器", () => {
      const cmd1 = new Command("test1");
      const cmd2 = new Command("test2");

      expect(cmd1.container).not.toBe(cmd2.container);
    });
  });

  describe("Command.app 属性", () => {
    it("未初始化时访问 app 应该抛出错误", () => {
      const cmd = new Command("test");

      expect(() => cmd.app).toThrow("App 实例未初始化");
    });
  });

  describe("Command.container 属性", () => {
    it("应该返回服务容器", () => {
      const cmd = new Command("test");
      const container = cmd.container;

      expect(container).toBeDefined();
      expect(typeof container.get).toBe("function");
      expect(typeof container.registerSingleton).toBe("function");
    });

    it("可以注册和获取服务", () => {
      const cmd = new Command("test");
      const container = cmd.container;

      container.registerSingleton("testService", () => ({ value: 42 }));
      const service = container.get<{ value: number }>("testService");

      expect(service.value).toBe(42);
    });
  });

  describe("Command.action()", () => {
    it("应该设置命令处理函数", () => {
      const cmd = new Command("test");

      const result = cmd.action(async () => {
        // 命令处理函数
      });

      expect(result).toBe(cmd);
    });

    it("应该支持链式调用", () => {
      const cmd = new Command("test")
        .action(async () => {})
        .info("测试命令");

      expect(cmd).toBeDefined();
    });

    it("应该设置命令处理函数并返回自身", () => {
      const cmd = new Command("test");

      // action 方法应该返回 Command 实例以支持链式调用
      const result = cmd.action((args, options) => {
        // 命令处理逻辑
        console.log(args, options);
      });

      expect(result).toBe(cmd);
      expect(result).toBeInstanceOf(Command);
    });
  });

  describe("Command.command() 子命令", () => {
    it("应该创建子命令", () => {
      const cmd = new Command("parent");
      const subCmd = cmd.command("child", "子命令");

      expect(subCmd).toBeDefined();
      expect(subCmd).toBeInstanceOf(Command);
    });

    it("子命令应该是扩展的 Command 类型", () => {
      const cmd = new Command("parent");
      const subCmd = cmd.command("child");

      // 子命令应该有 container 属性
      expect(subCmd.container).toBeDefined();
    });

    it("应该支持多级子命令", () => {
      const cmd = new Command("root");
      const level1 = cmd.command("level1");
      const level2 = level1.command("level2");

      expect(level2).toBeInstanceOf(Command);
    });
  });

  describe("Command 选项和参数", () => {
    it("应该支持选项定义", () => {
      const cmd = new Command("test")
        .option({
          name: "verbose",
          alias: "v",
          description: "显示详细信息",
        })
        .option({
          name: "output",
          alias: "o",
          description: "输出路径",
          type: "string",
        });

      expect(cmd).toBeDefined();
    });

    it("应该支持参数定义", () => {
      const cmd = new Command("test")
        .argument({ name: "input", description: "输入文件", required: true })
        .argument({ name: "output", description: "输出文件", required: false });

      expect(cmd).toBeDefined();
    });

    it("应该支持选项链式定义", () => {
      const cmd = new Command("test")
        .option({
          name: "verbose",
          alias: "v",
          description: "显示详细信息",
        })
        .option({
          name: "output",
          alias: "o",
          description: "输出路径",
          type: "string",
        })
        .action((_args, _options) => {
          // 处理逻辑
        });

      // 应该能成功定义选项并返回 Command 实例
      expect(cmd).toBeDefined();
      expect(cmd).toBeInstanceOf(Command);
    });
  });

  describe("重导出的 API", () => {
    describe("ANSI 颜色和样式", () => {
      it("应该导出 colorize 函数", () => {
        expect(typeof colorize).toBe("function");
      });

      it("应该导出 colors 对象", () => {
        expect(colors).toBeDefined();
        // colors 对象包含 ANSI 颜色码字符串
        expect(typeof colors.red).toBe("string");
        expect(typeof colors.green).toBe("string");
        expect(typeof colors.blue).toBe("string");
      });

      it("应该导出 stripAnsiCodes 函数", () => {
        expect(typeof stripAnsiCodes).toBe("function");
      });

      it("应该导出 shouldUseColor 函数", () => {
        expect(typeof shouldUseColor).toBe("function");
      });
    });

    describe("光标控制", () => {
      it("应该导出 clearLine 函数", () => {
        expect(typeof clearLine).toBe("function");
      });

      it("应该导出 clearScreen 函数", () => {
        expect(typeof clearScreen).toBe("function");
      });

      it("应该导出 moveCursor 函数", () => {
        expect(typeof moveCursor).toBe("function");
      });

      it("应该导出 hideCursor 函数", () => {
        expect(typeof hideCursor).toBe("function");
      });

      it("应该导出 showCursor 函数", () => {
        expect(typeof showCursor).toBe("function");
      });
    });

    describe("输出格式化", () => {
      it("应该导出 success 函数", () => {
        expect(typeof success).toBe("function");
      });

      it("应该导出 error 函数", () => {
        expect(typeof error).toBe("function");
      });

      it("应该导出 warning 函数", () => {
        expect(typeof warning).toBe("function");
      });

      it("应该导出 info 函数", () => {
        expect(typeof info).toBe("function");
      });

      it("应该导出 title 函数", () => {
        expect(typeof title).toBe("function");
      });

      it("应该导出 separator 函数", () => {
        expect(typeof separator).toBe("function");
      });

      it("应该导出 list 函数", () => {
        expect(typeof list).toBe("function");
      });

      it("应该导出 numberedList 函数", () => {
        expect(typeof numberedList).toBe("function");
      });

      it("应该导出 keyValue 函数", () => {
        expect(typeof keyValue).toBe("function");
      });

      it("应该导出 keyValuePairs 函数", () => {
        expect(typeof keyValuePairs).toBe("function");
      });
    });

    describe("表格显示", () => {
      it("应该导出 table 函数", () => {
        expect(typeof table).toBe("function");
      });

      it("应该导出 keyValueTable 函数", () => {
        expect(typeof keyValueTable).toBe("function");
      });

      it("应该导出 progressBar 函数", () => {
        expect(typeof progressBar).toBe("function");
      });
    });

    describe("用户交互", () => {
      it("应该导出 input 函数", () => {
        expect(typeof input).toBe("function");
      });

      it("应该导出 select 函数", () => {
        expect(typeof select).toBe("function");
      });

      it("应该导出 confirm 函数", () => {
        expect(typeof confirm).toBe("function");
      });
    });
  });
});
