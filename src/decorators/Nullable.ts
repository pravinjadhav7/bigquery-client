import 'reflect-metadata';

export function Nullable() {
  return function (target: any, propertyKey: string) {
    const nullables = (Reflect as any).getMetadata('nullableColumns', target.constructor) || [];
    nullables.push(propertyKey);
    (Reflect as any).defineMetadata('nullableColumns', nullables, target.constructor);
  };
}

export function Required() {
  return function (target: any, propertyKey: string) {
    const required = (Reflect as any).getMetadata('requiredColumns', target.constructor) || [];
    required.push(propertyKey);
    (Reflect as any).defineMetadata('requiredColumns', required, target.constructor);
  };
}

export function Default(value: any) {
  return function (target: any, propertyKey: string) {
    const defaults = (Reflect as any).getMetadata('defaultValues', target.constructor) || {};
    defaults[propertyKey] = value;
    (Reflect as any).defineMetadata('defaultValues', defaults, target.constructor);
  };
}
