import { BigQueryClient } from "./BigQueryClient";


interface PoolConfig {
    projectId: string;
    datasetId: string;
    maxConnections?: number;
}

/**
 * Pool of BigQuery clients to manage multiple connections to BigQuery
 */
/**
 * Represents a pool of BigQuery clients.
 */
export class Pool {
    private clients: BigQueryClient[] = [];
    private config: PoolConfig;
    private currentIndex = 0;

    /**
     * Creates an instance of Pool.
     * @param config - The configuration for the pool.
     */
    constructor(config: PoolConfig) {
        this.config = config;
        const maxConnections = config.maxConnections || 10;

        for (let i = 0; i < maxConnections; i++) {
            this.clients.push(new BigQueryClient(config));
        }
    }

    /**
     * Retrieves a BigQuery client from the pool in a round-robin fashion.
     * @returns A BigQuery client.
     */
    getClient(): BigQueryClient {
        const client = this.clients[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.clients.length;
        return client;
    }
}