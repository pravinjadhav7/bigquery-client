import 'reflect-metadata';

export function Validate(validator: (value: any) => boolean, message?: string) {
  return function (target: any, propertyKey: string) {
    const validations = (Reflect as any).getMetadata('validations', target.constructor) || [];
    validations.push({ propertyKey, validator, message });
    (Reflect as any).defineMetadata('validations', validations, target.constructor);
  };
} 