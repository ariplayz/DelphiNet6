import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { EventRegistry } from '@delphinet/shared-types';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/ws' })
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  private readonly logger = new Logger(AppGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @OnEvent('attendance.entry_recorded')
  handleAttendanceEntry(payload: EventRegistry['attendance.entry_recorded']): void {
    this.server.to(`school:${payload.schoolId}`).emit('attendance:update', payload);
  }

  @OnEvent('attendance.weekly_reset')
  handleWeeklyReset(payload: EventRegistry['attendance.weekly_reset']): void {
    this.server.to(`school:${payload.schoolId}`).emit('attendance:reset', payload);
  }
}
