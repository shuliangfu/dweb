#!/usr/bin/env -S deno run -A
/**
 * 控制台 CLI 示例
 * 演示如何使用 Command 类创建命令行工具，包括数据库操作
 *
 * 使用方法：
 *   deno run -A console/cli.ts --help
 *   deno run -A console/cli.ts greet --name "张三" --age 25
 *   deno run -A console/cli.ts calc add 10 20
 *   deno run -A console/cli.ts calc multiply 5 8
 *   deno run -A console/cli.ts db create-user -u "testuser" -e "test@example.com" -p "password123"
 *   deno run -A console/cli.ts db list-users --limit 5
 *   deno run -A console/cli.ts db find-user -e "test@example.com"
 *   deno run -A console/cli.ts db count-users
 *
 * 注意：使用数据库命令前，请确保在 dweb.config.ts 中配置了数据库连接信息
 * Command 类会自动处理数据库连接，配置了就连接，没配置就不连接
 */

import { Command } from "@dreamer/dweb/console";
import { error, info, success, warning } from "@dreamer/dweb/console";
import { User } from "../models/User.ts";

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
  .action((_args: string[], options: Record<string, unknown>) => {
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
  .action((args: string[], _options: Record<string, unknown>) => {
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
  .action((args: string[], options: Record<string, unknown>) => {
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
  .before((_args: string[], _options: Record<string, unknown>) => {
    info("准备执行文件操作...");
  })
  .after((_args: string[], _options: Record<string, unknown>) => {
    success("文件操作完成！");
  })
  .action(async (_args: string[], options: Record<string, unknown>) => {
    const path = options.path as string;
    const action = options.action as string;

    switch (action) {
      case "read":
        try {
          const content = await Deno.readTextFile(path);
          info(`文件内容：\n${content}`);
        } catch (err) {
          error(
            `读取文件失败: ${err instanceof Error ? err.message : String(err)}`,
          );
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
          error(
            `删除文件失败: ${err instanceof Error ? err.message : String(err)}`,
          );
          Deno.exit(1);
        }
        break;
    }
  });

/**
 * 初始化用户模型（如果数据库已连接）
 * Command 类会在执行前自动初始化数据库（如果配置了数据库）
 * 通过 command 参数可以访问 getDatabase() 方法
 */
async function initUserModel(command: Command): Promise<void> {
  const db = await command.getDatabase();
  if (db) {
    // 数据库已连接，初始化模型
    await User.init();
  } else {
    // 数据库未配置
    throw new Error(
      "数据库未配置。请在 dweb.config.ts 中配置 database 连接信息",
    );
  }
}

/**
 * 数据库操作命令
 */
const dbCommand = cli
  .command("db", "数据库操作")
  .info("执行数据库相关操作");

// 创建用户命令
dbCommand
  .command("create-user", "创建新用户")
  .option({
    name: "username",
    alias: "u",
    description: "用户名",
    requiresValue: true,
    required: true,
  })
  .option({
    name: "email",
    alias: "e",
    description: "邮箱地址",
    requiresValue: true,
    required: true,
  })
  .option({
    name: "password",
    alias: "p",
    description: "密码",
    requiresValue: true,
    required: true,
  })
  .option({
    name: "nickname",
    alias: "n",
    description: "昵称",
    requiresValue: true,
  })
  .option({
    name: "age",
    alias: "a",
    description: "年龄",
    type: "number",
    requiresValue: true,
  })
  .action(async (_args: string[], options: Record<string, unknown>, command?: Command) => {
    if (!command) {
      error("无法获取 Command 实例");
      Deno.exit(1);
    }
    await initUserModel(command);

    const username = options.username as string;
    const email = options.email as string;
    const password = options.password as string;
    const nickname = options.nickname as string | undefined;
    const age = options.age as number | undefined;

    try {
      const user = await User.create({
        username,
        email,
        password,
        nickname: nickname || null,
        age: age || null,
        status: "active",
        roles: ["user"],
      });

      success(`用户创建成功！`);
      info(`用户 ID: ${user._id}`);
      info(`用户名: ${user.username}`);
      info(`邮箱: ${user.email}`);
      if (user.nickname) {
        info(`昵称: ${user.nickname}`);
      }
      if (user.age) {
        info(`年龄: ${user.age}`);
      }
    } catch (err) {
      error(
        `创建用户失败: ${err instanceof Error ? err.message : String(err)}`,
      );
      Deno.exit(1);
    }
  });

// 查询用户命令
dbCommand
  .command("list-users", "列出所有用户")
  .option({
    name: "limit",
    alias: "l",
    description: "限制返回数量",
    type: "number",
    requiresValue: true,
    defaultValue: 10,
  })
  .option({
    name: "status",
    alias: "s",
    description: "用户状态过滤",
    requiresValue: true,
    choices: ["active", "inactive", "suspended"],
  })
  .action(async (_args: string[], options: Record<string, unknown>, command?: Command) => {
    if (!command) {
      error("无法获取 Command 实例");
      Deno.exit(1);
    }
    await initUserModel(command);

    const limit = (options.limit as number) || 10;
    const status = options.status as string | undefined;

    try {
      const condition: Record<string, unknown> = {};
      if (status) {
        condition.status = status;
      }

      const users = await User.findAll(condition);
      const limitedUsers = users.slice(0, limit);

      if (limitedUsers.length === 0) {
        warning("没有找到用户");
        return;
      }

      success(`找到 ${limitedUsers.length} 个用户：`);
      console.log("");

      for (const user of limitedUsers) {
        info(`用户 ID: ${user._id}`);
        info(`  用户名: ${user.username}`);
        info(`  邮箱: ${user.email}`);
        if (user.nickname) {
          info(`  昵称: ${user.nickname}`);
        }
        if (user.age) {
          info(`  年龄: ${user.age}`);
        }
        info(`  状态: ${user.status}`);
        info(`  创建时间: ${user.createdAt}`);
        console.log("");
      }
    } catch (err) {
      error(
        `查询用户失败: ${err instanceof Error ? err.message : String(err)}`,
      );
      Deno.exit(1);
    }
  });

// 根据邮箱查找用户命令
dbCommand
  .command("find-user", "根据邮箱查找用户")
  .option({
    name: "email",
    alias: "e",
    description: "邮箱地址",
    requiresValue: true,
    required: true,
  })
  .action(async (_args: string[], options: Record<string, unknown>, command?: Command) => {
    if (!command) {
      error("无法获取 Command 实例");
      Deno.exit(1);
    }
    await initUserModel(command);

    const email = options.email as string;

    try {
      const user = await User.findByEmail(email);

      if (!user) {
        warning(`未找到邮箱为 ${email} 的用户`);
        return;
      }

      success(`找到用户：`);
      info(`用户 ID: ${user._id}`);
      info(`用户名: ${user.username}`);
      info(`邮箱: ${user.email}`);
      if (user.nickname) {
        info(`昵称: ${user.nickname}`);
      }
      if (user.age) {
        info(`年龄: ${user.age}`);
      }
      info(`状态: ${user.status}`);
      info(`创建时间: ${user.createdAt}`);
    } catch (err) {
      error(
        `查找用户失败: ${err instanceof Error ? err.message : String(err)}`,
      );
      Deno.exit(1);
    }
  });

// 统计用户数量命令
dbCommand
  .command("count-users", "统计用户数量")
  .action(async (_args: string[], _options: Record<string, unknown>, command?: Command) => {
    if (!command) {
      error("无法获取 Command 实例");
      Deno.exit(1);
    }
    await initUserModel(command);

    try {
      const allUsers = await User.findAll({});
      const activeUsers = await User.findAll({ status: "active" });
      const inactiveUsers = await User.findAll({ status: "inactive" });

      success("用户统计：");
      info(`总用户数: ${allUsers.length}`);
      info(`活跃用户: ${activeUsers.length}`);
      info(`非活跃用户: ${inactiveUsers.length}`);
    } catch (err) {
      error(
        `统计用户失败: ${err instanceof Error ? err.message : String(err)}`,
      );
      Deno.exit(1);
    }
  });

/**
 * 执行命令
 */
await cli.execute();
