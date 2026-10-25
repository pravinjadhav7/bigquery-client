import 'reflect-metadata';
import { Entity } from '../../../src/decorators/Entity';
import { Column } from '../../../src/decorators/Column';
import { BaseRepository } from '../../../src/repository/BaseRepository';
import { BigQueryClient } from '../../../src/core/BigQueryClient';
import { mockBigQuery } from '../../helpers/mockBigQuery';

// Only the SDK is mocked; BigQueryClient and BaseRepository run for real.
jest.mock('@google-cloud/bigquery', () => require('../../helpers/mockBigQuery').sdkModule);

describe('BaseRepository', () => {
  @Entity('test_table')
  class TestEntity {
    @Column()
    id!: string;
    @Column('custom_name')
    name!: string;
  }

  const T = '`test-project.test-dataset.test_table`';
  let client: BigQueryClient;
  let repo: BaseRepository<TestEntity>;

  beforeEach(() => {
    mockBigQuery.reset();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    client = new BigQueryClient({ projectId: 'test-project', datasetId: 'test-dataset' });
    repo = new BaseRepository<TestEntity>(TestEntity, client);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should get table name from metadata', () => {
    expect(repo.getTableName()).toBe('test_table');
  });

  it('should get columns from metadata', () => {
    expect(repo.getColumns()).toEqual([
      { propertyKey: 'id', columnName: 'id' },
      { propertyKey: 'name', columnName: 'custom_name' }
    ]);
  });

  it('should select the entity columns in findAll', async () => {
    mockBigQuery.queueQueryResult([{ id: '1', custom_name: 'Test' }]);
    await repo.findAll();

    expect(mockBigQuery.queries).toHaveLength(1);
    expect(mockBigQuery.lastQuery()?.sql).toMatch(/^SELECT id, custom_name FROM /);
  });

  // TODO(bug: repository-unqualified-table): findAll queries bare `test_table` instead of
  // `project.dataset.test_table`, which BigQuery rejects without a default dataset.
  test.failing('should qualify the table with project and dataset in findAll', async () => {
    await repo.findAll();

    expect(mockBigQuery.lastQuery()?.sql).toBe(`SELECT id, custom_name FROM ${T}`);
  });

  // TODO(bug: repository-no-column-mapping): rows come back keyed by BigQuery column name
  // (custom_name) and are returned as-is instead of being mapped to the entity property (name).
  test.failing('should map column names back to entity properties in findAll', async () => {
    mockBigQuery.queueQueryResult([{ id: '1', custom_name: 'Test' }]);

    const result = await repo.findAll();

    expect(result).toEqual([{ id: '1', name: 'Test' }]);
  });

  it('should return single entity from findById', async () => {
    mockBigQuery.queueQueryResult([{ id: '1', custom_name: 'Test' }]);

    const result = await repo.findById('1');

    expect(mockBigQuery.lastQuery()).toMatchObject({
      sql: expect.stringMatching(/^SELECT id, custom_name FROM .* WHERE id = \?$/),
      params: ['1']
    });
    expect(result).toMatchObject({ id: '1' });
  });

  // TODO(bug: repository-no-column-mapping): see findAll above.
  test.failing('should map column names back to entity properties in findById', async () => {
    mockBigQuery.queueQueryResult([{ id: '1', custom_name: 'Test' }]);

    expect(await repo.findById('1')).toEqual({ id: '1', name: 'Test' });
  });

  it('should return null from findById when no row matches', async () => {
    expect(await repo.findById('missing')).toBeNull();
  });

  it('should insert into the entity table on create', async () => {
    await repo.create({ id: '2', name: 'New' });

    expect(mockBigQuery.lastQuery()).toMatchObject({
      sql: expect.stringMatching(new RegExp(`^INSERT INTO ${T} \\(`)),
      params: ['2', 'New']
    });
  });

  // TODO(bug: repository-no-column-mapping): create writes entity property names (`name`) as column
  // names; the table column is `custom_name`.
  test.failing('should write custom column names on create', async () => {
    await repo.create({ id: '2', name: 'New' });

    expect(mockBigQuery.lastQuery()).toMatchObject({
      sql: `INSERT INTO ${T} (id, custom_name) VALUES (?, ?)`,
      params: ['2', 'New']
    });
  });

  it('should update by primary key on update', async () => {
    await repo.update('1', { name: 'Updated' });

    expect(mockBigQuery.callsOf('createQueryJob')[0]).toMatchObject({
      sql: expect.stringMatching(new RegExp(`^UPDATE ${T} SET .* WHERE id = \\?$`)),
      params: ['Updated', '1']
    });
  });

  // TODO(bug: repository-no-column-mapping): update SETs `name`, not the `custom_name` column.
  test.failing('should SET custom column names on update', async () => {
    await repo.update('1', { name: 'Updated' });

    expect(mockBigQuery.callsOf('createQueryJob')[0]?.sql).toBe(`UPDATE ${T} SET custom_name = ? WHERE id = ?`);
  });

  it('should delete by primary key on delete', async () => {
    await repo.delete('1');

    expect(mockBigQuery.callsOf('createQueryJob')[0]).toMatchObject({
      sql: `DELETE FROM ${T} WHERE id = ?`,
      params: ['1']
    });
  });

  it('should delete by the primary key without any extra verification query', async () => {
    mockBigQuery.queueJobStatistics({ query: { numDmlAffectedRows: '1' } });

    await repo.delete('1');

    expect(mockBigQuery.calls).toHaveLength(1);
    expect(mockBigQuery.calls[0].sql).not.toContain('user_id');
    expect(mockBigQuery.calls[0].params).not.toContain(undefined);
  });
});
