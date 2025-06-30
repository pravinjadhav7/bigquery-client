import 'reflect-metadata';

export function Relation(type: 'one-to-many' | 'many-to-one', target: Function, options?: any) {
  return function (targetClass: any, propertyKey: string) {
    const relations = (Reflect as any).getMetadata('relations', targetClass.constructor) || [];
    relations.push({ propertyKey, type, target, options });
    (Reflect as any).defineMetadata('relations', relations, targetClass.constructor);
  };
} 