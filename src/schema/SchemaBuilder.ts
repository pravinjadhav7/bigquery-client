export type BigQueryType =
  | 'STRING' | 'BYTES'
  | 'INTEGER' | 'INT64' | 'FLOAT' | 'FLOAT64' | 'NUMERIC' | 'BIGNUMERIC'
  | 'BOOLEAN' | 'BOOL'
  | 'TIMESTAMP' | 'DATE' | 'TIME' | 'DATETIME'
  | 'GEOGRAPHY' | 'JSON'
  | 'ARRAY' | 'STRUCT';

export type FieldMode = 'NULLABLE' | 'REQUIRED' | 'REPEATED';

export interface SchemaField {
  name: string;
  type: BigQueryType;
  mode?: FieldMode;
  description?: string;
  fields?: SchemaField[];
  defaultValue?: string;
}

export interface TableOptions {
  partitionBy?: {
    type: 'TIME' | 'RANGE' | 'INGESTION_TIME';
    field?: string;
    granularity?: 'HOUR' | 'DAY' | 'MONTH' | 'YEAR';
    range?: { start: number; end: number; interval: number };
  };
  clusterBy?: string[];
  expirationMs?: number;
  description?: string;
  labels?: Record<string, string>;
  requirePartitionFilter?: boolean;
}

export class SchemaBuilder {
  private fields: SchemaField[] = [];
  private tableName: string;
  private datasetId: string;
  private projectId: string;
  private tableOptions: TableOptions = {};

  constructor(projectId: string, datasetId: string, tableName: string) {
    this.projectId = projectId;
    this.datasetId = datasetId;
    this.tableName = tableName;
  }

  string(name: string, mode: FieldMode = 'NULLABLE', description?: string): this {
    this.fields.push({ name, type: 'STRING', mode, description });
    return this;
  }

  integer(name: string, mode: FieldMode = 'NULLABLE', description?: string): this {
    this.fields.push({ name, type: 'INTEGER', mode, description });
    return this;
  }

  float(name: string, mode: FieldMode = 'NULLABLE', description?: string): this {
    this.fields.push({ name, type: 'FLOAT', mode, description });
    return this;
  }

  numeric(name: string, mode: FieldMode = 'NULLABLE', description?: string): this {
    this.fields.push({ name, type: 'NUMERIC', mode, description });
    return this;
  }

  bigNumeric(name: string, mode: FieldMode = 'NULLABLE', description?: string): this {
    this.fields.push({ name, type: 'BIGNUMERIC', mode, description });
    return this;
  }

  boolean(name: string, mode: FieldMode = 'NULLABLE', description?: string): this {
    this.fields.push({ name, type: 'BOOLEAN', mode, description });
    return this;
  }

  bytes(name: string, mode: FieldMode = 'NULLABLE', description?: string): this {
    this.fields.push({ name, type: 'BYTES', mode, description });
    return this;
  }

  timestamp(name: string, mode: FieldMode = 'NULLABLE', description?: string): this {
    this.fields.push({ name, type: 'TIMESTAMP', mode, description });
    return this;
  }

  date(name: string, mode: FieldMode = 'NULLABLE', description?: string): this {
    this.fields.push({ name, type: 'DATE', mode, description });
    return this;
  }

  time(name: string, mode: FieldMode = 'NULLABLE', description?: string): this {
    this.fields.push({ name, type: 'TIME', mode, description });
    return this;
  }

  datetime(name: string, mode: FieldMode = 'NULLABLE', description?: string): this {
    this.fields.push({ name, type: 'DATETIME', mode, description });
    return this;
  }

  geography(name: string, mode: FieldMode = 'NULLABLE', description?: string): this {
    this.fields.push({ name, type: 'GEOGRAPHY', mode, description });
    return this;
  }

  json(name: string, mode: FieldMode = 'NULLABLE', description?: string): this {
    this.fields.push({ name, type: 'JSON', mode, description });
    return this;
  }

