// src/BigQueryClient.ts
import { BigQuery } from '@google-cloud/bigquery';
import { QueryBuilder } from './QueryBuilder';
import { Logger } from './Logger';

// Interface for the BigQuery client configuration
interface BigQueryClientConfig {
    projectId: string;
    datasetId: string;
    enableLogging?: boolean;
}

// Interface for the SELECT query options
interface SelectOptions {
    table: string;
    columns?: string[];
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

// Interface for the INSERT query options
interface InsertOptions {
    table: string;
    rows: Record<string, any>[];
}

// Interface for the UPDATE query options
interface UpdateOptions {
    table: string;
    set: Record<string, any>;
    where: Record<string, any>;
}

// Interface for the DELETE query options
interface DeleteOptions {
    table: string;
    where: Record<string, any>;
}

// Interface for the MERGE query options
interface MergeOptions {
    targetTable: string;
    sourceTable: string;
    on: Record<string, string>;
    whenMatched?: string;
    whenNotMatched?: string;
}

/**
 * Class representing a client for interacting with Google BigQuery.
 * This class provides methods for executing SELECT, INSERT, UPDATE, DELETE, and MERGE queries,
 * as well as batch and streaming inserts.
 */
export class BigQueryClient {
    private bigQuery: BigQuery;
    private projectId: string;
    private datasetId: string;
    private logger: Logger;

    constructor(config: BigQueryClientConfig) {
        this.bigQuery = new BigQuery({ projectId: config.projectId });
        this.projectId = config.projectId;
        this.datasetId = config.datasetId;
        this.logger = new Logger(config.enableLogging || false);
    }


    /**
     * Formats the table name to include the project ID and dataset ID.
     * @param table - The name of the table.
     * @returns The formatted table name.
     */
    private formatTableName(table: string): string {
        return `\`${this.projectId}.${this.datasetId}.${table}\``;
    }



    /**
     * Executes a SQL query on BigQuery.
     * @param sql - The SQL query string.
     * @param params - Optional parameters for the query.
     * @returns The result of the query.
     * @throws Will throw an error if the query execution fails.
     */
    async query(sql: string, params?: any[]): Promise<any> {
        try {
            this.logger.logQuery(sql, params);
            const options: any = { query: sql };
            if (params) {
                options.params = params;
            }
            const result = await this.bigQuery.query(options);
            return result;
        } catch (error) {
            this.logger.logError(error as Error);
            throw error;
        }
    }


    /**
     * Executes a dry run of a SQL query to explain its execution plan.
     * @param sql - The SQL query string.
     * @param params - Optional parameters for the query.
     * @returns The metadata of the query job.
     * @throws Will throw an error if the dry run execution fails.
     */
    async explain(sql: string, params?: any[]): Promise<any> {
        try {
            const options: any = { query: sql, dryRun: true };
            if (params) {
                options.params = params;
            }
            const [job] = await this.bigQuery.createQueryJob(options);
            return job.metadata;
        } catch (error) {
            this.logger.logError(error as Error);
            throw error;
        }
    }


    /**
     * Executes a SELECT query on BigQuery.
     * @param options - The options for the SELECT query, including table name, columns, joins, and where conditions.
     * @returns The result of the SELECT query.
     * @throws Will throw an error if the SELECT query execution fails.
     */    
    async select(options: SelectOptions): Promise<QueryBuilder> {
        const { table, columns = ['*'], joins = [], where, groupBy, orderBy, limit, offset } = options;
        const qb = new QueryBuilder(this.formatTableName(table));
    
        qb.select(columns);
    
        for (const join of joins) {
            qb.join(
                this.formatTableName(join.table),
                join.on,
                join.type || 'INNER'
            );
        }
    
        if (where) qb.where(where);
        if (groupBy) qb.groupBy(groupBy);
        if (orderBy) qb.orderBy(orderBy);
        if (limit) qb.limit(limit);
        if (offset) qb.offset(offset);
    
        return qb; // Return QueryBuilder instead of executing
    }
    

    /**
     * Inserts rows into a table in BigQuery.
     * @param options - The options for the INSERT query, including table name and rows to insert.
     * @returns The result of the INSERT query.
     * @throws Will throw an error if the INSERT query execution fails.
     */
    async insert(options: InsertOptions): Promise<any> {
        try {
            const { table, rows } = options;
            const qb = new QueryBuilder(this.formatTableName(table));
            qb.insert(rows);
            const { query, params } = qb.build();
            return this.query(query, params);
        } catch (error) {
            this.logger.logError(error as Error);
            throw error;
        }
    }


