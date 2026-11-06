import type { Routes } from '@angular/router';
import { AdminPermission } from '@mindbridge/shared-types';
import { adminPermissionGuard } from '../../core/auth/guards';

export const ADMIN_ROUTES: Routes = [
  { path: '', redirectTo: 'today', pathMatch: 'full' },
  { path: 'today', title: 'Worklist · MindBridge Admin', loadComponent: () => import('./today').then((m) => m.AdminTodayPage) },
  { path: 'safety-triage', title: 'Safety Triage Board · MindBridge Admin', canActivate: [adminPermissionGuard(AdminPermission.SAFETY_TRIAGE)], loadComponent: () => import('./safety-triage').then((m) => m.SafetyTriagePage) },
  { path: 'overview', title: 'Analytics & Overview · MindBridge Admin', loadComponent: () => import('./overview').then((m) => m.AdminOverviewPage) },
  { path: 'verifications', title: 'Verifications · MindBridge Admin', canActivate: [adminPermissionGuard(AdminPermission.DOCTORS_VERIFY)], loadComponent: () => import('./verifications').then((m) => m.VerificationsPage) },
  { path: 'verifications/:id', title: 'Review application · MindBridge Admin', canActivate: [adminPermissionGuard(AdminPermission.DOCTORS_VERIFY)], loadComponent: () => import('./verifications').then((m) => m.VerificationReviewPage) },
  { path: 'users', title: 'Users · MindBridge Admin', canActivate: [adminPermissionGuard(AdminPermission.USERS_MANAGE)], loadComponent: () => import('./users').then((m) => m.UsersPage) },
  { path: 'crisis-resources', title: 'Crisis resources · MindBridge Admin', canActivate: [adminPermissionGuard(AdminPermission.CRISIS_MANAGE)], loadComponent: () => import('./crisis-resources').then((m) => m.CrisisResourcesAdminPage) },
  { path: 'content', title: 'Content · MindBridge Admin', canActivate: [adminPermissionGuard(AdminPermission.CONTENT_MANAGE)], loadComponent: () => import('./content').then((m) => m.ContentAdminPage) },
  { path: 'feedback', title: 'Feedback · MindBridge Admin', canActivate: [adminPermissionGuard(AdminPermission.CONTENT_MANAGE)], loadComponent: () => import('./content').then((m) => m.FeedbackAdminPage) },
  { path: 'support', title: 'Support · MindBridge Admin', canActivate: [adminPermissionGuard(AdminPermission.SUPPORT_MANAGE)], loadComponent: () => import('./support').then((m) => m.SupportAdminPage) },
  { path: 'audit', title: 'Audit log · MindBridge Admin', canActivate: [adminPermissionGuard(AdminPermission.AUDIT_READ)], loadComponent: () => import('./audit').then((m) => m.AuditPage) },
  { path: 'security', title: 'Security · MindBridge Admin', canActivate: [adminPermissionGuard(AdminPermission.SECURITY_MANAGE)], loadComponent: () => import('./audit').then((m) => m.SecurityPage) },
  { path: 'settings', title: 'AI & settings · MindBridge Admin', canActivate: [adminPermissionGuard(AdminPermission.SETTINGS_MANAGE)], loadComponent: () => import('./settings').then((m) => m.AdminSettingsPage) },
];
