import 'reflect-metadata';
import { Entity } from '../../../src/decorators/Entity';
import { Column } from '../../../src/decorators/Column';
import { Relation } from '../../../src/decorators/Relation';
import { Validate } from '../../../src/decorators/Validate';
import { BaseRepository } from '../../../src/repository/BaseRepository';
import { BigQueryClient } from '../../../src/core/BigQueryClient';
import { mockBigQuery } from '../../helpers/mockBigQuery';

// Only the SDK is mocked; BigQueryClient and BaseRepository run for real.
jest.mock('@google-cloud/bigquery', () => require('../../helpers/mockBigQuery').sdkModule);

describe('Repository Integration (Advanced Features)', () => {
  @Entity('users')
  class User {
    @Column()
    id!: string;
    @Column('user_name')
    @Validate((v) => typeof v === 'string' && v.length > 0, 'Name is required')
    name!: string;
    @Relation('one-to-many', () => Order)
    orders?: Order[];
  }

  @Entity('orders')
  class Order {
    @Column()
    id!: string;
    @Column()
    userId!: string;
    @Column()
    product!: string;
    @Column()
    amount!: number;
    @Relation('many-to-one', () => User)
    user?: User;
  }

  let client: BigQueryClient;

  beforeEach(() => {
    mockBigQuery.reset();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    client = new BigQueryClient({ projectId: 'test-project', datasetId: 'test-dataset' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should store and retrieve relation metadata', () => {
    const relations = (Reflect as any).getMetadata('relations', User) || [];
    expect(relations).toEqual([
      { propertyKey: 'orders', type: 'one-to-many', target: expect.any(Function), options: undefined }
    ]);
  });

  it('should store and retrieve validation metadata', () => {
    const validations = (Reflect as any).getMetadata('validations', User) || [];
    expect(validations[0].propertyKey).toBe('name');
    expect(typeof validations[0].validator).toBe('function');
    expect(validations[0].message).toBe('Name is required');
  });

  it('should validate entity property using validation decorator', () => {
    const validations = (Reflect as any).getMetadata('validations', User) || [];
    const user = { id: '1', name: '' };
    const failed = validations.filter((rule: any) => !rule.validator((user as any)[rule.propertyKey]));
    expect(failed.length).toBeGreaterThan(0);
    expect(failed[0].message).toBe('Name is required');
  });

  it('should call repository methods and handle relations', async () => {
    mockBigQuery.onQuery((call) => {
      if (/\busers\b/.test(call.sql ?? '')) return [[{ id: '1', user_name: 'Test' }]];
      if (/\borders\b/.test(call.sql ?? '')) {
        return [[{ id: '101', userId: '1', product: 'Book', amount: 10 }]];
      }
      return undefined;
    });
    const userRepo = new BaseRepository<User>(User, client);
    const orderRepo = new BaseRepository<Order>(Order, client);
    const users = await userRepo.findAll();
    const orders = await orderRepo.findAll();
    expect(mockBigQuery.queries.map(q => q.sql)).toEqual([
      expect.stringMatching(/^SELECT id, user_name FROM .*users$/),
      expect.stringMatching(/^SELECT id, userId, product, amount FROM .*orders$/),
    ]);
    // Simulate join
    const usersWithOrders = users.map((user: any) => ({
      ...user,
      orders: orders.filter((order: any) => order.userId === user.id)
    }));
    expect(usersWithOrders[0].orders).toHaveLength(1);
  });
});
