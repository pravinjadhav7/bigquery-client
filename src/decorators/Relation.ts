import 'reflect-metadata';

export type RelationType = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';

export interface RelationOptions {
  foreignKey?: string;
  referenceKey?: string;
  joinTable?: string;
  eager?: boolean;
  cascade?: boolean;
}

export function Relation(type: RelationType, target: () => Function, options?: RelationOptions) {
  return function (targetClass: any, propertyKey: string) {
    const relations = (Reflect as any).getMetadata('relations', targetClass.constructor) || [];
    relations.push({
      propertyKey,
      type,
      target,
      foreignKey: options?.foreignKey,
      referenceKey: options?.referenceKey,
      joinTable: options?.joinTable,
      eager: options?.eager || false,
      cascade: options?.cascade || false
    });
    (Reflect as any).defineMetadata('relations', relations, targetClass.constructor);
  };
}

export function OneToOne(target: () => Function, options?: Omit<RelationOptions, 'joinTable'>) {
  return Relation('one-to-one', target, options);
}

export function OneToMany(target: () => Function, options?: Omit<RelationOptions, 'joinTable'>) {
  return Relation('one-to-many', target, options);
}

export function ManyToOne(target: () => Function, options?: Omit<RelationOptions, 'joinTable'>) {
  return Relation('many-to-one', target, options);
}

export function ManyToMany(target: () => Function, options?: RelationOptions) {
  return Relation('many-to-many', target, options);
}
