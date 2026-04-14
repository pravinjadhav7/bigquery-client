import { BigQuery } from '@google-cloud/bigquery';

export interface TableInfo {
  id: string;
  kind: string;
  creationTime: string;
  lastModifiedTime: string;
  numRows: string;
  numBytes: string;
  type: string;
  schema?: any;
}

export interface DatasetInfo {
  id: string;
  location: string;
  creationTime: string;
  lastModifiedTime: string;
  description?: string;
}

export interface CopyTableOptions {
  sourceTable: string;
  destinationTable: string;
  destinationDataset?: string;
  writeDisposition?: 'WRITE_TRUNCATE' | 'WRITE_APPEND' | 'WRITE_EMPTY';
}

export interface ExportOptions {
  table: string;
  destination: string;
  format?: 'CSV' | 'JSON' | 'AVRO' | 'PARQUET';
  compression?: 'GZIP' | 'DEFLATE' | 'SNAPPY' | 'NONE';
  overwrite?: boolean;
}

export interface LoadOptions {
  table: string;
  source: string;
  format?: 'CSV' | 'JSON' | 'AVRO' | 'PARQUET';
  writeDisposition?: 'WRITE_TRUNCATE' | 'WRITE_APPEND' | 'WRITE_EMPTY';
  autodetect?: boolean;
  skipLeadingRows?: number;
}

export class TableManager {
  private bigQuery: BigQuery;
  private datasetId: string;

  constructor(bigQuery: BigQuery, datasetId: string) {
    this.bigQuery = bigQuery;
    this.datasetId = datasetId;
  }

  private dataset() {
    return this.bigQuery.dataset(this.datasetId);
  }

  private table(name: string) {
    return this.dataset().table(name);
  }

  // ─── TABLE OPERATIONS ───

    async listTables(): Promise<{ id: string; type: string }[]> {
    const [tables] = await this.dataset().getTables();
    return tables.map((t: any) => ({
      id: t.id || '',
      type: t.metadata?.type || 'TABLE'
    }));
  }

  async tableExists(name: string): Promise<boolean> {
    try {
      const [exists] = await this.table(name).exists();
      return exists;
    } catch {
      return false;
    }
  }

  async describeTable(name: string): Promise<TableInfo> {
    const [metadata] = await this.table(name).getMetadata();
    return {
      id: metadata.tableReference?.tableId || name,
      kind: metadata.kind || '',
      creationTime: metadata.creationTime || '',
      lastModifiedTime: metadata.lastModifiedTime || '',
      numRows: metadata.numRows || '0',
      numBytes: metadata.numBytes || '0',
      type: metadata.type || 'TABLE',
      schema: metadata.schema
    };
  }

  async getTableSchema(name: string): Promise<any> {
    const [metadata] = await this.table(name).getMetadata();
    return metadata.schema;
  }

  async createTable(name: string, schema: any, options?: Record<string, any>): Promise<void> {
    await this.dataset().createTable(name, {
      schema,
      ...options
    });
  }

  async dropTable(name: string): Promise<void> {
    await this.table(name).delete();
  }

  async truncateTable(name: string): Promise<void> {
    const fullName = `\`${this.bigQuery.projectId}.${this.datasetId}.${name}\``;
    await this.bigQuery.query({ query: `TRUNCATE TABLE ${fullName}` });
  }

  async renameTable(oldName: string, newName: string): Promise<void> {
    const projectId = this.bigQuery.projectId;
    const query = `ALTER TABLE \`${projectId}.${this.datasetId}.${oldName}\` RENAME TO \`${newName}\``;
    await this.bigQuery.query({ query });
  }

  async addColumn(tableName: string, columnName: string, columnType: string): Promise<void> {
    const projectId = this.bigQuery.projectId;
    const query = `ALTER TABLE \`${projectId}.${this.datasetId}.${tableName}\` ADD COLUMN ${columnName} ${columnType}`;
    await this.bigQuery.query({ query });
  }

  async dropColumn(tableName: string, columnName: string): Promise<void> {
    const projectId = this.bigQuery.projectId;
    const query = `ALTER TABLE \`${projectId}.${this.datasetId}.${tableName}\` DROP COLUMN ${columnName}`;
    await this.bigQuery.query({ query });
  }

  async setTableExpiration(name: string, expirationMs: number): Promise<void> {
    const [metadata] = await this.table(name).getMetadata();
    metadata.expirationTime = String(Date.now() + expirationMs);
    await this.table(name).setMetadata(metadata);
  }

  async setTableDescription(name: string, description: string): Promise<void> {
    const [metadata] = await this.table(name).getMetadata();
    metadata.description = description;
    await this.table(name).setMetadata(metadata);
  }

  async setTableLabels(name: string, labels: Record<string, string>): Promise<void> {
    const [metadata] = await this.table(name).getMetadata();
    metadata.labels = { ...metadata.labels, ...labels };
    await this.table(name).setMetadata(metadata);
  }

  // ─── COPY / EXPORT / IMPORT ───

