import 'reflect-metadata';
import { Entity } from '../../../src/decorators/Entity';
import { Column } from '../../../src/decorators/Column';

describe('Entity and Column Decorators', () => {
  @Entity('test_table')
  class TestEntity {
    @Column()
    id!: string;

    @Column('custom_name')
    name!: string;
  }

  it('should set table name metadata', () => {
    const tableName = (Reflect as any).getMetadata('tableName', TestEntity);
    expect(tableName).toBe('test_table');
  });

  it('should set columns metadata', () => {
    const columns = (Reflect as any).getMetadata('columns', TestEntity) || [];
    expect(columns).toEqual([
      { propertyKey: 'id', columnName: 'id' },
      { propertyKey: 'name', columnName: 'custom_name' }
    ]);
  });
}); 