import 'reflect-metadata';

export function PrimaryColumn(columnName?: string) {
  return function (target: any, propertyKey: string) {
    const columns = (Reflect as any).getMetadata('columns', target.constructor) || [];
    columns.push({ propertyKey, columnName: columnName || propertyKey });
    (Reflect as any).defineMetadata('columns', columns, target.constructor);
    (Reflect as any).defineMetadata('primaryKey', columnName || propertyKey, target.constructor);
  };
}
