/**
 * Class representing a SQL query builder for BigQuery.
 */
export class QueryBuilder {
    private table: string;
    private columns: string[] = [];
    private values: any[] = [];
    private joins: string[] = [];
    private conditions: string[] = [];
    private setClauses: string[] = [];
    private groupByColumns: string[] = [];
    private orderByColumns: string[] = [];
    private limitValue?: number = undefined;
    private offsetValue?: number = undefined;
    private aggregateFunctions: string[] = [];
    private queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' = 'SELECT';
    private tableSamplePercentage?: number = undefined; 
    private isDistinct: boolean = false;


    /**
     * Creates an instance of QueryBuilder.
     * @param table - The name of the table to query.
     */
    constructor(table: string) {
        this.table = table;
    }

    /**
     * Sets the columns to select in a SELECT query.
     * @param columns - The columns to select. Defaults to ['*'].
     * @returns The current instance of QueryBuilder.
     */
    select(columns: string[] = ['*']): this {
        this.queryType = 'SELECT';
        this.columns = columns;
        return this;
    }

    /**
     *  Sets the columns to select in a SELECT query with DISTINCT.
     * @param columns  - The columns to select. Defaults to ['*'].
     * @returns  The current instance of QueryBuilder.
     * @throws Will throw an error if no columns are provided.
     */
    selectDistinct(columns: string[] = ['*']): this {
        this.isDistinct = true;
        this.select(columns);
        return this;
    }

    /**
     * Sets the aggregate functions to select in a SELECT query.
     * @param aggregates - An array of objects containing the aggregate function and the column to apply it on.
     * @returns The current instance of QueryBuilder.
     */
    selectAggregate(aggregates: { func: string; column: string }[]): this {
        this.queryType = 'SELECT';
        this.aggregateFunctions = aggregates.map((a) => `${a.func.toUpperCase()}(${a.column})`);
        return this;
    }

    /**
     * Adds a CASE expression to the SELECT query.
     * @param column - The column to check in the CASE expression.
     * @param conditions - An array of objects containing `when` condition and `then` value.
     * @param elseValue - The value to return if none of the conditions match.
     * @param alias - The alias for the CASE result.
     * @returns The current instance of QueryBuilder.
     */
      case(column: string, conditions: { when: string, then: any }[], elseValue?: any, alias?: string): this {
        let caseStatement = `CASE `;
        for (const condition of conditions) {
            caseStatement += `WHEN ${condition.when} THEN ? `;
            this.values.push(condition.then);
        }
        if (elseValue !== undefined) {
            caseStatement += `ELSE ? `;
            this.values.push(elseValue);
        }
        caseStatement += `END ${alias ? `AS ${alias}` : ''}`;
        this.columns.push(caseStatement);
        return this;
    }

    /**
     * Sets the rows to insert in an INSERT query.
     * @param rows - An array of objects representing the rows to insert.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no rows are provided.
     */
    insert(rows: Record<string, any>[]): this {
        if (rows.length === 0) throw new Error("Insert requires at least one row.");
        this.queryType = 'INSERT';
        this.columns = Object.keys(rows[0]);
        this.values = rows.flatMap(Object.values);
        return this;
    }

    /**
     * Sets the columns and values to update in an UPDATE query.
     * @param set - An object representing the columns and values to update.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no columns are provided.
     */
    update(set: Record<string, any>): this {
        if (Object.keys(set).length === 0) throw new Error("Update requires at least one column to set.");
        this.queryType = 'UPDATE';
        this.setClauses = Object.keys(set).map((key) => `${key} = ?`);
        this.values.push(...Object.values(set));
        return this;
    }

    /**
     * Sets the query type to DELETE.
     * @returns The current instance of QueryBuilder.
     */
    delete(): this {
        this.queryType = 'DELETE';
        return this;
    }

    /**
     * Adds a JOIN clause to the query.
     * @param table - The table to join.
     * @param on - An object representing the join condition.
     * @param type - The type of join. Defaults to 'INNER'.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no table or condition is provided.
     */
    join(table: string, on: Record<string, string>, type: string = 'INNER'): this {
        if (!table || Object.keys(on).length === 0) throw new Error("Join requires a valid table and condition.");
        const onClause = Object.entries(on)
            .map(([key1, key2]) => `${key1} = ${key2}`)
            .join(' AND ');
        this.joins.push(`${type} JOIN ${table} ON ${onClause}`);
        return this;
    }

