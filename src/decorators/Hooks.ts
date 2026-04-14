import 'reflect-metadata';

type HookType = 'beforeInsert' | 'afterInsert' | 'beforeUpdate' | 'afterUpdate' | 'beforeDelete' | 'afterDelete';

function createHookDecorator(hookType: HookType) {
  return function (target: any, propertyKey: string) {
    const hooks = (Reflect as any).getMetadata('hooks', target.constructor) || {};
    if (!hooks[hookType]) hooks[hookType] = [];
    hooks[hookType].push(propertyKey);
    (Reflect as any).defineMetadata('hooks', hooks, target.constructor);
  };
}

export const BeforeInsert = () => createHookDecorator('beforeInsert');
export const AfterInsert = () => createHookDecorator('afterInsert');
export const BeforeUpdate = () => createHookDecorator('beforeUpdate');
export const AfterUpdate = () => createHookDecorator('afterUpdate');
export const BeforeDelete = () => createHookDecorator('beforeDelete');
export const AfterDelete = () => createHookDecorator('afterDelete');
