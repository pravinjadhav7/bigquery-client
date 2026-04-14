export class QueryBuilder {
    private table: string;
    private columns: string[] = [];
    private values: any[] = [];
    private joins: string[] = [];
    private conditions: string[] = [];
    private orConditions: string[][] = [];
    private havingConditions: string[] = [];
    private havingValues: any[] = [];
    private setClauses: string[] = [];
    private groupByColumns: string[] = [];
    private orderByColumns: string[] = [];
    private limitValue?: number = undefined;
    private offsetValue?: number = undefined;
    private aggregateFunctions: string[] = [];
    private queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' = 'SELECT';
    private tableSamplePercentage?: number = undefined;
    private isDistinct: boolean = false;
    private cteStatements: { name: string; query: string }[] = [];
    private unionStatements: { query: string; all: boolean }[] = [];

    constructor(table: string) {
        this.table = table;
    }

    // ─── SELECT ───

    select(columns: string[] = ['*']): this {
        this.queryType = 'SELECT';
        this.columns = columns;
        return this;
    }

    selectDistinct(columns: string[] = ['*']): this {
        this.isDistinct = true;
        this.select(columns);
        return this;
    }

    selectAggregate(aggregates: { func: string; column: string; alias?: string }[]): this {
        this.queryType = 'SELECT';
        this.aggregateFunctions = aggregates.map(a => {
            const expr = `${a.func.toUpperCase()}(${a.column})`;
            return a.alias ? `${expr} AS ${a.alias}` : expr;
        });
        return this;
    }

    selectRaw(expression: string): this {
        this.queryType = 'SELECT';
        this.columns.push(expression);
        return this;
    }

    selectSubquery(subquery: string, alias: string): this {
        this.queryType = 'SELECT';
        this.columns.push(`(${subquery}) AS ${alias}`);
        return this;
    }

    selectStringAgg(column: string, separator: string, alias?: string): this {
        const aggExpression = `STRING_AGG(${column}, '${separator}')`;
        this.columns.push(alias ? `${aggExpression} AS ${alias}` : aggExpression);
        return this;
    }

    selectConditionalSum(column: string, condition: string, alias?: string): this {
        const aggExpression = `SUM(CASE WHEN ${condition} THEN ${column} ELSE 0 END)`;
        this.columns.push(alias ? `${aggExpression} AS ${alias}` : aggExpression);
        return this;
    }

    selectWindowFunction(func: 'ROW_NUMBER' | 'RANK' | 'DENSE_RANK' | 'NTILE' | 'LAG' | 'LEAD' | 'FIRST_VALUE' | 'LAST_VALUE', partitionBy: string, orderBy: string, alias?: string): this {
        const windowFunction = `${func}() OVER (PARTITION BY ${partitionBy} ORDER BY ${orderBy})`;
        this.columns.push(alias ? `${windowFunction} AS ${alias}` : windowFunction);
        return this;
    }

    selectJsonField(column: string, jsonPath: string, alias?: string): this {
        const jsonExtract = `JSON_VALUE(${column}, '$.${jsonPath}')`;
        this.columns.push(alias ? `${jsonExtract} AS ${alias}` : jsonExtract);
        return this;
    }

    selectFormattedDate(column: string, format: string, alias?: string): this {
        const formattedColumn = `FORMAT_TIMESTAMP('${format}', ${column})`;
        this.columns = this.columns.includes('*') ? [formattedColumn] : [...this.columns, formattedColumn];
        if (alias) {
            this.columns[this.columns.length - 1] += ` AS ${alias}`;
        }
        return this;
    }

    selectCount(column: string = '*', alias?: string): this {
        const expr = `COUNT(${column})`;
        this.columns.push(alias ? `${expr} AS ${alias}` : expr);
        return this;
    }

    selectSum(column: string, alias?: string): this {
        const expr = `SUM(${column})`;
        this.columns.push(alias ? `${expr} AS ${alias}` : expr);
        return this;
    }

    selectAvg(column: string, alias?: string): this {
        const expr = `AVG(${column})`;
        this.columns.push(alias ? `${expr} AS ${alias}` : expr);
        return this;
    }

    selectMin(column: string, alias?: string): this {
        const expr = `MIN(${column})`;
        this.columns.push(alias ? `${expr} AS ${alias}` : expr);
        return this;
    }

    selectMax(column: string, alias?: string): this {
        const expr = `MAX(${column})`;
        this.columns.push(alias ? `${expr} AS ${alias}` : expr);
        return this;
    }

    // ─── CASE ───

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
        caseStatement += `END${alias ? ` AS ${alias}` : ''}`;
        this.columns.push(caseStatement);
        return this;
    }

    // ─── INSERT ───

    insert(rows: Record<string, any>[]): this {
        if (rows.length === 0) throw new Error("Insert requires at least one row.");
        this.queryType = 'INSERT';
        this.columns = Object.keys(rows[0]);
        this.values = rows.flatMap(Object.values);
        return this;
    }

    // ─── UPDATE ───

    update(set: Record<string, any>): this {
        if (Object.keys(set).length === 0) throw new Error("Update requires at least one column to set.");
        this.queryType = 'UPDATE';
        this.setClauses = Object.keys(set).map((key) => `${key} = ?`);
        this.values.push(...Object.values(set));
        return this;
    }

    // ─── DELETE ───

    delete(): this {
        this.queryType = 'DELETE';
        return this;
    }

    // ─── JOIN ───

    join(table: string, on: Record<string, string>, type: string = 'INNER'): this {
        if (!table || Object.keys(on).length === 0) throw new Error("Join requires a valid table and condition.");
        const onClause = Object.entries(on)
            .map(([left, right]) => `${left} = ${right}`)
            .join(' AND ');
        this.joins.push(`${type} JOIN ${table} ON ${onClause}`);
        return this;
    }

    leftJoin(table: string, on: Record<string, string>): this {
        return this.join(table, on, 'LEFT');
    }

    rightJoin(table: string, on: Record<string, string>): this {
        return this.join(table, on, 'RIGHT');
    }

    fullJoin(table: string, on: Record<string, string>): this {
        return this.join(table, on, 'FULL');
    }

    crossJoin(table: string): this {
        this.joins.push(`CROSS JOIN ${table}`);
        return this;
    }

    // ─── WHERE ───

    where(conditions: Record<string, any>): this {
        if (Object.keys(conditions).length === 0) return this;
        this.conditions.push(...Object.keys(conditions).map((key) => `${key} = ?`));
        this.values.push(...Object.values(conditions));
        return this;
    }

    whereRaw(expression: string, values: any[] = []): this {
        this.conditions.push(expression);
        this.values.push(...values);
        return this;
    }

    orWhere(conditions: Record<string, any>): this {
        if (Object.keys(conditions).length === 0) return this;
        const group = Object.keys(conditions).map(key => `${key} = ?`);
        this.orConditions.push(group);
        this.values.push(...Object.values(conditions));
        return this;
    }

    whereIn(column: string, values: any[]): this {
        if (values.length === 0) throw new Error(`Values for IN clause on ${column} cannot be empty.`);
        const placeholders = values.map(() => '?').join(', ');
        this.conditions.push(`${column} IN (${placeholders})`);
        this.values.push(...values);
        return this;
    }

    whereNotIn(column: string, values: any[]): this {
        if (values.length === 0) throw new Error(`Values for NOT IN clause on ${column} cannot be empty.`);
        const placeholders = values.map(() => '?').join(', ');
        this.conditions.push(`${column} NOT IN (${placeholders})`);
        this.values.push(...values);
        return this;
    }

    whereLike(column: string, pattern: string): this {
        this.conditions.push(`${column} LIKE ?`);
        this.values.push(pattern);
        return this;
    }

    whereNotLike(column: string, pattern: string): this {
        this.conditions.push(`${column} NOT LIKE ?`);
        this.values.push(pattern);
        return this;
    }

    whereExists(subquery: string): this {
        this.conditions.push(`EXISTS (${subquery})`);
        return this;
    }

    whereNotExists(subquery: string): this {
        this.conditions.push(`NOT EXISTS (${subquery})`);
        return this;
    }

    whereBetween(column: string, min: any, max: any): this {
        this.conditions.push(`${column} BETWEEN ? AND ?`);
        this.values.push(min, max);
        return this;
    }

    whereNotBetween(column: string, min: any, max: any): this {
        this.conditions.push(`${column} NOT BETWEEN ? AND ?`);
        this.values.push(min, max);
        return this;
    }

    whereNull(column: string): this {
        this.conditions.push(`${column} IS NULL`);
        return this;
    }

    whereNotNull(column: string): this {
        this.conditions.push(`${column} IS NOT NULL`);
        return this;
    }

    whereGreaterThan(column: string, value: any): this {
        this.conditions.push(`${column} > ?`);
        this.values.push(value);
        return this;
    }

    whereLessThan(column: string, value: any): this {
        this.conditions.push(`${column} < ?`);
        this.values.push(value);
        return this;
    }

    whereGreaterOrEqual(column: string, value: any): this {
        this.conditions.push(`${column} >= ?`);
        this.values.push(value);
        return this;
    }

    whereLessOrEqual(column: string, value: any): this {
        this.conditions.push(`${column} <= ?`);
        this.values.push(value);
        return this;
    }

    whereArray(column: string, values: any[]): this {
        if (values.length === 0) throw new Error(`Array values for ${column} cannot be empty.`);
        this.conditions.push(`${column} IN UNNEST(@${column})`);
        this.values.push({ name: column, value: values });
        return this;
    }

    wherePartition(column: string, value: string | number): this {
        this.conditions.push(`${column} = ?`);
        this.values.push(value);
        return this;
    }

    whereJsonField(column: string, jsonPath: string, value: any): this {
        this.conditions.push(`JSON_EXTRACT(${column}, "$.${jsonPath}") = ?`);
        this.values.push(value);
        return this;
    }

    whereStructField(structColumn: string, field: string, value: any): this {
        this.conditions.push(`${structColumn}.${field} = ?`);
        this.values.push(value);
        return this;
    }

    whereDateBetween(column: string, startDate: string, endDate: string): this {
        this.conditions.push(`${column} BETWEEN DATE(?) AND DATE(?)`);
        this.values.push(startDate, endDate);
        return this;
    }

    whereExtract(column: string, part: 'YEAR' | 'MONTH' | 'DAY', value: number): this {
        this.conditions.push(`EXTRACT(${part} FROM ${column}) = ?`);
        this.values.push(value);
        return this;
    }

    whereDayOfWeek(column: string, day: number): this {
        this.conditions.push(`EXTRACT(DAYOFWEEK FROM ${column}) = ?`);
        this.values.push(day);
        return this;
    }

    whereDateComparison(column1: string, operator: '=' | '>' | '<' | '>=' | '<=', column2: string): this {
        this.conditions.push(`${column1} ${operator} ${column2}`);
        return this;
    }

    whereCurrentDate(column: string): this {
        this.conditions.push(`${column} = CURRENT_DATE()`);
        return this;
    }

    whereTimestampBetween(column: string, startDate: string, endDate: string): this {
        this.conditions.push(`${column} BETWEEN TIMESTAMP(?) AND TIMESTAMP(?)`);
        this.values.push(startDate, endDate);
        return this;
    }

    whereDateTrunc(column: string, part: 'DAY' | 'MONTH' | 'YEAR', alias?: string): this {
        const truncatedColumn = `DATE_TRUNC(${column}, ${part})`;
        if (alias) {
            this.columns.push(`${truncatedColumn} AS ${alias}`);
        } else {
            this.columns.push(truncatedColumn);
        }
        return this;
    }

    whereTimestampTrunc(column: string, part: 'HOUR' | 'DAY' | 'MONTH' | 'YEAR', alias?: string): this {
        const truncatedColumn = `TIMESTAMP_TRUNC(${column}, ${part})`;
        if (alias) {
            this.columns.push(`${truncatedColumn} AS ${alias}`);
        } else {
            this.columns.push(truncatedColumn);
        }
        return this;
    }

    whereContains(column: string, searchTerm: string): this {
        this.conditions.push(`CONTAINS_SUBSTR(${column}, ?)`);
        this.values.push(searchTerm);
        return this;
    }

    whereArrayContains(column: string, value: any): this {
        this.conditions.push(`ARRAY_CONTAINS(?, ${column})`);
        this.values.push(value);
        return this;
    }

    whereArrayLength(column: string, length: number, operator: '=' | '>' | '<' | '>=' | '<='): this {
        this.conditions.push(`ARRAY_LENGTH(${column}) ${operator} ?`);
        this.values.push(length);
        return this;
    }

    whereNotEqualNullSafe(column: string, value: any): this {
        this.conditions.push(`${column} IS DISTINCT FROM ?`);
        this.values.push(value);
        return this;
    }

    whereRegexp(column: string, pattern: string): this {
        this.conditions.push(`REGEXP_CONTAINS(${column}, ?)`);
        this.values.push(pattern);
        return this;
    }

    // ─── GROUP BY & HAVING ───

    groupBy(columns: string[]): this {
        if (columns.length === 0) throw new Error("GroupBy requires at least one column.");
        this.groupByColumns = columns;
        return this;
    }

    having(conditions: Record<string, any>): this {
        if (Object.keys(conditions).length === 0) throw new Error("Having conditions cannot be empty.");
        const clauses = Object.entries(conditions).map(([key, value]) => `${key} = ?`);
        this.havingConditions.push(...clauses);
        this.havingValues.push(...Object.values(conditions));
        return this;
    }

    havingRaw(expression: string, values: any[] = []): this {
        this.havingConditions.push(expression);
        this.havingValues.push(...values);
        return this;
    }

    // ─── ORDER / LIMIT / OFFSET ───

    orderBy(order: { column: string; direction?: 'ASC' | 'DESC' }[]): this {
        if (order.length === 0) throw new Error("OrderBy requires at least one column.");
        this.orderByColumns = order.map((o) => `${o.column} ${o.direction || 'ASC'}`);
        return this;
    }

    orderByRaw(expression: string): this {
        this.orderByColumns.push(expression);
        return this;
    }

    limit(limit: number): this {
        if (limit < 0) throw new Error("Limit must be a positive number.");
        this.limitValue = limit;
        return this;
    }

    offset(offset: number): this {
        if (offset < 0) throw new Error("Offset must be a positive number.");
        this.offsetValue = offset;
        return this;
    }

    // ─── CTE (WITH) ───

    with(name: string, query: string): this {
        this.cteStatements.push({ name, query });
        return this;
    }

    // ─── UNION ───

    union(query: string, all: boolean = false): this {
        this.unionStatements.push({ query, all });
        return this;
    }

    // ─── TABLE SAMPLE ───

    tableSample(percentage: number): this {
        if (percentage <= 0 || percentage > 100) {
            throw new Error("Percentage must be between 0 and 100.");
        }
        this.tableSamplePercentage = percentage;
        return this;
    }

    // ─── UTILITY ───

    clone(): QueryBuilder {
        const cloned = new QueryBuilder(this.table);
        cloned.columns = [...this.columns];
        cloned.values = [...this.values];
        cloned.joins = [...this.joins];
        cloned.conditions = [...this.conditions];
        cloned.orConditions = this.orConditions.map(g => [...g]);
        cloned.havingConditions = [...this.havingConditions];
        cloned.havingValues = [...this.havingValues];
        cloned.setClauses = [...this.setClauses];
        cloned.groupByColumns = [...this.groupByColumns];
        cloned.orderByColumns = [...this.orderByColumns];
        cloned.limitValue = this.limitValue;
        cloned.offsetValue = this.offsetValue;
        cloned.aggregateFunctions = [...this.aggregateFunctions];
        cloned.queryType = this.queryType;
        cloned.tableSamplePercentage = this.tableSamplePercentage;
        cloned.isDistinct = this.isDistinct;
        cloned.cteStatements = this.cteStatements.map(c => ({ ...c }));
        cloned.unionStatements = this.unionStatements.map(u => ({ ...u }));
        return cloned;
    }

    reset(): this {
        this.columns = [];
        this.values = [];
        this.joins = [];
        this.conditions = [];
        this.orConditions = [];
        this.havingConditions = [];
        this.havingValues = [];
        this.setClauses = [];
        this.groupByColumns = [];
        this.orderByColumns = [];
        this.limitValue = undefined;
        this.offsetValue = undefined;
        this.aggregateFunctions = [];
        this.queryType = 'SELECT';
        this.tableSamplePercentage = undefined;
        this.isDistinct = false;
        this.cteStatements = [];
        this.unionStatements = [];
        return this;
    }

    toSQL(): string {
        return this.build().query;
    }

    getTable(): string {
        return this.table;
    }

    // ─── BUILD ───

    build(): { query: string; params: any[] } {
        let query = '';
        const allParams = [...this.values];

        const ctePrefix = this.cteStatements.length
            ? `WITH ${this.cteStatements.map(c => `${c.name} AS (${c.query})`).join(', ')} `
            : '';

        switch (this.queryType) {
            case 'SELECT': {
                const selectCols = this.aggregateFunctions.length
                    ? this.aggregateFunctions
                    : (this.columns.length ? this.columns : ['*']);
                const distinctKeyword = this.isDistinct ? 'DISTINCT ' : '';
                query = `${ctePrefix}SELECT ${distinctKeyword}${selectCols.join(', ')} FROM ${this.table}`;

                if (this.joins.length) {
                    query += ` ${this.joins.join(' ')}`;
                }

                if (this.tableSamplePercentage !== undefined) {
                    query += ` TABLESAMPLE SYSTEM (${this.tableSamplePercentage})`;
                }
                break;
            }

            case 'INSERT': {
                const placeholders = Array(this.values.length / this.columns.length)
                    .fill(`(${this.columns.map(() => '?').join(', ')})`)
                    .join(', ');
                query = `${ctePrefix}INSERT INTO ${this.table} (${this.columns.join(', ')}) VALUES ${placeholders}`;
                break;
            }

            case 'UPDATE':
                query = `${ctePrefix}UPDATE ${this.table} SET ${this.setClauses.join(', ')}`;
                break;

            case 'DELETE':
                query = `${ctePrefix}DELETE FROM ${this.table}`;
                break;
        }

        // WHERE clause: combine AND conditions with OR groups
        const whereParts: string[] = [];
        if (this.conditions.length) {
            whereParts.push(this.conditions.join(' AND '));
        }
        for (const orGroup of this.orConditions) {
            whereParts.push(`(${orGroup.join(' AND ')})`);
        }
        if (whereParts.length) {
            query += ` WHERE ${whereParts.join(' OR ')}`;
        }

        if (this.groupByColumns.length) query += ` GROUP BY ${this.groupByColumns.join(', ')}`;

        if (this.havingConditions.length) {
            query += ` HAVING ${this.havingConditions.join(' AND ')}`;
            allParams.push(...this.havingValues);
        }

        if (this.orderByColumns.length) query += ` ORDER BY ${this.orderByColumns.join(', ')}`;
        if (this.limitValue !== undefined) query += ` LIMIT ${this.limitValue}`;
        if (this.offsetValue !== undefined) query += ` OFFSET ${this.offsetValue}`;

        // UNION
        for (const u of this.unionStatements) {
            query += ` ${u.all ? 'UNION ALL' : 'UNION'} ${u.query}`;
        }

        return { query, params: allParams };
    }
}