    /**
     * Sets the columns for the GROUP BY clause.
     * @param columns - The columns to group by.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no columns are provided.
     */
    groupBy(columns: string[]): this {
        if (columns.length === 0) throw new Error("GroupBy requires at least one column.");
        this.groupByColumns = columns;
        return this;
    }

    /**
     * Sets the columns and directions for the ORDER BY clause.
     * @param order - An array of objects representing the columns and directions to order by.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no columns are provided.
     */
    orderBy(order: { column: string; direction?: 'ASC' | 'DESC' }[]): this {
        if (order.length === 0) throw new Error("OrderBy requires at least one column.");
        this.orderByColumns = order.map((o) => `${o.column} ${o.direction || 'ASC'}`);
        return this;
    }

    /**
     * Sets the LIMIT clause.
     * @param limit - The maximum number of rows to return.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if the limit is negative.
     */
    limit(limit: number): this {
        if (limit < 0) throw new Error("Limit must be a positive number.");
        this.limitValue = limit;
        return this;
    }

    /**
     * Sets the OFFSET clause.
     * @param offset - The number of rows to skip.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if the offset is negative.
     */
    offset(offset: number): this {
        if (offset < 0) throw new Error("Offset must be a positive number.");
        this.offsetValue = offset;
        return this;
    }

    /**
     * Adds a subquery to the SELECT clause.
     * @param subquery - The subquery to add.
     * @param alias - The alias for the subquery.
     * @returns The current instance of QueryBuilder.
     */
    selectSubquery(subquery: string, alias: string): this {
        this.queryType = 'SELECT';
        this.columns.push(`(${subquery}) AS ${alias}`);
        return this;
    }

    /**
     * Adds a HAVING clause to the query.
     * @param conditions - An object representing the conditions for the HAVING clause.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no conditions are provided.
     */
    having(conditions: Record<string, any>): this {
        if (Object.keys(conditions).length === 0) throw new Error("Having conditions cannot be empty.");
        const havingConditions = Object.entries(conditions).map(([key, value]) => `${key} = ?`);
        this.conditions.push(...havingConditions);
        this.values.push(...Object.values(conditions));
        return this;
    }

    /**
     * Adds a WHERE clause to the query.
     * @param column - The column to check.
     * @param value - The value to check for.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no column or value is provided.
     */
    whereLike(column: string, pattern: string): this {
        this.conditions.push(`${column} LIKE ?`);
        this.values.push(pattern);
        return this;
    }

    /**
     * Adds a WHERE clause to the query.
     * @param column - The column to check.
     * @param pattern - The pattern to check for.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no column or pattern is provided.
     */
    whereNotLike(column: string, pattern: string): this {
        this.conditions.push(`${column} NOT LIKE ?`);
        this.values.push(pattern);
        return this;
    }

    /**
     * Adds a WHERE clause to the query.
     * @param column - The column to check.
     * @param min - The minimum value.
     * @param max - The maximum value.
     * @returns The current instance of QueryBuilder.
     */
    whereExists(subquery: string): this {
        this.conditions.push(`EXISTS (${subquery})`);
        return this;
    }
    
    /**
     * Adds a WHERE clause to the query.
     * @param column - The column to check.
     * @param min - The minimum value.
     * @param max - The maximum value.
     * @returns The current instance of QueryBuilder.
     */
    whereNotExists(subquery: string): this {
        this.conditions.push(`NOT EXISTS (${subquery})`);
        return this;
    }

    /**
     * Adds a WHERE clause to the query.
     * @param column - The column to check.
     * @param min - The minimum value.
     * @param max - The maximum value.
     * @returns The current instance of QueryBuilder.
     */
    whereBetween(column: string, min: any, max: any): this {
        this.conditions.push(`${column} BETWEEN ? AND ?`);
        this.values.push(min, max);
        return this;
    }

