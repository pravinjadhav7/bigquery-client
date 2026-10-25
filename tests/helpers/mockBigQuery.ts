/**
 * Test double for the @google-cloud/bigquery SDK boundary.
 *
 * Only the SDK is replaced; everything in src/ runs for real. Every call that
 * would reach BigQuery is recorded (SQL, params, full options) and answered from
 * a queue or handler the test controls, so no network or credentials are used.
 *
 * Usage (jest hoists jest.mock above the imports):
 *
 *   jest.mock('@google-cloud/bigquery', () => require('../helpers/mockBigQuery').sdkModule);
 *   import { mockBigQuery } from '../helpers/mockBigQuery';
 *
 *   beforeEach(() => mockBigQuery.reset());
 *   mockBigQuery.queueQueryResult([{ id: 1 }]);
 *   await client.select(...);
 *   expect(mockBigQuery.lastQuery()?.sql).toBe('...');
 */

export type RecordedMethod =
  | 'query'
  | 'createQueryJob'
  | 'table.insert'
  | 'table.get'
  | 'table.create'
  | 'dataset.create';

export interface RecordedCall {
  method: RecordedMethod;
  /** SQL text for query / createQueryJob calls. */
  sql?: string;
  /** Positional or named params passed alongside the SQL. */
  params?: unknown;
  /** The full options object (or raw arguments for non-query calls). */
  options?: any;
  dataset?: string;
  table?: string;
  rows?: unknown[];
}

type QueryResponse = [any[], ...any[]];
type QueryHandler = (call: RecordedCall) => QueryResponse | Promise<QueryResponse> | undefined;

const EMPTY_RESPONSE = (): QueryResponse => [[], { totalBytesProcessed: '0' }];

class MockBigQueryState {
  calls: RecordedCall[] = [];
  /** Options each `new BigQuery(...)` was constructed with. */
  constructions: any[] = [];

  private queryQueue: Array<QueryResponse | Error> = [];
  private nextErrors: Error[] = [];
  private handler?: QueryHandler;
  private insertResult: any = [{}];
  private jobStatistics: any[] = [];

  /** Clear recorded calls and every queued response/handler. Call in beforeEach. */
  reset(): void {
    this.calls = [];
    this.constructions = [];
    this.queryQueue = [];
    this.nextErrors = [];
    this.handler = undefined;
    this.insertResult = [{}];
    this.jobStatistics = [];
  }

  /** Queue the `statistics` the next `createQueryJob()` job reports, e.g. `{ query: { numDmlAffectedRows: '3' } }`. */
  queueJobStatistics(statistics: any): this {
    this.jobStatistics.push(statistics);
    return this;
  }

  takeJobStatistics(): any {
    return this.jobStatistics.shift() ?? { totalBytesProcessed: '0' };
  }

  /** Queue the next `query()` response as `[rows, apiResponse]`. Falls back to empty rows. */
  queueQueryResult(rows: any[], apiResponse: any = { totalBytesProcessed: '0' }): this {
    this.queryQueue.push([rows, apiResponse]);
    return this;
  }

  /** Queue an error for the next `query()` call. */
  queueQueryError(error: Error): this {
    this.queryQueue.push(error);
    return this;
  }

  /** Make the very next SDK call of any kind reject with `error`. */
  failNextCall(error: Error): this {
    this.nextErrors.push(error);
    return this;
  }

  /**
   * Compute `query()` responses from the recorded call, e.g. by SQL text.
   * Queued results take precedence; return undefined to fall through to the default.
   */
  onQuery(handler: QueryHandler): this {
    this.handler = handler;
    return this;
  }

  setInsertResult(result: any): this {
    this.insertResult = result;
    return this;
  }

  /** Calls of one method, in order. */
  callsOf(method: RecordedMethod): RecordedCall[] {
    return this.calls.filter((c) => c.method === method);
  }

  /** All `query()` calls, in order. */
  get queries(): RecordedCall[] {
    return this.callsOf('query');
  }

  lastQuery(): RecordedCall | undefined {
    return this.queries[this.queries.length - 1];
  }

  // ---- used by the SDK stand-in below ----

  record(call: RecordedCall): void {
    this.calls.push(call);
  }

  takeError(): Error | undefined {
    return this.nextErrors.shift();
  }

  async answerQuery(call: RecordedCall): Promise<QueryResponse> {
    const queued = this.queryQueue.shift();
    if (queued instanceof Error) throw queued;
    if (queued) return queued;
    const handled = await this.handler?.(call);
    return handled ?? EMPTY_RESPONSE();
  }

  answerInsert(): any {
    return this.insertResult;
  }
}

export const mockBigQuery = new MockBigQueryState();

function normaliseQueryArgs(arg: any): Pick<RecordedCall, 'sql' | 'params' | 'options'> {
  if (typeof arg === 'string') return { sql: arg, options: { query: arg } };
  return { sql: arg?.query, params: arg?.params, options: arg };
}

function makeTable(datasetId: string, tableId: string) {
  const guard = async () => {
    const err = mockBigQuery.takeError();
    if (err) throw err;
  };
  return {
    insert: async (rows: unknown, options?: any) => {
      mockBigQuery.record({
        method: 'table.insert',
        dataset: datasetId,
        table: tableId,
        rows: rows as unknown[],
        options,
      });
      await guard();
      return mockBigQuery.answerInsert();
    },
    get: async (options?: any) => {
      mockBigQuery.record({ method: 'table.get', dataset: datasetId, table: tableId, options });
      await guard();
      return [{}, {}];
    },
    create: async (options?: any) => {
      mockBigQuery.record({ method: 'table.create', dataset: datasetId, table: tableId, options });
      await guard();
      return [{}, {}];
    },
  };
}

class MockBigQuery {
  constructor(options?: any) {
    mockBigQuery.constructions.push(options);
  }

  async query(arg: any): Promise<QueryResponse> {
    const call: RecordedCall = { method: 'query', ...normaliseQueryArgs(arg) };
    mockBigQuery.record(call);
    const err = mockBigQuery.takeError();
    if (err) throw err;
    return mockBigQuery.answerQuery(call);
  }

  async createQueryJob(arg: any): Promise<[any]> {
    const call: RecordedCall = { method: 'createQueryJob', ...normaliseQueryArgs(arg) };
    mockBigQuery.record(call);
    const err = mockBigQuery.takeError();
    if (err) throw err;
    const metadata = { statistics: mockBigQuery.takeJobStatistics(), dryRun: !!arg?.dryRun };
    return [{ metadata, getQueryResults: async () => [[]], getMetadata: async () => [metadata] }] as any;
  }

  dataset(datasetId: string) {
    return {
      table: (tableId: string) => makeTable(datasetId, tableId),
      create: async (options?: any) => {
        mockBigQuery.record({ method: 'dataset.create', dataset: datasetId, options });
        const err = mockBigQuery.takeError();
        if (err) throw err;
        return [{}, {}];
      },
    };
  }
}

/** Drop-in replacement for the `@google-cloud/bigquery` module. */
export const sdkModule = { BigQuery: MockBigQuery };
