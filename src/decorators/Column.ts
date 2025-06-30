import 'reflect-metadata';

declare global {
  interface Reflect {
    defineMetadata(metadataKey: any, metadataValue: any, target: Object): void;
    getMetadata(metadataKey: any, target: Object): any;
  }
}

export function Column(columnName?: string) {
  return function (target: any, propertyKey: string) {
    const columns = (Reflect as any).getMetadata('columns', target.constructor) || [];
    columns.push({ propertyKey, columnName: columnName || propertyKey });
    (Reflect as any).defineMetadata('columns', columns, target.constructor);
  };
} 