import { BigQueryClient } from '../core/BigQueryClient';
import { Migration, MigrationRecord } from './Migration';

export interface MigrationRunnerConfig {
  migrationTable?: string;
}

export class MigrationRunner {
  private client: BigQueryClient;
  private migrations: Migration[] = [];
  private migrationTable: string;

  constructor(client: BigQueryClient, config?: MigrationRunnerConfig) {
    this.client = client;
    this.migrationTable = config?.migrationTable || '_migrations';
  }

  add(migration: Migration): this {
    this.migrations.push(migration);
    return this;
  }

  addMany(migrations: Migration[]): this {
    this.migrations.push(...migrations);
    return this;
  }

  async initialize(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.migrationTable} (
        name STRING NOT NULL,
        timestamp INT64 NOT NULL,
        executed_at TIMESTAMP NOT NULL,
        batch INT64 NOT NULL
      )
    `;
    await this.client.query(createTableSQL);
  }

  async getExecutedMigrations(): Promise<MigrationRecord[]> {
    try {
      const result = await this.client.query<MigrationRecord>(
        `SELECT * FROM ${this.migrationTable} ORDER BY timestamp ASC`
      );
      return result.data;
    } catch {
      return [];
    }
  }

  async getPendingMigrations(): Promise<Migration[]> {
    const executed = await this.getExecutedMigrations();
    const executedNames = new Set(executed.map(m => m.name));
    return this.migrations
      .filter(m => !executedNames.has(m.name))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  async getLastBatch(): Promise<number> {
    try {
      const result = await this.client.query<{ max_batch: number }>(
        `SELECT MAX(batch) AS max_batch FROM ${this.migrationTable}`
      );
      return Number(result.data[0]?.max_batch || 0);
    } catch {
      return 0;
    }
  }

  async up(steps?: number): Promise<string[]> {
    await this.initialize();
    const pending = await this.getPendingMigrations();
    const toRun = steps ? pending.slice(0, steps) : pending;

    if (toRun.length === 0) return [];

    const batch = (await this.getLastBatch()) + 1;
    const executed: string[] = [];

    for (const migration of toRun) {
      const statements = migration.up();
      for (const sql of statements) {
        await this.client.query(sql);
      }

      await this.client.query(
        `INSERT INTO ${this.migrationTable} (name, timestamp, executed_at, batch) VALUES (?, ?, CURRENT_TIMESTAMP(), ?)`,
        [migration.name, migration.timestamp, batch]
      );

      executed.push(migration.name);
    }

    return executed;
  }

  async down(steps: number = 1): Promise<string[]> {
    await this.initialize();
    const executed = await this.getExecutedMigrations();

    if (executed.length === 0) return [];

    const lastBatch = await this.getLastBatch();
    const toRollback = executed
      .filter(m => m.batch === lastBatch)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, steps);

    const rolledBack: string[] = [];

    for (const record of toRollback) {
      const migration = this.migrations.find(m => m.name === record.name);
      if (!migration) continue;

      const statements = migration.down();
      for (const sql of statements) {
        await this.client.query(sql);
      }

      await this.client.query(
        `DELETE FROM ${this.migrationTable} WHERE name = ?`,
        [record.name]
      );

      rolledBack.push(record.name);
    }

    return rolledBack;
  }

  async reset(): Promise<string[]> {
    await this.initialize();
    const executed = await this.getExecutedMigrations();
    const rolledBack: string[] = [];

    const sorted = [...executed].sort((a, b) => b.timestamp - a.timestamp);

    for (const record of sorted) {
      const migration = this.migrations.find(m => m.name === record.name);
      if (!migration) continue;

      const statements = migration.down();
      for (const sql of statements) {
        await this.client.query(sql);
      }
      rolledBack.push(record.name);
    }

    await this.client.query(`DELETE FROM ${this.migrationTable} WHERE 1=1`);
    return rolledBack;
  }

  async refresh(): Promise<{ down: string[]; up: string[] }> {
    const down = await this.reset();
    const up = await this.up();
    return { down, up };
  }

  async status(): Promise<{
    executed: MigrationRecord[];
    pending: Migration[];
    lastBatch: number;
  }> {
    await this.initialize();
    const [executed, pending, lastBatch] = await Promise.all([
      this.getExecutedMigrations(),
      this.getPendingMigrations(),
      this.getLastBatch()
    ]);
    return { executed, pending, lastBatch };
  }
}
