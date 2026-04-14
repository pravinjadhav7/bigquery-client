import { BigQueryClient } from "./BigQueryClient";

export class Transaction {
    private client: BigQueryClient;
    private queries: { query: string, params?: any[] }[] = [];
    private committed = false;
    private rolledBack = false;

    constructor(client: BigQueryClient) {
        this.client = client;
    }

    addQuery(query: string, params: any[] = []): this {
        if (this.committed || this.rolledBack) {
            throw new Error('Transaction already finalized');
        }
        this.queries.push({ query, params });
        return this;
    }

    async execute(): Promise<any[]> {
        if (this.committed) throw new Error('Transaction already committed');
        if (this.rolledBack) throw new Error('Transaction was rolled back');

        const results: any[] = [];
        try {
            for (const { query, params } of this.queries) {
                const result = await this.client.query(query, params);
                results.push(result);
            }
            this.committed = true;
            return results;
        } catch (error) {
            this.rolledBack = true;
            throw error;
        }
    }

    /** @deprecated Use execute() instead */
    async excute(): Promise<void> {
        await this.execute();
    }

    async executeScript(): Promise<any> {
        if (this.committed) throw new Error('Transaction already committed');
        if (this.rolledBack) throw new Error('Transaction was rolled back');

        const script = [
            'BEGIN',
            'BEGIN TRANSACTION;',
            ...this.queries.map(q => q.query + ';'),
            'COMMIT TRANSACTION;',
            'EXCEPTION WHEN ERROR THEN',
            '  ROLLBACK TRANSACTION;',
            '  RAISE;',
            'END;'
        ].join('\n');

        try {
            const result = await this.client.query(script);
            this.committed = true;
            return result;
        } catch (error) {
            this.rolledBack = true;
            throw error;
        }
    }

    getQueries(): { query: string; params?: any[] }[] {
        return [...this.queries];
    }

    isCommitted(): boolean {
        return this.committed;
    }

    isRolledBack(): boolean {
        return this.rolledBack;
    }

    reset(): void {
        this.queries = [];
        this.committed = false;
        this.rolledBack = false;
    }
}
