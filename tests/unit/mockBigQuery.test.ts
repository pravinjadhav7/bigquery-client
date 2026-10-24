import { BigQueryClient } from '../../src/core/BigQueryClient';
import { mockBigQuery } from '../helpers/mockBigQuery';

jest.mock('@google-cloud/bigquery', () => require('../helpers/mockBigQuery').sdkModule);

describe('mockBigQuery helper', () => {
  let client: BigQueryClient;

  beforeEach(() => {
    mockBigQuery.reset();
    client = new BigQueryClient({ projectId: 'p', datasetId: 'd' });
  });

  it('records SQL, params and options for query()', async () => {
    mockBigQuery.queueQueryResult([{ id: 1 }]);
    const result = await client.query('SELECT * FROM t WHERE id = ?', [1]);

    expect(result.data).toEqual([{ id: 1 }]);
    expect(mockBigQuery.queries).toHaveLength(1);
    expect(mockBigQuery.lastQuery()).toEqual({
      method: 'query',
      sql: 'SELECT * FROM t WHERE id = ?',
      params: [1],
      options: { query: 'SELECT * FROM t WHERE id = ?', params: [1] },
    });
  });

  it('records the options the SDK was constructed with', () => {
    expect(mockBigQuery.constructions).toEqual([{ projectId: 'p' }]);
  });

  it('records dry-run jobs and table inserts', async () => {
    await client.explain('SELECT 1');
    await client.batchInsert('t', [{ a: 1 }]);

    expect(mockBigQuery.callsOf('createQueryJob')[0]).toMatchObject({
      sql: 'SELECT 1',
      options: { query: 'SELECT 1', dryRun: true },
    });
    expect(mockBigQuery.callsOf('table.insert')[0]).toMatchObject({
      dataset: 'd',
      table: 't',
      rows: [{ a: 1 }],
    });
  });

  it('serves queued errors and handlers, and reset() clears them', async () => {
    mockBigQuery.queueQueryError(new Error('boom'));
    await expect(client.query('SELECT 1')).rejects.toThrow('boom');

    mockBigQuery.onQuery((call) => (call.sql?.includes('users') ? [[{ n: 1 }]] : undefined));
    expect((await client.query('SELECT * FROM users')).data).toEqual([{ n: 1 }]);
    expect((await client.query('SELECT * FROM other')).data).toEqual([]);

    mockBigQuery.reset();
    expect(mockBigQuery.calls).toEqual([]);
    expect((await client.query('SELECT * FROM users')).data).toEqual([]);
  });
});
