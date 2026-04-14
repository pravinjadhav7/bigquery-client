export interface QueryResult<T> {
  data: T[];
  metadata: {
    totalRows: number;
    schema: any;
    executionTime: number;
    bytesProcessed: number;
    cacheHit?: boolean;
  };
}

export interface QueryMetrics {
  executionTime: number;
  bytesProcessed: number;
  rowsAffected: number;
  cacheHit: boolean;
  timestamp: string;
}

export interface PoolConfig {
  min: number;
  max: number;
  idleTimeoutMillis: number;
  acquireTimeoutMillis: number;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  query: string;
  params: any[];
  executionTime: number;
  error?: Error;
}

export interface QueryOptimization {
  suggestedIndexes: string[];
  estimatedCost: number;
  optimizationTips: string[];
}

export interface MaterializedViewConfig {
  name: string;
  query: string;
  refreshInterval: string;
  partitionField?: string;
}

export interface PartitionedTableConfig {
  name: string;
  schema: any;
  partitionField: string;
  partitionType: 'RANGE' | 'TIME' | 'INGESTION_TIME' | 'DATE' | 'TIMESTAMP' | 'DATETIME';
}

export interface BigQueryClientConfig {
  projectId: string;
  datasetId: string;
  enableLogging?: boolean;
  enableCache?: boolean;
  cacheTtl?: number;
  cacheMaxSize?: number;
}

export interface SelectOptions {
  table: string;
  columns?: string[] | Record<string, string[]>;
  joins?: {
    table: string;
    on: Record<string, string>;
    type?: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  }[];
  where?: Record<string, any>;
  groupBy?: string[];
  orderBy?: { column: string; direction?: 'ASC' | 'DESC' }[];
  limit?: number;
  offset?: number;
}

export interface InsertOptions {
  table: string;
  rows: Record<string, any>[];
}

export interface UpdateOptions {
  table: string;
  set: Record<string, any>;
  where: Record<string, any>;
}

export interface DeleteOptions {
  table: string;
  where: Record<string, any>;
}

export interface MergeOptions {
  targetTable: string;
  sourceTable: string;
  on: Record<string, string>;
  whenMatched?: string;
  whenNotMatched?: string;
}

export interface ColumnMetadata {
  propertyKey: string;
  columnName: string;
}

export interface RelationMetadata {
  propertyKey: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  target: () => Function;
  foreignKey?: string;
  referenceKey?: string;
  joinTable?: string;
  eager?: boolean;
  cascade?: boolean;
}

export interface ValidationMetadata {
  propertyKey: string;
  validator: (value: any) => boolean;
  message?: string;
}

export interface HookMetadata {
  beforeInsert?: string[];
  afterInsert?: string[];
  beforeUpdate?: string[];
  afterUpdate?: string[];
  beforeDelete?: string[];
  afterDelete?: string[];
}