  async copyTable(options: CopyTableOptions): Promise<void> {
    const sourceTable = this.table(options.sourceTable);
    const destDataset = options.destinationDataset
      ? this.bigQuery.dataset(options.destinationDataset)
      : this.dataset();
    const destTable = destDataset.table(options.destinationTable);

    const [job] = await sourceTable.copy(destTable, {
      writeDisposition: options.writeDisposition || 'WRITE_EMPTY'
    });

    const [jobMetadata] = await job.getMetadata();
    if (jobMetadata.status?.errors?.length) {
      throw new Error(`Copy failed: ${JSON.stringify(jobMetadata.status.errors)}`);
    }
  }

  async exportToGCS(options: ExportOptions): Promise<void> {
    const tableRef = this.table(options.table);
    const formatMap: Record<string, string> = {
      CSV: 'CSV',
      JSON: 'NEWLINE_DELIMITED_JSON',
      AVRO: 'AVRO',
      PARQUET: 'PARQUET'
    };

    const [job] = await tableRef.extract(options.destination, {
      format: formatMap[options.format || 'CSV'],
      gzip: options.compression === 'GZIP'
    });

    const [jobMetadata] = await job.getMetadata();
    if (jobMetadata.status?.errors?.length) {
      throw new Error(`Export failed: ${JSON.stringify(jobMetadata.status.errors)}`);
    }
  }

  async loadFromGCS(options: LoadOptions): Promise<void> {
    const tableRef = this.table(options.table);
    const formatMap: Record<string, string> = {
      CSV: 'CSV',
      JSON: 'NEWLINE_DELIMITED_JSON',
      AVRO: 'AVRO',
      PARQUET: 'PARQUET'
    };

    const [job] = await tableRef.load(options.source, {
      sourceFormat: formatMap[options.format || 'CSV'],
      writeDisposition: options.writeDisposition || 'WRITE_APPEND',
      autodetect: options.autodetect ?? true,
      skipLeadingRows: options.skipLeadingRows
    });

    const [jobMetadata] = await job.getMetadata();
    if (jobMetadata.status?.errors?.length) {
      throw new Error(`Load failed: ${JSON.stringify(jobMetadata.status.errors)}`);
    }
  }

  // ─── SNAPSHOT ───

  async createSnapshot(sourceTable: string, snapshotTable: string, expirationDays?: number): Promise<void> {
    const projectId = this.bigQuery.projectId;
    const source = `\`${projectId}.${this.datasetId}.${sourceTable}\``;
    const snapshot = `\`${projectId}.${this.datasetId}.${snapshotTable}\``;
    let query = `CREATE SNAPSHOT TABLE ${snapshot} CLONE ${source}`;
    if (expirationDays) {
      query += `\nOPTIONS(expiration_timestamp=TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL ${expirationDays} DAY))`;
    }
    await this.bigQuery.query({ query });
  }

  async restoreFromSnapshot(snapshotTable: string, targetTable: string): Promise<void> {
    const projectId = this.bigQuery.projectId;
    const snapshot = `\`${projectId}.${this.datasetId}.${snapshotTable}\``;
    const target = `\`${projectId}.${this.datasetId}.${targetTable}\``;
    await this.bigQuery.query({ query: `CREATE TABLE ${target} CLONE ${snapshot}` });
  }

  // ─── DATASET OPERATIONS ───

  async listDatasets(): Promise<{ id: string; location: string }[]> {
    const [datasets] = await this.bigQuery.getDatasets();
    return datasets.map((d: any) => ({
      id: d.id || '',
      location: d.metadata?.location || ''
    }));
  }

  async createDataset(id: string, options?: { location?: string; description?: string }): Promise<void> {
    await this.bigQuery.createDataset(id, {
      location: options?.location || 'US',
      description: options?.description
    });
  }

  async deleteDataset(id: string, force: boolean = false): Promise<void> {
    await this.bigQuery.dataset(id).delete({ force });
  }

  async datasetExists(id: string): Promise<boolean> {
    try {
      const [exists] = await this.bigQuery.dataset(id).exists();
      return exists;
    } catch {
      return false;
    }
  }

  async describeDataset(id: string): Promise<DatasetInfo> {
    const [metadata] = await this.bigQuery.dataset(id).getMetadata();
    return {
      id: metadata.datasetReference?.datasetId || id,
      location: metadata.location || '',
      creationTime: metadata.creationTime || '',
      lastModifiedTime: metadata.lastModifiedTime || '',
      description: metadata.description
    };
  }

  // ─── JOB OPERATIONS ───

  async listJobs(maxResults: number = 10): Promise<any[]> {
    const [jobs] = await this.bigQuery.getJobs({ maxResults });
    return jobs.map((j: any) => ({
      id: j.id,
      status: j.metadata?.status?.state,
      statistics: j.metadata?.statistics,
      configuration: j.metadata?.configuration
    }));
  }

  async getJob(jobId: string): Promise<any> {
    const [job] = await this.bigQuery.job(jobId).getMetadata();
    return job;
  }

  async cancelJob(jobId: string): Promise<void> {
    await this.bigQuery.job(jobId).cancel();
  }
}
