import 'reflect-metadata';

export interface IndexOptions {
  unique?: boolean;
  name?: string;
}

export function Index(options?: IndexOptions) {
  return function (target: any, propertyKey: string) {
    const indexes = (Reflect as any).getMetadata('indexes', target.constructor) || [];
    indexes.push({
      propertyKey,
      unique: options?.unique || false,
      name: options?.name || `idx_${propertyKey}`
    });
    (Reflect as any).defineMetadata('indexes', indexes, target.constructor);
  };
}

export function Unique(name?: string) {
  return function (target: any, propertyKey: string) {
    const indexes = (Reflect as any).getMetadata('indexes', target.constructor) || [];
    indexes.push({
      propertyKey,
      unique: true,
      name: name || `uniq_${propertyKey}`
    });
    (Reflect as any).defineMetadata('indexes', indexes, target.constructor);
  };
}