    /**
     * Updates rows in a table in BigQuery.
     * @param options - The options for the UPDATE query, including table name, rows to update, and where conditions.
     * @returns The result of the UPDATE query.
     * @throws Will throw an error if the UPDATE query execution fails.
     */    
    async update(options: UpdateOptions): Promise<any> {
        try {
            const { table, set, where } = options;
            const qb = new QueryBuilder(this.formatTableName(table));
            qb.update(set).where(where);
            const { query, params } = qb.build();
            return this.query(query, params);
        } catch (error) {
            this.logger.logError(error as Error);
            throw error;
        }
    }


    /**
     * Deletes rows from a table in BigQuery.
     * @param options - The options for the DELETE query, including table name and where conditions.
     * @returns The result of the DELETE query.
     * @throws Will throw an error if the DELETE query execution fails.
     */    
    async delete(options: DeleteOptions): Promise<any> {
        try {
            const { table, where } = options;
            const qb = new QueryBuilder(this.formatTableName(table));
            qb.delete().where(where);
            const { query, params } = qb.build();
            return this.query(query, params);
        } catch (error) {
            this.logger.logError(error as Error);
            throw error;
        }
    }



    /**
     * Merges rows into a table in BigQuery.
     * @param options - The options for the MERGE query, including target table, source table, merge condition, and actions.
     * @returns The result of the MERGE query.
     * @throws Will throw an error if the MERGE query execution fails.
     */
    async merge(options: MergeOptions): Promise<any> {
        try {
            const { targetTable, sourceTable, on, whenMatched = [], whenNotMatched = [] } = options;
            const onClause = Object.entries(on).map(([targetCol, sourceCol]) => `${targetCol} = ${sourceCol}`).join(' AND ');
    
            const mergeQuery = `
                MERGE INTO ${this.formatTableName(targetTable)} AS target
                USING ${this.formatTableName(sourceTable)} AS source
                ON ${onClause}
                ${Array.isArray(whenMatched) && whenMatched.length ? `WHEN MATCHED THEN ${whenMatched.join(' ')}` : whenMatched ? `WHEN MATCHED THEN ${whenMatched}` : ''}
                ${Array.isArray(whenNotMatched) && whenNotMatched.length ? `WHEN NOT MATCHED THEN ${whenNotMatched.join(' ')}` : whenNotMatched ? `WHEN NOT MATCHED THEN ${whenNotMatched}` : ''}                
            `;
    
            return this.query(mergeQuery);
        } catch (error) {
            this.logger.logError(error as Error);
            throw error;
        }
    }
    



    /**
     * Inserts rows into a table in BigQuery in batches.
     * @param options - The options for the batch INSERT query, including table name, rows to insert, and batch size.
     * @returns The result of the batch INSERT query.
     * @throws Will throw an error if the batch INSERT query execution fails.
     */
    async batchInsert(table: string, rows: Record<string, any>[]): Promise<any> {
        try {
            if (rows.length === 0) throw new Error('No rows to insert');
            return await this.bigQuery.dataset(this.datasetId).table(table).insert(rows);
        } catch (error) {
            this.logger.logError(error as Error);
            throw error;
        }
    }




    /**
     * Streams rows into a table in BigQuery.
     * @param options - The options for the stream INSERT query, including table name and rows to insert.
     * @returns The result of the stream INSERT query.
     * @throws Will throw an error if the stream INSERT query execution fails.
     */
    async streamInsert(table: string, rows: any[]): Promise<any> {
        try {
            return await this.bigQuery.dataset(this.datasetId).table(table).insert(rows);
        } catch (error) {
            this.logger.logError(error as Error);
            throw error;
        }
    }




    /**
     * Flattens nested results from a BigQuery query.
     * @param results - The nested results from a BigQuery query.
     * @returns The flattened results.
     */
    async flattenResults<T>(results: T[]): Promise<T[]> {
        try {
            return results.map(row => JSON.parse(JSON.stringify(row)));
        } catch (error) {
            this.logger.logError(error as Error);
            throw error;
        }
    }
    
}






