import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypedEventEmitter } from './typed-event-emitter.service';

@Global()
@Module({
  imports: [EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' })],
  providers: [TypedEventEmitter],
  exports: [TypedEventEmitter],
})
export class EventBusModule {}
