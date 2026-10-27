import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../api/api.service';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  readAt: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly api = inject(ApiService);
  readonly unread = signal(0);

  async refreshCount() {
    try {
      const res = await this.api.get<{ unread: number }>('/notifications/unread-count');
      this.unread.set(res.unread);
    } catch {
      /* non-critical */
    }
  }

  list(page = 1) {
    return this.api.page<AppNotification>('/notifications', { page, pageSize: 20 });
  }

  async markRead(id: string) {
    await this.api.post(`/notifications/${id}/read`);
    await this.refreshCount();
  }

  async markAllRead() {
    await this.api.post('/notifications/read-all');
    this.unread.set(0);
  }
}
