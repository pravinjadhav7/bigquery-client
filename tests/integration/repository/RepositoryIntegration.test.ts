import 'reflect-metadata';
import { Entity } from '../../../src/decorators/Entity';
import { Column } from '../../../src/decorators/Column';
import { Relation } from '../../../src/decorators/Relation';
import { Validate } from '../../../src/decorators/Validate';
import { BaseRepository } from '../../../src/repository/BaseRepository';
import { BigQueryClient } from '../../../src/core/BigQueryClient';

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
    const userRepo = new BaseRepository<User>(User, mockClient);
    const orderRepo = new BaseRepository<Order>(Order, mockClient);
    const users = await userRepo.findAll();
    const orders = await orderRepo.findAll();
    // Simulate join
    const usersWithOrders = users.map((user: any) => ({
      ...user,
      orders: orders.filter((order: any) => order.userId === user.id)
    }));
    expect(usersWithOrders[0].orders).toBeDefined();
  });
}); 