import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventRegistry } from '@delphinet/shared-types';

@Injectable()
export class TypedEventEmitter {
  constructor(private readonly emitter: EventEmitter2) {}

  emit<K extends keyof EventRegistry>(event: K, payload: EventRegistry[K]): boolean {
    return this.emitter.emit(event as string, payload);
  }

  on<K extends keyof EventRegistry>(event: K, listener: (payload: EventRegistry[K]) => void): this {
    this.emitter.on(event as string, listener);
    return this;
  }
}
