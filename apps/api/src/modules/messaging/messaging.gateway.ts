import { Logger } from '@nestjs/common';
import { type OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

/**
 * Push-only realtime channel. Clients authenticate with their access token in the handshake
 * (`auth.token`); the same checks as HTTP requests apply (session, status, role). Clients never
 * send messages over the socket: writes go through the REST API so validation, authorization
 * and auditing live in one place. Events carry ids only, never message content.
 */
@WebSocketGateway({
  namespace: '/realtime',
  // Allowed origins are enforced in main/bootstrap via the CORS allowlist adapter.
  cors: { origin: (process.env['CORS_ORIGINS'] ?? 'http://localhost:4200').split(',').map((s) => s.trim()), credentials: true },
})
export class MessagingGateway implements OnGatewayConnection {
  private readonly logger = new Logger(MessagingGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly auth: JwtAuthGuard) {}

  async handleConnection(client: Socket) {
    const token = typeof client.handshake.auth?.['token'] === 'string' ? (client.handshake.auth['token'] as string) : undefined;
    const user = token ? await this.auth.resolve(token).catch(() => null) : null;
    if (!user) {
      client.emit('error', { code: 'UNAUTHENTICATED' });
      client.disconnect(true);
      return;
    }
    await client.join(`user:${user.id}`);
    // Re-validate periodically so logout or suspension disconnects open sockets.
    const timer = setInterval(async () => {
      const still = await this.auth.resolve(token!).catch(() => null);
      if (!still) client.disconnect(true);
    }, 60_000);
    client.on('disconnect', () => clearInterval(timer));
  }

  notifyUser(userId: string, event: string, payload: Record<string, unknown>) {
    try {
      this.server?.to(`user:${userId}`).emit(event, payload);
    } catch (err) {
      this.logger.warn(`realtime emit failed: ${(err as Error).message}`);
    }
  }
}
