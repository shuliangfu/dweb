/**
 * 迁移管理器
 * 负责迁移文件的生成、执行和回滚
 */

import { join, basename } from '@std/path';
import { exists } from '@std/fs';
import type { DatabaseType } from '../types.ts';
import type { Migration, MigrationConfig, MigrationStatus } from './types.ts';
import {
  generateMigrationFileName,
  parseMigrationFileName,
  generateClassName,
  ensureMigrationsDir,
  SQL_MIGRATION_TEMPLATE,
  MONGO_MIGRATION_TEMPLATE,
} from './utils.ts';

/**
 * 迁移管理器类
 */
export class MigrationManager {
  private config: MigrationConfig;
  private historyTableName: string;
  private historyCollectionName: string;

  constructor(config: MigrationConfig) {
    this.config = config;
    this.historyTableName = config.historyTableName || 'migrations';
    this.historyCollectionName = config.historyCollectionName || 'migrations';
  }

  /**
   * 初始化迁移历史表/集合
   */
  private async ensureHistoryTable(): Promise<void> {
    const db = this.config.adapter;
    const dbType = (db as any).config?.type as DatabaseType | undefined;

    if (!dbType) {
      throw new Error('Cannot determine database type from adapter');
    }

    if (dbType === 'mongodb') {
      // MongoDB: 检查集合是否存在，不存在则创建
      try {
        await (db as any).query(this.historyCollectionName, {}, { limit: 1 });
        // 如果查询成功，说明集合已存在
      } catch {
        // 集合不存在，创建它
        await (db as any).execute('createCollection', this.historyCollectionName, {});
      }
    } else {
      // SQL 数据库: 创建迁移历史表
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS ${this.historyTableName} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          batch INTEGER NOT NULL,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
      try {
        await db.execute(createTableSQL, []);
      } catch (error) {
        // 某些数据库可能需要不同的 SQL 语法
        // PostgreSQL/MySQL 使用不同的语法
        if (dbType === 'postgresql' || dbType === 'mysql') {
          const pgCreateTableSQL = `
            CREATE TABLE IF NOT EXISTS ${this.historyTableName} (
              id SERIAL PRIMARY KEY,
              name VARCHAR(255) NOT NULL UNIQUE,
              batch INTEGER NOT NULL,
              executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `;
          await db.execute(pgCreateTableSQL, []);
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * 获取已执行的迁移列表
   */
  private async getExecutedMigrations(): Promise<string[]> {
    await this.ensureHistoryTable();
    const db = this.config.adapter;
    const dbType = (db as any).config?.type as DatabaseType | undefined;

    if (!dbType) {
      throw new Error('Cannot determine database type from adapter');
    }

    if (dbType === 'mongodb') {
      const results = await (db as any).query(this.historyCollectionName, {}, {});
      return results.map((r: any) => r.name as string);
    } else {
      const results = await db.query(
        `SELECT name FROM ${this.historyTableName} ORDER BY executed_at ASC`,
        [],
      );
      return results.map((r: any) => r.name as string);
    }
  }

  /**
   * 记录迁移执行
   */
  private async recordMigration(name: string, batch: number): Promise<void> {
    await this.ensureHistoryTable();
    const db = this.config.adapter;
    const dbType = (db as any).config?.type as DatabaseType | undefined;

    if (!dbType) {
      throw new Error('Cannot determine database type from adapter');
    }

    if (dbType === 'mongodb') {
      await (db as any).execute('insert', this.historyCollectionName, {
        name,
        batch,
        executedAt: new Date(),
      });
    } else {
      await db.execute(
        `INSERT INTO ${this.historyTableName} (name, batch) VALUES (?, ?)`,
        [name, batch],
      );
    }
  }

  /**
   * 删除迁移记录
   */
  private async removeMigrationRecord(name: string): Promise<void> {
    await this.ensureHistoryTable();
    const db = this.config.adapter;
    const dbType = (db as any).config?.type as DatabaseType | undefined;

    if (!dbType) {
      throw new Error('Cannot determine database type from adapter');
    }

    if (dbType === 'mongodb') {
      await (db as any).execute('delete', this.historyCollectionName, {
        filter: { name },
      });
    } else {
      await db.execute(`DELETE FROM ${this.historyTableName} WHERE name = ?`, [name]);
    }
  }

  /**
   * 获取下一个批次号
   */
  private async getNextBatch(): Promise<number> {
    await this.ensureHistoryTable();
    const db = this.config.adapter;
    const dbType = (db as any).config?.type as DatabaseType | undefined;

    if (!dbType) {
      throw new Error('Cannot determine database type from adapter');
    }

    if (dbType === 'mongodb') {
      const results = await (db as any).query(
        this.historyCollectionName,
        {},
        { sort: { batch: -1 }, limit: 1 },
      );
      if (results.length === 0) {
        return 1;
      }
      return ((results[0] as any).batch || 0) + 1;
    } else {
      const results = await db.query(
        `SELECT MAX(batch) as max_batch FROM ${this.historyTableName}`,
        [],
      );
      if (results.length === 0 || !results[0].max_batch) {
        return 1;
      }
      return (results[0] as any).max_batch + 1;
    }
  }

  /**
   * 创建迁移文件
   * @param name 迁移名称
   * @param dbType 数据库类型（可选，用于选择模板）
   * @returns 创建的迁移文件路径
   */
  async create(
    name: string,
    dbType?: DatabaseType,
  ): Promise<string> {
    await ensureMigrationsDir(this.config.migrationsDir);

    const filename = generateMigrationFileName(name);
    const filepath = join(this.config.migrationsDir, filename);
    const className = generateClassName(name);

    // 如果未指定数据库类型，尝试从适配器获取
    if (!dbType) {
      dbType = (this.config.adapter as any).config?.type as DatabaseType | undefined;
    }

    // 根据数据库类型选择模板
    const template = dbType === 'mongodb' ? MONGO_MIGRATION_TEMPLATE : SQL_MIGRATION_TEMPLATE;

    const content = template
      .replace(/{timestamp}/g, new Date().toISOString())
      .replace(/{className}/g, className)
      .replace(/{name}/g, name);

    await Deno.writeTextFile(filepath, content);
    return filepath;
  }

  /**
   * 加载迁移文件
   */
  private async loadMigration(filepath: string): Promise<Migration> {
    // 动态导入迁移文件
    const module = await import(`file://${filepath}`);
    if (!module.default) {
      throw new Error(`Migration file ${filepath} does not export a default class`);
    }
    const MigrationClass = module.default;
    return new MigrationClass() as Migration;
  }

  /**
   * 获取所有迁移文件
   */
  private async getMigrationFiles(): Promise<string[]> {
    if (!(await exists(this.config.migrationsDir))) {
      return [];
    }

    const files: string[] = [];
    for await (const entry of Deno.readDir(this.config.migrationsDir)) {
      if (entry.isFile && entry.name.endsWith('.ts')) {
        files.push(join(this.config.migrationsDir, entry.name));
      }
    }

    return files.sort();
  }

  /**
   * 执行迁移（升级）
   * @param count 要执行的迁移数量（可选，不提供则执行所有待执行的迁移）
   */
  async up(count?: number): Promise<void> {
    const executed = await this.getExecutedMigrations();
    const files = await this.getMigrationFiles();
    const pending: string[] = [];

    for (const file of files) {
      const info = parseMigrationFileName(basename(file));
      if (!info) {
        continue;
      }
      if (!executed.includes(info.name)) {
        pending.push(file);
      }
    }

    if (pending.length === 0) {
      console.log('No pending migrations to run.');
      return;
    }

    const toRun = count ? pending.slice(0, count) : pending;
    const batch = await this.getNextBatch();

    for (const file of toRun) {
      const info = parseMigrationFileName(basename(file));
      if (!info) {
        continue;
      }

      try {
        console.log(`Running migration: ${info.name}`);
        const migration = await this.loadMigration(file);
        await migration.up(this.config.adapter);
        await this.recordMigration(info.name, batch);
        console.log(`Migration ${info.name} completed.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Migration ${info.name} failed: ${message}`);
      }
    }
  }

  /**
   * 回滚迁移（降级）
   * @param count 要回滚的迁移数量（可选，默认为 1）
   */
  async down(count: number = 1): Promise<void> {
    const executed = await this.getExecutedMigrations();
    if (executed.length === 0) {
      console.log('No migrations to rollback.');
      return;
    }

    const files = await this.getMigrationFiles();
    const executedFiles: Array<{ file: string; name: string }> = [];

    for (const file of files) {
      const info = parseMigrationFileName(basename(file));
      if (!info) {
        continue;
      }
      if (executed.includes(info.name)) {
        executedFiles.push({ file, name: info.name });
      }
    }

    // 按时间戳倒序排列（最新的在前）
    executedFiles.sort((a, b) => {
      const aInfo = parseMigrationFileName(basename(a.file));
      const bInfo = parseMigrationFileName(basename(b.file));
      if (!aInfo || !bInfo) {
        return 0;
      }
      return bInfo.timestamp - aInfo.timestamp;
    });

    const toRollback = executedFiles.slice(0, count);

    for (const { file, name } of toRollback) {
      try {
        console.log(`Rolling back migration: ${name}`);
        const migration = await this.loadMigration(file);
        await migration.down(this.config.adapter);
        await this.removeMigrationRecord(name);
        console.log(`Migration ${name} rolled back.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Rollback ${name} failed: ${message}`);
      }
    }
  }

  /**
   * 获取迁移状态
   */
  async status(): Promise<MigrationStatus[]> {
    const executed = await this.getExecutedMigrations();
    const files = await this.getMigrationFiles();
    const statuses: MigrationStatus[] = [];

    for (const file of files) {
      const info = parseMigrationFileName(basename(file));
      if (!info) {
        continue;
      }

      const isExecuted = executed.includes(info.name);
      statuses.push({
        name: info.name,
        file: basename(file),
        executed: isExecuted,
        executedAt: isExecuted ? new Date() : undefined, // TODO: 从数据库获取实际执行时间
      });
    }

    return statuses.sort((a, b) => {
      const aInfo = parseMigrationFileName(a.file);
      const bInfo = parseMigrationFileName(b.file);
      if (!aInfo || !bInfo) {
        return 0;
      }
      return aInfo.timestamp - bInfo.timestamp;
    });
  }
}

