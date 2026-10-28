import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AccountStatus,
  AdminPermission,
  ALL_ADMIN_PERMISSIONS,
  type PageMeta,
  Role,
} from '@mindbridge/shared-types';
import { ApiService } from '../../core/api/api.service';
import { errorMessage } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/ui/pagination';
import { EmptyStateComponent, LoadingComponent } from '../../shared/ui/states';
import { humanize } from '../../shared/util/format';

interface UserRow {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  status: AccountStatus;
  emailVerified: boolean;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  adminPermissions?: AdminPermission[];
}

@Component({
  selector: 'mb-admin-users',
  imports: [DatePipe, FormsModule, LoadingComponent, EmptyStateComponent, PaginationComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>Users</h1>
        <p>Account administration. Health information is not shown here.</p>
      </header>
      <form class="row filters" (ngSubmit)="load()" role="search">
        <input
          class="input"
          name="q"
          [(ngModel)]="q"
          placeholder="Name or email"
          aria-label="Search"
        />
        <select class="input" name="role" [(ngModel)]="role" aria-label="Role">
          <option value="">All roles</option>
          @for (r of roles; track r) {
            <option [value]="r">{{ h(r) }}</option>
          }
        </select>
        <select class="input" name="status" [(ngModel)]="status" aria-label="Status">
          <option value="">All statuses</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ h(s) }}</option>
          }
        </select>
        <button class="btn" type="submit">Search</button>
      </form>
      @if (loading()) {
        <mb-loading [lines]="5" />
      } @else if (!rows().length) {
        <mb-empty title="No users found" />
      } @else {
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Security</th>
                <th>Last sign-in</th>
                <th><span class="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              @for (u of rows(); track u.id) {
                <tr>
                  <td>
                    {{ u.displayName }}
                    <div class="small muted">{{ u.email }}</div>
                  </td>
                  <td>{{ h(u.role) }}</td>
                  <td>
                    <span class="badge" [class.badge-danger]="u.status === 'SUSPENDED'">{{
                      h(u.status)
                    }}</span>
                  </td>
                  <td class="small">
                    {{ u.emailVerified ? 'Email ✓' : 'Email ✗' }} ·
                    {{ u.mfaEnabled ? 'MFA ✓' : 'MFA ✗' }}
                  </td>
                  <td class="small">
                    {{ u.lastLoginAt ? (u.lastLoginAt | date: 'short') : 'Never' }}
                  </td>
                  <td>
                    @if (u.id !== me()) {
                      @if (u.status === 'ACTIVE') {
                        <button
                          class="btn btn-ghost btn-sm"
                          type="button"
                          (click)="selected.set(u); action = 'suspend'"
                        >
                          Suspend
                        </button>
                      }
                      @if (u.status === 'SUSPENDED') {
                        <button class="btn btn-ghost btn-sm" type="button" (click)="reactivate(u)">
                          Reactivate
                        </button>
                      }
                      @if (u.role === 'ADMIN' && canSecurity()) {
                        <button class="btn btn-ghost btn-sm" type="button" (click)="editPerms(u)">
                          Permissions
                        </button>
                      }
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <mb-pagination [meta]="meta()" (page)="load($event)" />
      }

      @if (selected(); as u) {
        <section class="card panel">
          @if (action === 'suspend') {
            <h2>Suspend {{ u.displayName }}</h2>
            <p class="small muted">They will be signed out everywhere and unable to sign in.</p>
            <div class="field">
              <label for="reason">Reason (recorded in the audit log)</label
              ><textarea
                id="reason"
                class="textarea"
                [(ngModel)]="reason"
                maxlength="500"
              ></textarea>
            </div>
            <div class="row">
              <button
                class="btn btn-danger"
                type="button"
                (click)="suspend(u)"
                [disabled]="reason.trim().length < 5"
              >
                Suspend</button
              ><button class="btn btn-ghost" type="button" (click)="selected.set(null)">
                Cancel
              </button>
            </div>
          } @else {
            <h2>Permissions for {{ u.displayName }}</h2>
            @for (p of allPerms; track p) {
              <label class="checkbox"
                ><input
                  type="checkbox"
                  [checked]="perms().includes(p)"
                  (change)="togglePerm(p)"
                /><span>{{ p }}</span></label
              >
            }
            <div class="row">
              <button class="btn" type="button" (click)="savePerms(u)">Save</button
              ><button class="btn btn-ghost" type="button" (click)="selected.set(null)">
                Cancel
              </button>
            </div>
          }
        </section>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .filters {
      margin-bottom: var(--mb-space-4);
    }
    .filters .input {
      width: auto;
      min-width: 160px;
    }
    .panel {
      margin-top: var(--mb-space-4);
      max-width: 640px;
    }
  `,
})
export class UsersPage {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly roles = Object.values(Role);
  protected readonly statuses = Object.values(AccountStatus);
  protected readonly allPerms = ALL_ADMIN_PERMISSIONS;
  protected readonly h = humanize;
  protected readonly me = computed(() => this.auth.user()?.id);
  protected readonly canSecurity = computed(
    () => this.auth.user()?.adminPermissions?.includes(AdminPermission.SECURITY_MANAGE) ?? false,
  );
  protected readonly rows = signal<UserRow[]>([]);
  protected readonly meta = signal<PageMeta | null>(null);
  protected readonly loading = signal(true);
  protected readonly selected = signal<UserRow | null>(null);
  protected readonly perms = signal<AdminPermission[]>([]);
  protected q = '';
  protected role = '';
  protected status = '';
  protected reason = '';
  protected action: 'suspend' | 'perms' = 'suspend';

  constructor() {
    void this.load();
  }

  async load(page = 1) {
    this.loading.set(true);
    try {
      const res = await this.api.page<UserRow>('/admin/users', {
        q: this.q.trim(),
        role: this.role,
        status: this.status,
        page,
        pageSize: 20,
      });
      this.rows.set(res.items);
      this.meta.set(res.meta);
    } catch (err) {
      this.toast.error(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async suspend(u: UserRow) {
    try {
      await this.api.post(`/admin/users/${u.id}/suspend`, { reason: this.reason.trim() });
      this.reason = '';
      this.selected.set(null);
      this.toast.success('User suspended.');
      await this.load(this.meta()?.page ?? 1);
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  async reactivate(u: UserRow) {
    try {
      await this.api.post(`/admin/users/${u.id}/reactivate`);
      await this.load(this.meta()?.page ?? 1);
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  editPerms(u: UserRow) {
    this.action = 'perms';
    this.perms.set([...(u.adminPermissions ?? [])]);
    this.selected.set(u);
  }

  togglePerm(p: AdminPermission) {
    this.perms.update((l) => (l.includes(p) ? l.filter((x) => x !== p) : [...l, p]));
  }

  async savePerms(u: UserRow) {
    try {
      await this.api.put(`/admin/users/${u.id}/permissions`, { permissions: this.perms() });
      this.selected.set(null);
      this.toast.success('Permissions updated.');
      await this.load(this.meta()?.page ?? 1);
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }
}