    /**
     * Adds a UNION clause to the query.
     * @param query - The query to union with.
     * @param all - Whether to use UNION ALL.
     * @returns The current instance of QueryBuilder.
     */
    union(query: string, all: boolean = false): this {
        this.queryType = 'SELECT';
        this.columns.push(`${all ? 'UNION ALL' : 'UNION'} ${query}`);
        return this;
    }

    /**
     * Adds a WHERE clause to the query.
     * @param conditions - An object representing the conditions for the WHERE clause.
     * @returns The current instance of QueryBuilder.
     */
    where(conditions: Record<string, any>): this {
        if (Object.keys(conditions).length === 0) return this; // Allow empty conditions
        this.conditions.push(...Object.keys(conditions).map((key) => `${key} = ?`));
        this.values.push(...Object.values(conditions));
        return this;
    }

    /**
     *  Adds a WHERE clause to the query. 
     * @param column  - The column to check.
     * @param values  - The values to check for.
     * @returns  The current instance of QueryBuilder.
     * @throws Will throw an error if no column or values are provided.
     */
    whereArray(column: string, values: any[]): this {
        if (values.length === 0) throw new Error(`Array values for ${column} cannot be empty.`);
        this.conditions.push(`${column} IN UNNEST(@${column})`);
        this.values.push({ name: column, value: values });
        return this;
    }

    /**
     * Adds a WHERE clause to the query.
     * @param column - The column to check.
     * @param value - The value to check for.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no column or value is provided.
     */
    wherePartition(column: string, value: string | number): this {
        this.conditions.push(`${column} = ?`);
        this.values.push(value);
        return this;
    }

    /**
     * Adds a TABLESAMPLE clause to the query.
     * @param percentage - The percentage of the table to sample.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if the percentage is not between 0 and 100.
     */
    tableSample(percentage: number): this {
        if (percentage <= 0 || percentage > 100) {
            throw new Error("Percentage must be between 0 and 100.");
        }
        this.tableSamplePercentage = percentage;
        return this;
    }

    /**
     *  Adds a WHERE clause to the query.
     * @param column  - The column to check.
     * @param jsonPath - The JSON path to check.
     * @param value  - The value to check for.
     * @returns  The current instance of QueryBuilder.
     * @throws Will throw an error if no column, jsonPath, or value is provided.
     */
    whereJsonField(column: string, jsonPath: string, value: any): this {
        this.conditions.push(`JSON_EXTRACT(${column}, "$.${jsonPath}") = ?`);
        this.values.push(value);
        return this;
    }

    /**
     *  Adds a WHERE clause to the query.
     * @param column  - The column to check for null.
     * @returns  The current instance of QueryBuilder.
     * @throws Will throw an error if no column is provided.
     */
    whereNull(column: string): this {
        this.conditions.push(`${column} IS NULL`);
        return this;
    }

    /**
     *  Adds a WHERE clause to the query.
     * @param column - The column to check for null.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no column is provided.
     */
    whereNotNull(column: string): this {
        this.conditions.push(`${column} IS NOT NULL`);
        return this;
    }

    /**
     * Adds a WHERE clause to the query.
     * @param conditions - An object representing the conditions for the WHERE clause. 
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no conditions are provided. 
     */
    whereStructField(structColumn: string, field: string, value: any): this {
        this.conditions.push(`${structColumn}.${field} = ?`);
        this.values.push(value);
        return this;
    }

    /**
     * Adds a WHERE clause to the query.
     * @param column - The column to check.
     * @param value - The value to check for.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no column or value is provided.
     */
    whereDateBetween(column: string, startDate: string, endDate: string): this {
        this.conditions.push(`${column} BETWEEN DATE(?) AND DATE(?)`);
        this.values.push(startDate, endDate);
        return this;
    }

    /**
     * Adds a WHERE clause to the query.
     * @param column - The column to check.
     * @param value - The value to check for.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no column or value is provided.
     */
    whereExtract(column: string, part: 'YEAR' | 'MONTH' | 'DAY', value: number): this {
        this.conditions.push(`EXTRACT(${part} FROM ${column}) = ?`);
        this.values.push(value);
        return this;
    }

