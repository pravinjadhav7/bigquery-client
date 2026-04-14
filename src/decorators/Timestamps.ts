import 'reflect-metadata';

export function CreatedAt(columnName?: string) {
  return function (target: any, propertyKey: string) {
    const name = columnName || propertyKey;
    const columns = (Reflect as any).getMetadata('columns', target.constructor) || [];
    columns.push({ propertyKey, columnName: name });
    (Reflect as any).defineMetadata('columns', columns, target.constructor);
    (Reflect as any).defineMetadata('createdAtColumn', name, target.constructor);
  };
}

export function UpdatedAt(columnName?: string) {
  return function (target: any, propertyKey: string) {
    const name = columnName || propertyKey;
    const columns = (Reflect as any).getMetadata('columns', target.constructor) || [];
    columns.push({ propertyKey, columnName: name });
    (Reflect as any).defineMetadata('columns', columns, target.constructor);
    (Reflect as any).defineMetadata('updatedAtColumn', name, target.constructor);
  };
}

export function SoftDelete(columnName?: string) {
  return function (target: any, propertyKey: string) {
    const name = columnName || propertyKey;
    const columns = (Reflect as any).getMetadata('columns', target.constructor) || [];
    columns.push({ propertyKey, columnName: name });
    (Reflect as any).defineMetadata('columns', columns, target.constructor);
    (Reflect as any).defineMetadata('softDeleteColumn', name, target.constructor);
  };
}
