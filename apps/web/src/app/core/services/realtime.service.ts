import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { io, type Socket } from 'socket.io-client';
import { AuthService } from '../auth/auth.service';

/** Push channel for "something changed" events. Payloads contain ids only, never content. */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly auth = inject(AuthService);
  private socket: Socket | null = null;
  readonly connected = signal(false);

  connect() {
    if (this.socket || !this.auth.token) return;
    this.socket = io('/realtime', {
      path: '/socket.io',
      transports: ['websocket'],
      auth: (cb) => cb({ token: this.auth.token }),
      reconnectionDelayMax: 30_000,
    });
    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', () => this.connected.set(false));
  }

  on(event: string, handler: (payload: Record<string, unknown>) => void, destroyRef?: DestroyRef) {
    this.connect();
    this.socket?.on(event, handler);
    destroyRef?.onDestroy(() => this.socket?.off(event, handler));
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.connected.set(false);
  }
}
