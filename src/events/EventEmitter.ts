export type EventType =
  | 'query:before'
  | 'query:after'
  | 'query:error'
  | 'entity:beforeInsert'
  | 'entity:afterInsert'
  | 'entity:beforeUpdate'
  | 'entity:afterUpdate'
  | 'entity:beforeDelete'
  | 'entity:afterDelete'
  | 'cache:hit'
  | 'cache:miss'
  | 'cache:evict'
  | 'connection:acquired'
  | 'connection:released'
  | 'connection:error'
  | 'migration:beforeUp'
  | 'migration:afterUp'
  | 'migration:beforeDown'
  | 'migration:afterDown'
  | string;

export interface QueryEvent {
  sql: string;
  params?: any[];
  executionTime?: number;
  bytesProcessed?: number;
  error?: Error;
  timestamp: string;
}

export interface EntityEvent {
  entity: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: string;
}

export type EventCallback = (event: any) => void | Promise<void>;

export class BigQueryEventEmitter {
  private listeners: Map<string, EventCallback[]> = new Map();
  private wildcardListeners: EventCallback[] = [];

  on(event: EventType, callback: EventCallback): this {
    if (event === '*') {
      this.wildcardListeners.push(callback);
      return this;
    }
    const callbacks = this.listeners.get(event) || [];
    callbacks.push(callback);
    this.listeners.set(event, callbacks);
    return this;
  }

  once(event: EventType, callback: EventCallback): this {
    const wrappedCallback: EventCallback = async (data) => {
      this.off(event, wrappedCallback);
      await callback(data);
    };
    return this.on(event, wrappedCallback);
  }

  off(event: EventType, callback?: EventCallback): this {
    if (event === '*') {
      if (callback) {
        this.wildcardListeners = this.wildcardListeners.filter(cb => cb !== callback);
      } else {
        this.wildcardListeners = [];
      }
      return this;
    }

    if (!callback) {
      this.listeners.delete(event);
      return this;
    }

    const callbacks = this.listeners.get(event) || [];
    this.listeners.set(event, callbacks.filter(cb => cb !== callback));
    return this;
  }

  async emit(event: EventType, data?: any): Promise<void> {
    const callbacks = this.listeners.get(event) || [];
    const allCallbacks = [...callbacks, ...this.wildcardListeners];

    for (const callback of allCallbacks) {
      await callback({ type: event, ...data });
    }
  }

  removeAllListeners(): this {
    this.listeners.clear();
    this.wildcardListeners = [];
    return this;
  }

  listenerCount(event: EventType): number {
    if (event === '*') return this.wildcardListeners.length;
    return (this.listeners.get(event) || []).length;
  }

  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }
}