    /**
     * Adds a WHERE clause to the query.
     * @param column - The column to check.
     * @param day - The day of the week to check for.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no column or day is provided.
     */
    whereDayOfWeek(column: string, day: number): this {
        this.conditions.push(`EXTRACT(DAYOFWEEK FROM ${column}) = ?`);
        this.values.push(day);
        return this;
    }

    /**
     * Adds a WHERE clause to the query.
     * @param column - The column to check.
     * @param operator - The comparison operator.
     * @param value - The value to compare against.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no column, operator, or value is provided.
     */
    whereDateComparison(column1: string, operator: '=' | '>' | '<' | '>=' | '<=', column2: string): this {
        this.conditions.push(`${column1} ${operator} ${column2}`);
        return this;
    }

    /**
     * Adds a WHERE clause to the query.
     * @param column - The column to check.
     * @param format - The format to use for the comparison.
     * @param value - The value to compare against.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no column, format, or value is provided.
     */
    selectFormattedDate(column: string, format: string, alias?: string): this {
        const formattedColumn = `FORMAT_TIMESTAMP('${format}', ${column})`;
        this.columns = this.columns.includes('*') ? [formattedColumn] : [...this.columns, formattedColumn];
        if (alias) {
            this.columns[this.columns.length - 1] += ` AS ${alias}`;
        }
        return this;
    }

    /**
     * Adds a WHERE clause to the query.
     * @param column - The column to check.
     * @param value - The value to compare against.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no column or value is provided.
     */
    whereCurrentDate(column: string): this {
        this.conditions.push(`${column} = CURRENT_DATE()`);
        return this;
    }
    
    /**
     * Adds a WHERE clause to the query.
     * @param column - The column to check.
     * @param value - The value to compare against.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no column or value is provided.
     */ 
    whereTimestampBetween(column: string, startDate: string, endDate: string): this {
        this.conditions.push(`${column} BETWEEN TIMESTAMP(?) AND TIMESTAMP(?)`);
        this.values.push(startDate, endDate);
        return this;
    }

    /**
     * Adds a WHERE clause to the query.
     * @param column - The column to check.
     * @param value - The value to compare against.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no column or value is provided.
     */
    whereDateTrunc(column: string, part: 'DAY' | 'MONTH' | 'YEAR', alias?: string): this {
        const truncatedColumn = `DATE_TRUNC(${column}, ${part})`;
        if (alias) {
            this.columns.push(`${truncatedColumn} AS ${alias}`);
        } else {
            this.columns.push(truncatedColumn);
        }
        return this;
    }

    /**
     * Adds a WHERE clause to the query.
     * @param column - The column to check.
     * @param value - The value to compare against.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no column or value is provided
     */
    whereTimestampTrunc(column: string, part: 'HOUR' | 'DAY' | 'MONTH' | 'YEAR', alias?: string): this {
        const truncatedColumn = `TIMESTAMP_TRUNC(${column}, ${part})`;
        if (alias) {
            this.columns.push(`${truncatedColumn} AS ${alias}`);
        } else {
            this.columns.push(truncatedColumn);
        }
        return this;
    }

    /**
     * Adds a WHERE clause to the query.
     * @param column - The column to check.
     * @param value - The value to compare against.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no column or value is provided.
     */
    whereContains(column: string, searchTerm: string): this {
        this.conditions.push(`CONTAINS_SUBSTR(${column}, ?)`);
        this.values.push(searchTerm);
        return this;
    }

    /**
     * Adds a WHERE clause to the query.
     * @param column - The column to check.
     * @param value - The value to compare against.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no column or value is provided.
     */
    whereArrayContains(column: string, value: any): this {
        this.conditions.push(`ARRAY_CONTAINS(?, ${column})`);
        this.values.push(value);
        return this;
    }

    /**
     * Adds a WHERE clause to the query.
     * @param column - The column to check.
     * @param length - The length to compare against.
     * @param operator - The comparison operator.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no column, length, or operator is provided.
     */
    whereArrayLength(column: string, length: number, operator: '=' | '>' | '<' | '>=' | '<='): this {
        this.conditions.push(`ARRAY_LENGTH(${column}) ${operator} ?`);
        this.values.push(length);
        return this;
    }

