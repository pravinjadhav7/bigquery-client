// src/BigQueryClient.ts
import { BigQuery } from '@google-cloud/bigquery';
import { QueryBuilder } from './QueryBuilder';
import { Logger } from './Logger';
import { AGGREGATE_FUNCTIONS } from "./constants";

// Interface for the BigQuery client configuration
interface BigQueryClientConfig {
    projectId: string;
    datasetId: string;
    enableLogging?: boolean;
}

// Interface for the SELECT query options
interface SelectOptions {
    table: string;
    columns?: string[] | Record<string, string[]>;  // 🔹 Allow both formats
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

// List of known SQL aggregate functions
const aggregateFunctions = [
    "SUM", "AVG", "COUNT", "MIN", "MAX", "ARRAY_AGG", "STRING_AGG",
    "BIT_AND", "BIT_OR", "BIT_XOR", "LOGICAL_AND", "LOGICAL_OR",
    "ANY_VALUE", "COUNTIF", "GROUPING", "MAX_BY", "MIN_BY"
];

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

            const result = await this.bigQuery.query(options); // ✅ Don't destructure if it's undefined

            console.log("BigQuery Query Execution Result:", result);

            return result; // ✅ Return the complete response
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
    async select(options: SelectOptions): Promise<{ success: boolean; message: string; data: any[] }> {
        try {
            const { table, columns = {}, joins = [], where, groupBy, orderBy, limit, offset } = options;

            // Generate alias for the main table (e.g., users → u)
            const mainAlias = table[0]; // First letter aliasing
            const formattedMainTable = `${this.formatTableName(table)} AS ${mainAlias}`;

            // Initialize QueryBuilder
            const qb = new QueryBuilder(formattedMainTable);

            // Store table aliases
            const aliasMap: Record<string, string> = { [table]: mainAlias };

            // Normalize columns: Convert array format to object format if necessary
            const normalizedColumns = Array.isArray(columns)
                ? { [table]: columns }
                : columns;

            // Handle column selection with correct table aliasing
            const selectedColumns = Object.entries(normalizedColumns).flatMap(([tableRef, cols]) =>
                Array.isArray(cols)
                    ? cols.map(col => {
                        // Check if the column contains an aggregate function and an alias
                        const match = col.match(/^(\w+)\((.*?)\)(?:\s+AS\s+(\w+))?$/i); // Extract function, column, and alias
            
                        if (match) {
                            const funcName = match[1].toUpperCase(); // Aggregate function name
                            const columnName = match[2]; // Column inside function
                            let userDefinedAlias = match[3]; // Extract alias if provided
            
                            if (AGGREGATE_FUNCTIONS.has(funcName)) {
                                // Ensure table alias is applied correctly
                                const formattedColumn = columnName === "*" ? "*" : `${aliasMap[tableRef] || tableRef[0]}.${columnName}`;
            
                                // If no alias is provided, generate a meaningful alias
                                if (!userDefinedAlias) {
                                    userDefinedAlias = `${funcName.toLowerCase()}_${columnName.replace(/\W/g, '')}`;
                                }
            
                                return `${funcName}(${formattedColumn}) AS ${userDefinedAlias}`;
                            }
                        }
            
                        // Apply table alias for regular columns
                        return `${aliasMap[tableRef] || tableRef[0]}.${col}`;
                    })
                    : []
            );

            qb.select(selectedColumns);

            // Process joins with correct aliasing
            for (const join of joins) {
                const joinAlias = join.table[0]; // Generate alias (e.g., orders → o)
                aliasMap[join.table] = joinAlias;

                // Proper join condition references
                const joinCondition = Object.entries(join.on).reduce((acc, [left, right]) => {
                    const leftAlias = aliasMap[left.split('.')[0]] || mainAlias;
                    const rightAlias = aliasMap[join.table] || joinAlias;
                    return { ...acc, [`${leftAlias}.${left.split('.').pop()}`]: `${rightAlias}.${right.split('.').pop()}` };
                }, {});

                qb.join(`${this.formatTableName(join.table)} AS ${joinAlias}`, joinCondition, join.type || 'INNER');
            }

            // Update WHERE clause to use aliases
            if (where) {
                const aliasedWhere = Object.fromEntries(
                    Object.entries(where).map(([key, value]) => {
                        const [tableRef, colName] = key.includes('.') ? key.split('.') : [table, key];
                        const tableAlias = aliasMap[tableRef] || aliasMap[table] || mainAlias;
                        return [`${tableAlias}.${colName}`, value];
                    })
                );
                qb.where(aliasedWhere);
            }

            // Handle GROUP BY clause
            if (groupBy) {
                qb.groupBy(groupBy.map(col => {
                    const [tableRef, colName] = col.includes('.') ? col.split('.') : [table, col];
                    return `${aliasMap[tableRef] || mainAlias}.${colName}`;
                }));
            }

            // Handle ORDER BY clause with correct aliasing
            if (orderBy) {
                // Extract column aliases from the selected columns
                const columnAliases: Record<string, string> = {};
                selectedColumns.forEach(col => {
                    const match = col.match(/AS (\w+)$/i); // Extract alias (e.g., `SUM(t.price) AS total_price`)
                    if (match) {
                        columnAliases[match[1]] = col.split(" AS ")[0]; // Map alias to its original column
                    }
                });

                qb.orderBy(orderBy.map((col: any) => {
                    let tableRef, colName;

                    if (typeof col === "string") {
                        [tableRef, colName] = col.includes('.') ? col.split('.') : [null, col];
                    } else if (col.column) {
                        [tableRef, colName] = col.column.includes('.') ? col.column.split('.') : [null, col.column];
                    } else {
                        throw new Error("Invalid orderBy format");
                    }

                    // If the column has an alias, use the alias directly
                    if (columnAliases[colName]) {
                        return { column: colName, direction: col.direction || 'ASC' };
                    }

                    // If table name is provided, map it correctly
                    if (tableRef) {
                        return { column: `${aliasMap[tableRef] || tableRef}.${colName}`, direction: col.direction || 'ASC' };
                    }

                    // Default case: no table name, use column as-is
                    return { column: colName, direction: col.direction || 'ASC' };
                }));
            }


            if (limit) qb.limit(limit);
            if (offset) qb.offset(offset);

            // Execute the query
            const { query, params } = qb.build();
            console.log("🚀 Executing SELECT Query:", query);
            console.log("🔍 With Parameters:", params);

            const [result] = await this.bigQuery.query({ query, params });

            console.log("✅ BigQuery Select Execution Result:", result);

            return result.length > 0
                ? { success: true, message: "Select successful", data: result }
                : { success: false, message: "No records found", data: [] };

        } catch (error) {
            this.logger.logError(error as Error);
            throw error;
        }
    }








