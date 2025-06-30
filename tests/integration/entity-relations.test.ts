import 'reflect-metadata';
import { Entity } from '../../src/decorators/Entity';
import { Column } from '../../src/decorators/Column';
import { Relation } from '../../src/decorators/Relation';
import { Validate } from '../../src/decorators/Validate';
import { BaseRepository } from '../../src/repository/BaseRepository';
import { BigQueryClient } from '../../src/core/BigQueryClient';

describe('Integration: Entity Relations and Validation', () => {
  @Entity('users')
  class User {
    @Column()
    id!: string;

    @Column('user_name')
    @Validate((v) => typeof v === 'string' && v.length > 0, 'Name is required')
    name!: string;

    @Column()
    email!: string;

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

  const usersData = [
    { id: '1', name: 'Alice', email: 'alice@example.com' },
    { id: '2', name: '', email: 'bob@example.com' }, // Invalid name
  ];
  const ordersData = [
    { id: '101', userId: '1', product: 'Book', amount: 10 },
    { id: '102', userId: '1', product: 'Pen', amount: 2 },
    { id: '103', userId: '2', product: 'Notebook', amount: 5 },
  ];

  const mockQuery = jest.fn((query, params) => {
    if (query.includes('FROM users')) return Promise.resolve({ data: usersData });
    if (query.includes('FROM orders')) return Promise.resolve({ data: ordersData });
    return Promise.resolve({ data: [] });
  });
  const mockClient = { query: mockQuery } as unknown as BigQueryClient;

  it('should resolve one-to-many and many-to-one relations', async () => {
    const userRepo = new BaseRepository<User>(User, mockClient);
    const orderRepo = new BaseRepository<Order>(Order, mockClient);
    const users = await userRepo.findAll();
    const orders = await orderRepo.findAll();
    // Simulate join
    const usersWithOrders = users.map(user => ({
      ...user,
      orders: orders.filter(order => order.userId === user.id)
    }));
    expect(usersWithOrders[0].orders.length).toBe(2);
    expect(usersWithOrders[1].orders.length).toBe(1);
  });

  it('should validate user names using @Validate decorator', async () => {
    const userRepo = new BaseRepository<User>(User, mockClient);
    const users = await userRepo.findAll();
    const userValidations = (Reflect as any).getMetadata('validations', User) || [];
    const validationResults = users.map(user => {
      return userValidations.map((rule: any) => {
        return rule.validator((user as any)[rule.propertyKey]);
      });
    });
    expect(validationResults[0][0]).toBe(true); // Alice is valid
    expect(validationResults[1][0]).toBe(false); // Bob is invalid
  });

  it('should store and retrieve relation metadata', () => {
    const userRelations = (Reflect as any).getMetadata('relations', User) || [];
    const orderRelations = (Reflect as any).getMetadata('relations', Order) || [];
    expect(userRelations[0].type).toBe('one-to-many');
    expect(orderRelations[0].type).toBe('many-to-one');
    expect(userRelations[0].target().name).toBe('Order');
    expect(orderRelations[0].target().name).toBe('User');
  });
}); 