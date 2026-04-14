// Core functionality
export { BigQueryClient, QueryBuilder, Pool, Transaction, TableManager } from './core';
export type { TableInfo, DatasetInfo, CopyTableOptions, ExportOptions, LoadOptions } from './core';

// Repository
export { BaseRepository } from './repository';
export type { FindOptions, PaginationResult } from './repository';

// Decorators
export {
  Entity, Column, PrimaryColumn,
  Relation, OneToOne, OneToMany, ManyToOne, ManyToMany,
  Validate,
  CreatedAt, UpdatedAt, SoftDelete,
  Index, Unique,
  Nullable, Required, Default,
  BeforeInsert, AfterInsert, BeforeUpdate, AfterUpdate, BeforeDelete, AfterDelete
} from './decorators';
export type { RelationType, RelationOptions, IndexOptions } from './decorators';

// Schema & Migration
export { SchemaBuilder } from './schema';
export type { BigQueryType, FieldMode, SchemaField, TableOptions } from './schema';
export { BaseMigration, MigrationRunner } from './migration';
export type { Migration, MigrationRecord, MigrationRunnerConfig } from './migration';

// Events
export { BigQueryEventEmitter } from './events';
export type { EventType, QueryEvent, EntityEvent, EventCallback } from './events';

// Library utilities
export { QueryCache } from './lib/cache';
export { MetricsCollector } from './lib/metrics';
export { QueryValidator } from './lib/validation';
export { Logger } from './lib/logging';

// Configuration and constants
export * from './config';

// Type definitions
export * from './types';

// Error classes
export * from './errors';

// Default export for convenience
export { BigQueryClient as default } from './core';
