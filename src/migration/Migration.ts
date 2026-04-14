export interface Migration {
  name: string;
  timestamp: number;
  up(): string[];
  down(): string[];
}

export interface MigrationRecord {
  name: string;
  timestamp: number;
  executed_at: string;
  batch: number;
}

export abstract class BaseMigration implements Migration {
  abstract name: string;
  abstract timestamp: number;
  abstract up(): string[];
  abstract down(): string[];
}
