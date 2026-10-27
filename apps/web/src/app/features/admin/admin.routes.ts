import type { Routes } from '@angular/router';
import { AdminPermission } from '@mindbridge/shared-types';
import { adminPermissionGuard } from '../../core/auth/guards';

export const ADMIN_ROUTES: Routes = [
  { path: '', title: 'Admin · MindBridge', loadComponent: () => import('./overview').then((m) => m.AdminOverviewPage) },
  { path: 'verifications', title: 'Verifications · MindBridge', canActivate: [adminPermissionGuard(AdminPermission.DOCTORS_VERIFY)], loadComponent: () => import('./verifications').then((m) => m.VerificationsPage) },
  { path: 'verifications/:id', title: 'Review application · MindBridge', canActivate: [adminPermissionGuard(AdminPermission.DOCTORS_VERIFY)], loadComponent: () => import('./verifications').then((m) => m.VerificationReviewPage) },
  { path: 'users', title: 'Users · MindBridge', canActivate: [adminPermissionGuard(AdminPermission.USERS_MANAGE)], loadComponent: () => import('./users').then((m) => m.UsersPage) },
  { path: 'crisis-resources', title: 'Crisis resources · MindBridge', canActivate: [adminPermissionGuard(AdminPermission.CRISIS_MANAGE)], loadComponent: () => import('./crisis-resources').then((m) => m.CrisisResourcesAdminPage) },
  { path: 'content', title: 'Content · MindBridge', canActivate: [adminPermissionGuard(AdminPermission.CONTENT_MANAGE)], loadComponent: () => import('./content').then((m) => m.ContentAdminPage) },
  { path: 'feedback', title: 'Feedback · MindBridge', canActivate: [adminPermissionGuard(AdminPermission.CONTENT_MANAGE)], loadComponent: () => import('./content').then((m) => m.FeedbackAdminPage) },
  { path: 'support', title: 'Support · MindBridge', canActivate: [adminPermissionGuard(AdminPermission.SUPPORT_MANAGE)], loadComponent: () => import('./support').then((m) => m.SupportAdminPage) },
  { path: 'audit', title: 'Audit log · MindBridge', canActivate: [adminPermissionGuard(AdminPermission.AUDIT_READ)], loadComponent: () => import('./audit').then((m) => m.AuditPage) },
  { path: 'security', title: 'Security · MindBridge', canActivate: [adminPermissionGuard(AdminPermission.SECURITY_MANAGE)], loadComponent: () => import('./audit').then((m) => m.SecurityPage) },
  { path: 'settings', title: 'AI & settings · MindBridge', canActivate: [adminPermissionGuard(AdminPermission.SETTINGS_MANAGE)], loadComponent: () => import('./settings').then((m) => m.AdminSettingsPage) },
];
