/**
 * dweb 数据库迁移命令
 *
 * 职责：
 * - 创建迁移文件（create）
 * - 执行迁移（up）
 * - 回滚迁移（down）
 * - 使用 runtime-adapter 保证 Deno/Bun 兼容
 *
 * 运行方式：
 * - dweb-cli migrate -a create -n add_users
 * - dweb-cli m -a up
 */

import { error, info, success } from "@dreamer/console";
import {
  cwd,
  join,
  mkdir,
  stat,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import type { ParsedOptions } from "../feature/command.ts";

/**
 * 迁移命令主入口
 *
 * @param _args 命令行参数（未使用）
 * @param options 解析后的选项，需包含 action、name（create/down 时需要）
 */
export async function main(
  _args: string[],
  options: ParsedOptions,
): Promise<void> {
  // action 可能被解析为 boolean（-a 无值时），统一转为字符串
  const rawAction = options.action;
  const action =
    rawAction === true ? "up" : (String(rawAction ?? "up") as string);
  const name = options.name as string | undefined;

  try {
    if (action === "create") {
      if (!name) {
        error("创建迁移需要指定名称（--name）");
        return;
      }

      info(`正在创建迁移: ${name}`);

      const currentDir = cwd();
      const migrationsDir = join(currentDir, "migrations");

      // 确保 migrations 目录存在
      await mkdir(migrationsDir, { recursive: true });

      // 生成迁移文件名（时间戳 + 名称）
      const timestamp = Date.now();
      const migrationName = `${timestamp}_${name}`;
      const migrationFile = join(migrationsDir, `${migrationName}.ts`);

      // 检查文件是否已存在
      try {
        await stat(migrationFile);
        error(`迁移文件已存在: ${migrationFile}`);
        return;
      } catch {
        // 文件不存在，可以创建
      }

      // 生成迁移文件内容
      const content = `/**
 * 数据库迁移: ${name}
 * 创建时间: ${new Date().toISOString()}
 */

/**
 * 执行迁移（up）
 */
export async function up() {
  // TODO: 实现迁移逻辑
  // 示例：
  // const db = getDatabaseAdapter();
  // await db.query(\`CREATE TABLE IF NOT EXISTS ...\`);
}

/**
 * 回滚迁移（down）
 */
export async function down() {
  // TODO: 实现回滚逻辑
  // 示例：
  // const db = getDatabaseAdapter();
  // await db.query(\`DROP TABLE IF EXISTS ...\`);
}
`;

      await writeTextFile(migrationFile, content);

      success(`迁移 ${name} 创建完成！`);
      info(`迁移文件: ${migrationFile}`);
    } else if (action === "up") {
      info("正在执行数据库迁移...");

      const currentDir = cwd();
      const migrationsDir = join(currentDir, "migrations");

      // 检查 migrations 目录是否存在
      try {
        await stat(migrationsDir);
      } catch {
        error(`迁移目录不存在: ${migrationsDir}`);
        error(
          "请先创建迁移文件（使用 migrate --action create --name <name>）",
        );
        return;
      }

      // TODO: 实现迁移执行逻辑
      // 需要：
      // 1. 读取 migrations 目录中的所有迁移文件
      // 2. 检查哪些迁移已执行（需要迁移历史表）
      // 3. 按顺序执行未执行的迁移
      // 4. 记录迁移历史

      info("提示: 迁移执行功能需要数据库连接，请确保已配置数据库");
      info("提示: 迁移历史需要存储在数据库中（migrations 表）");
      success("数据库迁移完成！（功能待完善）");
    } else if (action === "down") {
      info("正在回滚数据库迁移...");

      if (!name) {
        error("回滚迁移需要指定迁移名称（--name）");
        return;
      }

      // TODO: 实现迁移回滚逻辑
      // 需要：
      // 1. 从迁移历史中找到指定的迁移
      // 2. 执行该迁移的 down() 方法
      // 3. 从迁移历史中移除记录

      info("提示: 迁移回滚功能需要数据库连接，请确保已配置数据库");
      success("数据库迁移回滚完成！（功能待完善）");
    } else {
      error(`不支持的操作: ${action}`);
      error("支持的操作: create, up, down");
    }
  } catch (err) {
    error(
      `迁移操作失败: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