  array(name: string, itemType: BigQueryType, description?: string): this {
    this.fields.push({ name, type: itemType, mode: 'REPEATED', description });
    return this;
  }

  struct(name: string, fields: SchemaField[], mode: FieldMode = 'NULLABLE', description?: string): this {
    this.fields.push({ name, type: 'STRUCT', mode, description, fields });
    return this;
  }

  field(field: SchemaField): this {
    this.fields.push(field);
    return this;
  }

  // Table options

  partitionByTime(field: string, granularity: 'HOUR' | 'DAY' | 'MONTH' | 'YEAR' = 'DAY'): this {
    this.tableOptions.partitionBy = { type: 'TIME', field, granularity };
    return this;
  }

  partitionByRange(field: string, start: number, end: number, interval: number): this {
    this.tableOptions.partitionBy = {
      type: 'RANGE',
      field,
      range: { start, end, interval }
    };
    return this;
  }

  partitionByIngestionTime(granularity: 'HOUR' | 'DAY' | 'MONTH' | 'YEAR' = 'DAY'): this {
    this.tableOptions.partitionBy = { type: 'INGESTION_TIME', granularity };
    return this;
  }

  clusterBy(...columns: string[]): this {
    this.tableOptions.clusterBy = columns;
    return this;
  }

  expiration(ms: number): this {
    this.tableOptions.expirationMs = ms;
    return this;
  }

  description(desc: string): this {
    this.tableOptions.description = desc;
    return this;
  }

  labels(labels: Record<string, string>): this {
    this.tableOptions.labels = labels;
    return this;
  }

  requirePartitionFilter(required: boolean = true): this {
    this.tableOptions.requirePartitionFilter = required;
    return this;
  }

  // Build

  private formatFieldDDL(field: SchemaField): string {
    if (field.type === 'STRUCT' && field.fields) {
      const nested = field.fields.map(f => this.formatFieldDDL(f)).join(', ');
      const modeStr = field.mode === 'REPEATED' ? 'ARRAY<STRUCT<' : 'STRUCT<';
      const closeBracket = field.mode === 'REPEATED' ? '>>' : '>';
      return `${field.name} ${modeStr}${nested}${closeBracket}`;
    }

    if (field.mode === 'REPEATED') {
      return `${field.name} ARRAY<${field.type}>`;
    }

    const notNull = field.mode === 'REQUIRED' ? ' NOT NULL' : '';
    const defaultVal = field.defaultValue ? ` DEFAULT ${field.defaultValue}` : '';
    return `${field.name} ${field.type}${notNull}${defaultVal}`;
  }

  private getFullTableName(): string {
    return `\`${this.projectId}.${this.datasetId}.${this.tableName}\``;
  }

  buildCreateTable(ifNotExists: boolean = false): string {
    const exists = ifNotExists ? ' IF NOT EXISTS' : '';
    const columnDefs = this.fields.map(f => this.formatFieldDDL(f)).join(',\n  ');

    let ddl = `CREATE TABLE${exists} ${this.getFullTableName()} (\n  ${columnDefs}\n)`;

    const opts = this.tableOptions;
    if (opts.partitionBy) {
      const p = opts.partitionBy;
      if (p.type === 'INGESTION_TIME') {
        ddl += `\nPARTITION BY _PARTITIONDATE`;
      } else if (p.type === 'TIME' && p.field) {
        const gran = p.granularity || 'DAY';
        ddl += gran === 'DAY'
          ? `\nPARTITION BY DATE(${p.field})`
          : `\nPARTITION BY ${gran === 'HOUR' ? 'TIMESTAMP_TRUNC' : 'DATE_TRUNC'}(${p.field}, ${gran})`;
      } else if (p.type === 'RANGE' && p.field && p.range) {
        ddl += `\nPARTITION BY RANGE_BUCKET(${p.field}, GENERATE_ARRAY(${p.range.start}, ${p.range.end}, ${p.range.interval}))`;
      }
    }

    if (opts.clusterBy?.length) {
      ddl += `\nCLUSTER BY ${opts.clusterBy.join(', ')}`;
    }

    const optionsParts: string[] = [];
    if (opts.description) optionsParts.push(`description="${opts.description}"`);
    if (opts.expirationMs) optionsParts.push(`expiration_timestamp=TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL ${opts.expirationMs} MILLISECOND)`);
    if (opts.requirePartitionFilter) optionsParts.push(`require_partition_filter=true`);
    if (opts.labels) {
      const labelsStr = Object.entries(opts.labels).map(([k, v]) => `("${k}", "${v}")`).join(', ');
      optionsParts.push(`labels=[${labelsStr}]`);
    }
    if (optionsParts.length) {
      ddl += `\nOPTIONS(\n  ${optionsParts.join(',\n  ')}\n)`;
    }

    return ddl;
  }

