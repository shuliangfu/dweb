#!/usr/bin/env -S deno run -A
/**
 * 控制台 CLI 示例
 * 演示如何使用 Command 类创建命令行工具
 * 
 * 使用方法：
 *   deno run -A console/cli.ts --help
 *   deno run -A console/cli.ts greet --name "张三" --age 25
 *   deno run -A console/cli.ts calc add 10 20
 *   deno run -A console/cli.ts calc multiply 5 8
 */

import { Command } from "../../src/console/command.ts";
import { success, info, error } from "../../src/console/output.ts";

/**
 * 创建主命令
 */
const cli = new Command("example-cli")
  .info("这是一个示例 CLI 工具，演示 Command 类的使用方法")
  .setVersion("1.0.0")
  .example("deno run -A console/cli.ts greet --name '张三'", "问候用户")
  .example("deno run -A console/cli.ts calc add 10 20", "计算两个数的和");

/**
 * 问候命令
 */
cli
  .command("greet", "问候用户")
  .option({
    name: "name",
    alias: "n",
    description: "用户名",
    requiresValue: true,
    required: true,
  })
  .option({
    name: "age",
    alias: "a",
    description: "年龄",
    type: "number",
    requiresValue: true,
  })
  .option({
    name: "formal",
    alias: "f",
    description: "使用正式称呼",
    type: "boolean",
    defaultValue: false,
  })
  .action((_args, options) => {
    const name = options.name as string;
    const age = options.age as number | undefined;
    const formal = options.formal as boolean;

    if (formal) {
      success(`您好，${name}先生/女士！`);
    } else {
      success(`你好，${name}！`);
    }

    if (age !== undefined) {
      info(`您今年 ${age} 岁`);
    }
  });

/**
 * 计算器命令
 */
const calcCommand = cli
  .command("calc", "计算器工具")
  .info("执行数学运算");

// 加法子命令
calcCommand
  .command("add", "计算两个数的和")
  .argument({
    name: "a",
    description: "第一个数字",
    required: true,
  })
  .argument({
    name: "b",
    description: "第二个数字",
    required: true,
  })
  .action((args, _options) => {
    const a = parseFloat(args[0]);
    const b = parseFloat(args[1]);

    if (isNaN(a) || isNaN(b)) {
      error("参数必须是数字");
      Deno.exit(1);
    }

    const result = a + b;
    success(`${a} + ${b} = ${result}`);
  });

// 乘法子命令
calcCommand
  .command("multiply", "计算两个数的乘积")
  .alias("mul")
  .argument({
    name: "a",
    description: "第一个数字",
    required: true,
  })
  .argument({
    name: "b",
    description: "第二个数字",
    required: true,
  })
  .option({
    name: "round",
    alias: "r",
    description: "结果保留小数位数",
    type: "number",
    requiresValue: true,
    defaultValue: 2,
  })
  .action((args, options) => {
    const a = parseFloat(args[0]);
    const b = parseFloat(args[1]);
    const round = (options.round as number) || 2;

    if (isNaN(a) || isNaN(b)) {
      error("参数必须是数字");
      Deno.exit(1);
    }

    const result = a * b;
    const rounded = result.toFixed(round);
    success(`${a} × ${b} = ${rounded}`);
  });

// 文件操作命令
cli
  .command("file", "文件操作")
  .option({
    name: "path",
    alias: "p",
    description: "文件路径",
    requiresValue: true,
    required: true,
  })
  .option({
    name: "action",
    alias: "a",
    description: "操作类型",
    requiresValue: true,
    choices: ["read", "write", "delete"],
    required: true,
  })
  .before((_args, _options) => {
    info("准备执行文件操作...");
  })
  .after((_args, _options) => {
    success("文件操作完成！");
  })
  .action(async (_args, options) => {
    const path = options.path as string;
    const action = options.action as string;

    switch (action) {
      case "read":
        try {
          const content = await Deno.readTextFile(path);
          info(`文件内容：\n${content}`);
        } catch (err) {
          error(`读取文件失败: ${err instanceof Error ? err.message : String(err)}`);
          Deno.exit(1);
        }
        break;

      case "write":
        info(`写入文件: ${path}`);
        // 这里只是示例，实际写入需要提供内容
        success("文件写入成功（示例）");
        break;

      case "delete":
        try {
          await Deno.remove(path);
          success(`文件删除成功: ${path}`);
        } catch (err) {
          error(`删除文件失败: ${err instanceof Error ? err.message : String(err)}`);
          Deno.exit(1);
        }
        break;
    }
  });

/**
 * 执行命令
 */
if (import.meta.main) {
  await cli.execute();
}

