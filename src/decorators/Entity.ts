import 'reflect-metadata';

declare global {
  interface Reflect {
    defineMetadata(metadataKey: any, metadataValue: any, target: Object): void;
    getMetadata(metadataKey: any, target: Object): any;
  }
}

export function Entity(tableName: string) {
  return function (constructor: Function) {
    (Reflect as any).defineMetadata('tableName', tableName, constructor);
  };
} 