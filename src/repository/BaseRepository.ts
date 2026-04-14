import { QueryBuilder } from '../core/QueryBuilder';
import { BigQueryClient } from '../core/BigQueryClient';

declare global {
  interface Reflect {
    defineMetadata(metadataKey: any, metadataValue: any, target: Object): void;
    getMetadata(metadataKey: any, target: Object): any;
  }
}

export interface FindOptions<T> {
  where?: Partial<T> | Record<string, any>;
  orderBy?: { column: string; direction?: 'ASC' | 'DESC' }[];
  limit?: number;
  offset?: number;
  select?: string[];
  relations?: string[];
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export class BaseRepository<T> {
  constructor(
    private entity: { new(): T },
    private client: BigQueryClient
  ) {}

  getTableName(): string {
    return (Reflect as any).getMetadata('tableName', this.entity);
  }

  getColumns(): { propertyKey: string; columnName: string }[] {
    return (Reflect as any).getMetadata('columns', this.entity) || [];
  }

  getPrimaryKey(): string {
    const pk = (Reflect as any).getMetadata('primaryKey', this.entity);
    if (pk) return pk;
    const columns = this.getColumns();
    return columns.length > 0 ? columns[0].columnName : 'id';
  }

  getRelations(): any[] {
    return (Reflect as any).getMetadata('relations', this.entity) || [];
  }

  getValidations(): any[] {
    return (Reflect as any).getMetadata('validations', this.entity) || [];
  }

  getHooks(): Record<string, string[]> {
    return (Reflect as any).getMetadata('hooks', this.entity) || {};
  }

  private getCreatedAtColumn(): string | undefined {
    return (Reflect as any).getMetadata('createdAtColumn', this.entity);
  }

  private getUpdatedAtColumn(): string | undefined {
    return (Reflect as any).getMetadata('updatedAtColumn', this.entity);
  }

  private getSoftDeleteColumn(): string | undefined {
    return (Reflect as any).getMetadata('softDeleteColumn', this.entity);
  }

  private getDefaultValues(): Record<string, any> {
    return (Reflect as any).getMetadata('defaultValues', this.entity) || {};
  }

  private getRequiredColumns(): string[] {
    return (Reflect as any).getMetadata('requiredColumns', this.entity) || [];
  }

  private async runHooks(hookType: string, entityData: any): Promise<void> {
    const hooks = this.getHooks();
    const hookMethods = hooks[hookType] || [];
    const instance = new this.entity();
    Object.assign(instance as any, entityData);
    for (const method of hookMethods) {
      if (typeof (instance as any)[method] === 'function') {
        await (instance as any)[method]();
      }
    }
  }

  private validateEntity(data: Partial<T>): void {
    const validations = this.getValidations();
    for (const validation of validations) {
      const value = (data as any)[validation.propertyKey];
      if (value !== undefined && !validation.validator(value)) {
        throw new Error(
          validation.message || `Validation failed for field '${validation.propertyKey}'`
        );
      }
    }

    const required = this.getRequiredColumns();
    for (const field of required) {
      if ((data as any)[field] === undefined || (data as any)[field] === null) {
        throw new Error(`Required field '${field}' is missing`);
      }
    }
  }

  private applyDefaults(data: Partial<T>): Partial<T> {
    const defaults = this.getDefaultValues();
    const result = { ...data };
    for (const [key, value] of Object.entries(defaults)) {
      if ((result as any)[key] === undefined) {
        (result as any)[key] = typeof value === 'function' ? value() : value;
      }
    }
    return result;
  }

  private applyTimestamps(data: Partial<T>, isUpdate: boolean): Partial<T> {
    const result = { ...data };
    const now = new Date().toISOString();
    if (!isUpdate) {
      const createdAt = this.getCreatedAtColumn();
      if (createdAt && !(result as any)[createdAt]) {
        (result as any)[createdAt] = now;
      }
    }
    const updatedAt = this.getUpdatedAtColumn();
    if (updatedAt) {
      (result as any)[updatedAt] = now;
    }
    return result;
  }

  createQueryBuilder(): QueryBuilder {
    return new QueryBuilder(this.getTableName());
  }

  // ─── FIND ───

  async findAll(options?: FindOptions<T>): Promise<T[]> {
    const table = this.getTableName();
    const columns = options?.select || this.getColumns().map(c => c.columnName);
    const qb = new QueryBuilder(table).select(columns);

    this.applySoftDeleteFilter(qb);

    if (options?.where) {
      qb.where(options.where as Record<string, any>);
    }
    if (options?.orderBy) qb.orderBy(options.orderBy);
    if (options?.limit) qb.limit(options.limit);
    if (options?.offset) qb.offset(options.offset);

    const { query, params } = qb.build();
    const result = await this.client.query<T>(query, params);

    if (options?.relations?.length) {
      return this.loadRelations(result.data, options.relations);
    }

    return result.data;
  }

  async findOne(where: Partial<T> | Record<string, any>): Promise<T | null> {
    const table = this.getTableName();
    const columns = this.getColumns().map(c => c.columnName);
    const qb = new QueryBuilder(table).select(columns).where(where as Record<string, any>).limit(1);

    this.applySoftDeleteFilter(qb);

    const { query, params } = qb.build();
    const result = await this.client.query<T>(query, params);
    return result.data[0] || null;
  }

  async findById(id: any): Promise<T | null> {
    return this.findOne({ [this.getPrimaryKey()]: id } as any);
  }

  async findBy(where: Partial<T> | Record<string, any>, options?: Omit<FindOptions<T>, 'where'>): Promise<T[]> {
    return this.findAll({ ...options, where });
  }

  async findOneBy(where: Partial<T> | Record<string, any>): Promise<T | null> {
    return this.findOne(where);
  }

  async findAndCount(options?: FindOptions<T>): Promise<{ data: T[]; count: number }> {
    const [data, count] = await Promise.all([
      this.findAll(options),
      this.count(options?.where)
    ]);
    return { data, count };
  }

  async paginate(page: number, pageSize: number, options?: Omit<FindOptions<T>, 'limit' | 'offset'>): Promise<PaginationResult<T>> {
    const offset = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.findAll({ ...options, limit: pageSize, offset }),
      this.count(options?.where)
    ]);
    const totalPages = Math.ceil(total / pageSize);
    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    };
  }

  async findByIds(ids: any[]): Promise<T[]> {
    if (ids.length === 0) return [];
    const table = this.getTableName();
    const columns = this.getColumns().map(c => c.columnName);
    const pk = this.getPrimaryKey();
    const qb = new QueryBuilder(table).select(columns).whereIn(pk, ids);
    this.applySoftDeleteFilter(qb);
    const { query, params } = qb.build();
    const result = await this.client.query<T>(query, params);
    return result.data;
  }

  // ─── COUNT / EXISTS ───

  async count(where?: Partial<T> | Record<string, any>): Promise<number> {
    const table = this.getTableName();
    const qb = new QueryBuilder(table).select(['COUNT(*) AS count']);
    this.applySoftDeleteFilter(qb);
    if (where) qb.where(where as Record<string, any>);
    const { query, params } = qb.build();
    const result = await this.client.query<{ count: number }>(query, params);
    return Number(result.data[0]?.count || 0);
  }

  async exists(where: Partial<T> | Record<string, any>): Promise<boolean> {
    const count = await this.count(where);
    return count > 0;
  }

  // ─── CREATE ───

  async create(entity: Partial<T>): Promise<Partial<T>> {
    let data = this.applyDefaults(entity);
    data = this.applyTimestamps(data, false);
    this.validateEntity(data);
    await this.runHooks('beforeInsert', data);

    const table = this.getTableName();
    await this.client.insert({ table, rows: [data] });

    await this.runHooks('afterInsert', data);
    return data;
  }

  async createMany(entities: Partial<T>[]): Promise<Partial<T>[]> {
    const processed = entities.map(entity => {
      let data = this.applyDefaults(entity);
      data = this.applyTimestamps(data, false);
      this.validateEntity(data);
      return data;
    });

    const table = this.getTableName();
    await this.client.insert({ table, rows: processed });
    return processed;
  }

  // ─── UPDATE ───

  async update(id: any, updateFields: Partial<T>): Promise<void> {
    let data = this.applyTimestamps(updateFields, true);
    this.validateEntity(data);
    await this.runHooks('beforeUpdate', data);

    const table = this.getTableName();
    const pk = this.getPrimaryKey();
    await this.client.update({ table, set: data as Record<string, any>, where: { [pk]: id } });

    await this.runHooks('afterUpdate', data);
  }

  async updateBy(where: Partial<T> | Record<string, any>, updateFields: Partial<T>): Promise<void> {
    let data = this.applyTimestamps(updateFields, true);
    this.validateEntity(data);

    const table = this.getTableName();
    await this.client.update({
      table,
      set: data as Record<string, any>,
      where: where as Record<string, any>
    });
  }

  // ─── SAVE (UPSERT) ───

  async save(entity: Partial<T>): Promise<Partial<T>> {
    const pk = this.getPrimaryKey();
    const id = (entity as any)[pk];

    if (id) {
      const existing = await this.findById(id);
      if (existing) {
        await this.update(id, entity);
        return { ...existing, ...entity } as Partial<T>;
      }
    }

    return this.create(entity);
  }

  // ─── DELETE ───

  async delete(id: any): Promise<void> {
    await this.runHooks('beforeDelete', { [this.getPrimaryKey()]: id });

    const table = this.getTableName();
    const pk = this.getPrimaryKey();
    await this.client.delete({ table, where: { [pk]: id } });

    await this.runHooks('afterDelete', { [this.getPrimaryKey()]: id });
  }

  async deleteBy(where: Partial<T> | Record<string, any>): Promise<void> {
    const table = this.getTableName();
    await this.client.delete({ table, where: where as Record<string, any> });
  }

  async softDelete(id: any): Promise<void> {
    const softDeleteCol = this.getSoftDeleteColumn();
    if (!softDeleteCol) {
      throw new Error('Entity does not have a @SoftDelete column defined');
    }
    await this.update(id, { [softDeleteCol]: new Date().toISOString() } as any);
  }

  async restore(id: any): Promise<void> {
    const softDeleteCol = this.getSoftDeleteColumn();
    if (!softDeleteCol) {
      throw new Error('Entity does not have a @SoftDelete column defined');
    }
    const table = this.getTableName();
    const pk = this.getPrimaryKey();
    await this.client.update({
      table,
      set: { [softDeleteCol]: null },
      where: { [pk]: id }
    });
  }

  async softDeleteBy(where: Partial<T> | Record<string, any>): Promise<void> {
    const softDeleteCol = this.getSoftDeleteColumn();
    if (!softDeleteCol) {
      throw new Error('Entity does not have a @SoftDelete column defined');
    }
    const table = this.getTableName();
    await this.client.update({
      table,
      set: { [softDeleteCol]: new Date().toISOString() },
      where: where as Record<string, any>
    });
  }

  // ─── INCREMENT / DECREMENT ───

  async increment(id: any, field: string, amount: number = 1): Promise<void> {
    const table = this.getTableName();
    const pk = this.getPrimaryKey();
    const query = `UPDATE ${table} SET ${field} = ${field} + ? WHERE ${pk} = ?`;
    await this.client.query(query, [amount, id]);
  }

  async decrement(id: any, field: string, amount: number = 1): Promise<void> {
    const table = this.getTableName();
    const pk = this.getPrimaryKey();
    const query = `UPDATE ${table} SET ${field} = ${field} - ? WHERE ${pk} = ?`;
    await this.client.query(query, [amount, id]);
  }

  // ─── AGGREGATE ───

  async sum(field: string, where?: Partial<T> | Record<string, any>): Promise<number> {
    const table = this.getTableName();
    const qb = new QueryBuilder(table).select([`SUM(${field}) AS total`]);
    this.applySoftDeleteFilter(qb);
    if (where) qb.where(where as Record<string, any>);
    const { query, params } = qb.build();
    const result = await this.client.query<{ total: number }>(query, params);
    return Number(result.data[0]?.total || 0);
  }

  async avg(field: string, where?: Partial<T> | Record<string, any>): Promise<number> {
    const table = this.getTableName();
    const qb = new QueryBuilder(table).select([`AVG(${field}) AS average`]);
    this.applySoftDeleteFilter(qb);
    if (where) qb.where(where as Record<string, any>);
    const { query, params } = qb.build();
    const result = await this.client.query<{ average: number }>(query, params);
    return Number(result.data[0]?.average || 0);
  }

  async min(field: string, where?: Partial<T> | Record<string, any>): Promise<any> {
    const table = this.getTableName();
    const qb = new QueryBuilder(table).select([`MIN(${field}) AS minimum`]);
    this.applySoftDeleteFilter(qb);
    if (where) qb.where(where as Record<string, any>);
    const { query, params } = qb.build();
    const result = await this.client.query<{ minimum: any }>(query, params);
    return result.data[0]?.minimum ?? null;
  }

  async max(field: string, where?: Partial<T> | Record<string, any>): Promise<any> {
    const table = this.getTableName();
    const qb = new QueryBuilder(table).select([`MAX(${field}) AS maximum`]);
    this.applySoftDeleteFilter(qb);
    if (where) qb.where(where as Record<string, any>);
    const { query, params } = qb.build();
    const result = await this.client.query<{ maximum: any }>(query, params);
    return result.data[0]?.maximum ?? null;
  }

  // ─── RAW QUERY ───

  async raw<R = any>(query: string, params?: any[]): Promise<R[]> {
    const result = await this.client.query<R>(query, params);
    return result.data;
  }

  // ─── HELPERS ───

  getSelectQuery() {
    const table = this.getTableName();
    const columns = this.getColumns().map(c => c.columnName);
    const qb = new QueryBuilder(table).select(columns);
    return qb.build();
  }

  private applySoftDeleteFilter(qb: QueryBuilder): void {
    const softDeleteCol = this.getSoftDeleteColumn();
    if (softDeleteCol) {
      qb.whereNull(softDeleteCol);
    }
  }

  private async loadRelations(data: T[], relationNames: string[]): Promise<T[]> {
    const relations = this.getRelations();
    const relevantRelations = relations.filter(r => relationNames.includes(r.propertyKey));

    for (const relation of relevantRelations) {
      const targetEntity = relation.target();
      const targetTableName = (Reflect as any).getMetadata('tableName', targetEntity);
      if (!targetTableName) continue;

      const targetColumns = (Reflect as any).getMetadata('columns', targetEntity) || [];
      const colNames = targetColumns.map((c: any) => c.columnName);

      const pk = this.getPrimaryKey();
      const fk = relation.foreignKey || `${this.getTableName()}_id`;

      if (relation.type === 'one-to-many') {
        const ids = data.map((item: any) => item[pk]).filter(Boolean);
        if (ids.length === 0) continue;

        const qb = new QueryBuilder(targetTableName)
          .select(colNames.length ? colNames : ['*'])
          .whereIn(fk, ids);
        const { query, params } = qb.build();
        const result = await this.client.query(query, params);
        const related = result.data;

        for (const item of data as any[]) {
          item[relation.propertyKey] = related.filter((r: any) => r[fk] === item[pk]);
        }
      } else if (relation.type === 'many-to-one' || relation.type === 'one-to-one') {
        const refKey = relation.referenceKey || (Reflect as any).getMetadata('primaryKey', targetEntity) || 'id';
        const ids = data.map((item: any) => item[fk]).filter(Boolean);
        if (ids.length === 0) continue;

        const qb = new QueryBuilder(targetTableName)
          .select(colNames.length ? colNames : ['*'])
          .whereIn(refKey, ids);
        const { query, params } = qb.build();
        const result = await this.client.query(query, params);
        const related = result.data;

        for (const item of data as any[]) {
          const match = related.find((r: any) => r[refKey] === (item as any)[fk]);
          (item as any)[relation.propertyKey] = match || null;
        }
      }
    }

    return data;
  }
}
