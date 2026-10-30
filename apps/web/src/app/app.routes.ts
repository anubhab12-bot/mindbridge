import type { Routes } from '@angular/router';
import { Role } from '@mindbridge/shared-types';
import { authGuard, guestGuard, roleGuard, verifiedDoctorGuard } from './core/auth/guards';
import { AppShellComponent } from './layout/app-shell';
import { PublicLayoutComponent } from './layout/public-layout';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', title: 'MindBridge', loadComponent: () => import('./features/public/home').then((m) => m.HomePage) },
      { path: 'crisis', title: 'Get help now · MindBridge', loadComponent: () => import('./features/public/crisis').then((m) => m.CrisisPage) },
      { path: 'how-it-works', title: 'How it works · MindBridge', loadComponent: () => import('./features/public/info').then((m) => m.HowItWorksPage) },
      { path: 'for-professionals', title: 'For professionals · MindBridge', loadComponent: () => import('./features/public/info').then((m) => m.ForProfessionalsPage) },
      { path: 'self-help', title: 'Self-help · MindBridge', loadComponent: () => import('./features/shared/self-help').then((m) => m.SelfHelpListPage) },
      { path: 'self-help/:slug', title: 'Self-help · MindBridge', loadComponent: () => import('./features/shared/self-help').then((m) => m.SelfHelpDetailPage) },
      { path: 'professionals', title: 'Find a professional · MindBridge', loadComponent: () => import('./features/shared/professionals').then((m) => m.ProfessionalsPage) },
      { path: 'professionals/:id', title: 'Professional · MindBridge', loadComponent: () => import('./features/shared/professionals').then((m) => m.ProfessionalDetailPage) },
      { path: 'legal/:type', title: 'Policies · MindBridge', loadComponent: () => import('./features/public/legal').then((m) => m.LegalPage) },
      { path: 'login', title: 'Sign in · MindBridge', canActivate: [guestGuard], loadComponent: () => import('./features/auth/login').then((m) => m.LoginPage) },
      { path: 'register', title: 'Create an account · MindBridge', canActivate: [guestGuard], loadComponent: () => import('./features/auth/register').then((m) => m.RegisterPage) },
      { path: 'verify-email', title: 'Confirm your email · MindBridge', loadComponent: () => import('./features/auth/account-recovery').then((m) => m.VerifyEmailPage) },
      { path: 'forgot-password', title: 'Reset your password · MindBridge', loadComponent: () => import('./features/auth/account-recovery').then((m) => m.ForgotPasswordPage) },
      { path: 'reset-password', title: 'Choose a new password · MindBridge', loadComponent: () => import('./features/auth/account-recovery').then((m) => m.ResetPasswordPage) },
      { path: 'admin/overview', title: 'Admin Overview & Healthcare Analytics · MindBridge', loadComponent: () => import('./features/admin/overview').then((m) => m.AdminOverviewPage) },
      { path: 'impact', title: 'Community Impact & Healthcare Metrics · MindBridge', loadComponent: () => import('./features/admin/overview').then((m) => m.AdminOverviewPage) },
    ],
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { path: 'settings', title: 'Settings · MindBridge', loadComponent: () => import('./features/account/settings').then((m) => m.SettingsPage) },
      { path: 'notifications', title: 'Notifications · MindBridge', loadComponent: () => import('./features/account/notifications').then((m) => m.NotificationsPage) },
      { path: 'support', title: 'Help & support · MindBridge', canActivate: [roleGuard(Role.PATIENT, Role.DOCTOR)], loadComponent: () => import('./features/account/support').then((m) => m.SupportPage) },
      {
        path: 'patient',
        canActivate: [roleGuard(Role.PATIENT)],
        loadChildren: () => import('./features/patient/patient.routes').then((m) => m.PATIENT_ROUTES),
      },
      {
        path: 'doctor/verification-pending',
        title: 'Verification · MindBridge',
        canActivate: [roleGuard(Role.DOCTOR)],
        loadComponent: () => import('./features/doctor/verification').then((m) => m.VerificationPage),
      },
      {
        path: 'doctor/profile',
        title: 'Professional profile · MindBridge',
        canActivate: [roleGuard(Role.DOCTOR)],
        loadComponent: () => import('./features/doctor/profile').then((m) => m.DoctorProfilePage),
      },
      {
        path: 'doctor',
        canActivate: [roleGuard(Role.DOCTOR), verifiedDoctorGuard],
        loadChildren: () => import('./features/doctor/doctor.routes').then((m) => m.DOCTOR_ROUTES),
      },
      {
        path: 'admin',
        canActivate: [roleGuard(Role.ADMIN)],
        loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },
    ],
  },
  { path: '**', title: 'Page not found · MindBridge', loadComponent: () => import('./features/public/not-found').then((m) => m.NotFoundPage) },
];
