import { QueryBuilder } from '../core/QueryBuilder';
import { BigQueryClient } from '../core/BigQueryClient';

declare global {
  interface Reflect {
    defineMetadata(metadataKey: any, metadataValue: any, target: Object): void;
    getMetadata(metadataKey: any, target: Object): any;
  }
}

export class BaseRepository<T> {
  constructor(
    private entity: { new(): T },
    private client: BigQueryClient
  ) {}

  getTableName(): string {
    return (Reflect as any).getMetadata('tableName', this.entity);
  }

  getColumns(): { propertyKey: string, columnName: string }[] {
    return (Reflect as any).getMetadata('columns', this.entity) || [];
  }

  async findAll(): Promise<T[]> {
    const table = this.getTableName();
    const columns = this.getColumns().map(c => c.columnName);
    const qb = new QueryBuilder(table).select(columns);
    const { query, params } = qb.build();
    const result = await this.client.query<T>(query, params);
    return result.data;
  }

  async findById(id: any): Promise<T | null> {
    const table = this.getTableName();
    const columns = this.getColumns().map(c => c.columnName);
    const primaryKey = this.getColumns()[0].columnName; // Assume first column is PK
    const qb = new QueryBuilder(table).select(columns).where({ [primaryKey]: id });
    const { query, params } = qb.build();
    const result = await this.client.query<T>(query, params);
    return result.data[0] || null;
  }

  async create(entity: Partial<T>): Promise<void> {
    const table = this.getTableName();
    await this.client.insert({ table, rows: [entity] });
  }

  async update(id: any, updateFields: Partial<T>): Promise<void> {
    const table = this.getTableName();
    const primaryKey = this.getColumns()[0].columnName; // Assume first column is PK
    await this.client.update({ table, set: updateFields, where: { [primaryKey]: id } });
  }

  async delete(id: any): Promise<void> {
    const table = this.getTableName();
    const primaryKey = this.getColumns()[0].columnName; // Assume first column is PK
    await this.client.delete({ table, where: { [primaryKey]: id } });
  }

  getSelectQuery() {
    const table = this.getTableName();
    const columns = this.getColumns().map(c => c.columnName);
    const qb = new QueryBuilder(table).select(columns);
    return qb.build();
  }

  // Add more methods: findById, create, update, delete, etc.
} 