    /**
     * Adds a WHERE clause to the query.
     * @param column - The column to check.
     * @param value - The value to compare against.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no column or value is provided.
     */

    whereNotEqualNullSafe(column: string, value: any): this {
        this.conditions.push(`${column} IS DISTINCT FROM ?`);
        this.values.push(value);
        return this;
    }

    /**
     * Adds a WHERE clause to the query.
     * @param column - The column to check.
     * @param values - The values to check against.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no column or values are provided.
     */
    selectStringAgg(column: string, separator: string, alias?: string): this {
        const aggExpression = `STRING_AGG(${column}, '${separator}')`;
        this.columns.push(alias ? `${aggExpression} AS ${alias}` : aggExpression);
        return this;
    }
    
    /**
     * Adds a WHERE clause to the query.
     * @param column - The column to check.
     * @param values - The values to check against.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no column or values are provided.
     */
    selectConditionalSum(column: string, condition: string, alias?: string): this {
        const aggExpression = `SUM(CASE WHEN ${condition} THEN ${column} ELSE 0 END)`;
        this.columns.push(alias ? `${aggExpression} AS ${alias}` : aggExpression);
        return this;
    }

    /**
     * Adds a WHERE clause to the query.
     * @param column - The column to check.
     * @param values - The values to check against.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no column or values are provided.
     */
    selectWindowFunction(func: 'ROW_NUMBER' | 'RANK' | 'DENSE_RANK', partitionBy: string, orderBy: string, alias?: string): this {
        const windowFunction = `${func}() OVER (PARTITION BY ${partitionBy} ORDER BY ${orderBy})`;
        this.columns.push(alias ? `${windowFunction} AS ${alias}` : windowFunction);
        return this;
    }

    /**
     * Adds a WHERE clause to the query.
     * @param column - The column to check.
     * @param values - The values to check against.
     * @returns The current instance of QueryBuilder.
     * @throws Will throw an error if no column or values are provided.
     */
    selectJsonField(column: string, jsonPath: string, alias?: string): this {
        const jsonExtract = `JSON_VALUE(${column}, '$.${jsonPath}')`;
        this.columns.push(alias ? `${jsonExtract} AS ${alias}` : jsonExtract);
        return this;
    }

    /**
     * Builds the SQL query string and returns it along with the parameters.
     * @returns An object containing the query string and the parameters.
     */
    build(): { query: string; params: any[] } {
        let query = '';
    
        switch (this.queryType) {
            case 'SELECT':
                const selectCols = this.aggregateFunctions.length ? this.aggregateFunctions : (this.columns.length ? this.columns : ['*']);
                const distinctKeyword = this.isDistinct ? 'DISTINCT ' : ''; 
                query = `SELECT ${distinctKeyword}${selectCols.join(', ')} FROM ${this.table}`;
    
                if (this.joins.length) {
                    query += ` ${this.joins.join(' ')}`;
                }
    
                if (this.tableSamplePercentage !== undefined) {
                    query += ` TABLESAMPLE SYSTEM (${this.tableSamplePercentage})`;
                }
                break;
    
            case 'INSERT':
                const placeholders = Array(this.values.length / this.columns.length)
                    .fill(`(${this.columns.map(() => '?').join(', ')})`)
                    .join(', ');
                query = `INSERT INTO ${this.table} (${this.columns.join(', ')}) VALUES ${placeholders}`;
                break;
    
            case 'UPDATE':
                query = `UPDATE ${this.table} SET ${this.setClauses.join(', ')}`;
                break;
    
            case 'DELETE':
                query = `DELETE FROM ${this.table}`;
                break;
        }
    
        if (this.conditions.length) query += ` WHERE ${this.conditions.join(' AND ')}`;
        if (this.groupByColumns.length) query += ` GROUP BY ${this.groupByColumns.join(', ')}`;
        if (this.orderByColumns.length) query += ` ORDER BY ${this.orderByColumns.join(', ')}`;
        if (this.limitValue !== undefined) query += ` LIMIT ${this.limitValue}`;
        if (this.offsetValue !== undefined) query += ` OFFSET ${this.offsetValue}`;
    
        return { query, params: this.values };
    }
}
