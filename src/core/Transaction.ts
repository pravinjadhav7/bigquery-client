import { BigQueryClient } from "./BigQueryClient";

export class Transaction {
    private client: BigQueryClient;
    private queries: { query: string, params?: any[] }[] = [];

    constructor(client: BigQueryClient) {
        this.client = client;
    }

    /**
     * 
     * @param query query to run 
     * @param params query params
     */
    addQuery(query: string, params: any[] = []): void {
        this.queries.push({ query, params });
    }

    /**
     * Execute all queries in the transaction
     * @returns 
     * 
    */
    async excute(): Promise<void> {
        try {
            for (const { query, params } of this.queries) {
                await this.client.query(query, params);
            }
        } catch (error) {
            console.error('Error executing transaction', error);
            throw error;
        }

    }
}