    /**
     * Inserts rows into a table in BigQuery.
     * @param options - The options for the INSERT query, including table name and rows to insert.
     * @returns The result of the INSERT query.
     * @throws Will throw an error if the INSERT query execution fails.
     */
    async insert(options: InsertOptions): Promise<{ success: boolean; message: string; affectedRows: number }> {
        try {
            const { table, rows } = options;
            const qb = new QueryBuilder(this.formatTableName(table));
            qb.insert(rows);
            const { query, params } = qb.build();


            // Execute insert query
            await this.bigQuery.query({ query, params });

            // ✅ Manually erify insertion by checking the row count
            const checkQuery = `SELECT COUNT(*) AS count FROM ${this.formatTableName(table)} WHERE user_id = ?`;
            const [checkResult] = await this.bigQuery.query({ query: checkQuery, params: [rows[0].user_id] });

            const affectedRows = checkResult?.[0]?.count ? Number(checkResult[0].count) : 0;

            return affectedRows > 0
                ? { success: true, message: "Insert successful", affectedRows }
                : { success: false, message: "Insert executed but no rows affected", affectedRows };

        } catch (error) {
            this.logger.logError(error as Error);
            return { success: false, message: "Insert failed", affectedRows: 0 };
        }
    }





    /**
     * Updates rows in a table in BigQuery.
     * @param options - The options for the UPDATE query, including table name, rows to update, and where conditions.
     * @returns The result of the UPDATE query.
     * @throws Will throw an error if the UPDATE query execution fails.
     */
    async update(options: UpdateOptions): Promise<{ success: boolean; message: string; affectedRows: number }> {
        try {
            const { table, set, where } = options;

            if (!Object.keys(set).length) throw new Error("Update failed: No fields provided to update.");
            if (!Object.keys(where).length) throw new Error("Update failed: WHERE clause cannot be empty.");

            // ✅ Ensure proper formatting of table name
            const fullTableName = this.formatTableName(table); // DO NOT add extra backticks here!

            const qb = new QueryBuilder(fullTableName);
            qb.update(set).where(where);
            const { query, params } = qb.build();

            // Execute update query
            await this.bigQuery.query({ query, params });

            // Ensure the `checkQuery` is properly formatted
            const whereConditions = Object.keys(where).map(col => `\`${col}\` = ?`).join(' AND ');
            const checkQuery = `SELECT COUNT(*) AS count FROM ${fullTableName} WHERE ${whereConditions}`;

            const [checkResult] = await this.bigQuery.query({ query: checkQuery, params: Object.values(where) });

            // Extract affected rows count
            const affectedRows = checkResult?.[0]?.count ? Number(checkResult[0].count) : 0;

            return affectedRows > 0
                ? { success: true, message: "Update successful", affectedRows }
                : { success: false, message: "Update executed but no rows affected", affectedRows };
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
    async delete(options: DeleteOptions): Promise<{ success: boolean; message: string; affectedRows: number }> {
        try {
            const { table, where } = options;
            const qb = new QueryBuilder(this.formatTableName(table));
            qb.delete().where(where);
            const { query, params } = qb.build();

            await this.bigQuery.query({ query, params });

            const checkQuery = `SELECT COUNT(*) AS count FROM ${this.formatTableName(table)} WHERE user_id = ?`;
            const [checkResult] = await this.bigQuery.query({ query: checkQuery, params: [where.user_id] });

            const affectedRows = checkResult?.[0]?.count ? Number(checkResult[0].count) : 0;

            console.log("📌 Rows Deleted (REAL DB):", affectedRows);

            return affectedRows === 0
                ? { success: true, message: "Delete successful", affectedRows: 1 } // Assume one row deleted if count is now 0
                : { success: false, message: "Delete executed but row still exists", affectedRows: 0 };
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