  buildDropTable(ifExists: boolean = true): string {
    const exists = ifExists ? ' IF EXISTS' : '';
    return `DROP TABLE${exists} ${this.getFullTableName()}`;
  }

  buildAddColumn(name: string, type: BigQueryType, mode: FieldMode = 'NULLABLE'): string {
    const modeStr = mode === 'REQUIRED' ? ' NOT NULL' : '';
    return `ALTER TABLE ${this.getFullTableName()} ADD COLUMN ${name} ${type}${modeStr}`;
  }

  buildDropColumn(name: string): string {
    return `ALTER TABLE ${this.getFullTableName()} DROP COLUMN ${name}`;
  }

  buildRenameColumn(oldName: string, newName: string): string {
    return `ALTER TABLE ${this.getFullTableName()} RENAME COLUMN ${oldName} TO ${newName}`;
  }

  buildAlterColumnType(name: string, newType: BigQueryType): string {
    return `ALTER TABLE ${this.getFullTableName()} ALTER COLUMN ${name} SET DATA TYPE ${newType}`;
  }

  buildSetColumnDefault(name: string, defaultValue: string): string {
    return `ALTER TABLE ${this.getFullTableName()} ALTER COLUMN ${name} SET DEFAULT ${defaultValue}`;
  }

  buildDropColumnDefault(name: string): string {
    return `ALTER TABLE ${this.getFullTableName()} ALTER COLUMN ${name} DROP DEFAULT`;
  }

  getFields(): SchemaField[] {
    return [...this.fields];
  }

  getTableOptions(): TableOptions {
    return { ...this.tableOptions };
  }

  static fromEntity(projectId: string, datasetId: string, entityClass: Function): SchemaBuilder {
    const tableName = (Reflect as any).getMetadata('tableName', entityClass);
    if (!tableName) throw new Error('Entity must have @Entity decorator');

    const builder = new SchemaBuilder(projectId, datasetId, tableName);
    const columns: any[] = (Reflect as any).getMetadata('columns', entityClass) || [];
    const pk = (Reflect as any).getMetadata('primaryKey', entityClass);
    const nullables: string[] = (Reflect as any).getMetadata('nullableColumns', entityClass) || [];
    const required: string[] = (Reflect as any).getMetadata('requiredColumns', entityClass) || [];

    for (const col of columns) {
      const mode: FieldMode = col.columnName === pk || required.includes(col.propertyKey)
        ? 'REQUIRED'
        : nullables.includes(col.propertyKey) ? 'NULLABLE' : 'NULLABLE';

      const designType = (Reflect as any).getMetadata('design:type', entityClass.prototype, col.propertyKey);
      let bqType: BigQueryType = 'STRING';
      if (designType === Number) bqType = 'FLOAT';
      else if (designType === Boolean) bqType = 'BOOLEAN';
      else if (designType === Date) bqType = 'TIMESTAMP';

      builder.field({ name: col.columnName, type: bqType, mode });
    }

    return builder;
  }
}
