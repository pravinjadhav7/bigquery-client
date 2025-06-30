import 'reflect-metadata';
import { Entity } from '../../../src/decorators/Entity';
import { Column } from '../../../src/decorators/Column';
import { BaseRepository } from '../../../src/repository/BaseRepository';
import { BigQueryClient } from '../../../src/core/BigQueryClient';

describe('BaseRepository', () => {
  @Entity('test_table')
  class TestEntity {
    @Column()
    id!: string;
    @Column('custom_name')
    name!: string;
  }

  const mockQuery = jest.fn().mockResolvedValue({ data: [{ id: '1', name: 'Test' }] });
  const mockInsert = jest.fn().mockResolvedValue({});
  const mockUpdate = jest.fn().mockResolvedValue({});
  const mockDelete = jest.fn().mockResolvedValue({});
  const mockClient = {
    query: mockQuery,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete
  } as unknown as BigQueryClient;

  it('should get table name from metadata', () => {
    const repo = new BaseRepository<TestEntity>(TestEntity, mockClient);
    expect(repo.getTableName()).toBe('test_table');
  });

  it('should get columns from metadata', () => {
    const repo = new BaseRepository<TestEntity>(TestEntity, mockClient);
    expect(repo.getColumns()).toEqual([
      { propertyKey: 'id', columnName: 'id' },
      { propertyKey: 'name', columnName: 'custom_name' }
    ]);
  });

  it('should return data from findAll using BigQueryClient', async () => {
    const repo = new BaseRepository<TestEntity>(TestEntity, mockClient);
    const result = await repo.findAll();
    expect(result).toEqual([{ id: '1', name: 'Test' }]);
    expect(mockQuery).toHaveBeenCalled();
  });

  it('should return single entity from findById', async () => {
    mockQuery.mockResolvedValueOnce({ data: [{ id: '1', name: 'Test' }] });
    const repo = new BaseRepository<TestEntity>(TestEntity, mockClient);
    const result = await repo.findById('1');
    expect(result).toEqual({ id: '1', name: 'Test' });
  });

  it('should call insert on create', async () => {
    const repo = new BaseRepository<TestEntity>(TestEntity, mockClient);
    await repo.create({ id: '2', name: 'New' });
    expect(mockInsert).toHaveBeenCalledWith({ table: 'test_table', rows: [{ id: '2', name: 'New' }] });
  });

  it('should call update on update', async () => {
    const repo = new BaseRepository<TestEntity>(TestEntity, mockClient);
    await repo.update('1', { name: 'Updated' });
    expect(mockUpdate).toHaveBeenCalledWith({ table: 'test_table', set: { name: 'Updated' }, where: { id: '1' } });
  });

  it('should call delete on delete', async () => {
    const repo = new BaseRepository<TestEntity>(TestEntity, mockClient);
    await repo.delete('1');
    expect(mockDelete).toHaveBeenCalledWith({ table: 'test_table', where: { id: '1' } });
  });
}); 