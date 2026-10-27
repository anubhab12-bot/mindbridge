import type { Routes } from '@angular/router';

export const PATIENT_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', title: 'Home · MindBridge', loadComponent: () => import('./dashboard').then((m) => m.PatientDashboardPage) },
  { path: 'companion', title: 'AI companion · MindBridge', loadComponent: () => import('./companion').then((m) => m.CompanionPage) },
  { path: 'companion/:conversationId', title: 'AI companion · MindBridge', loadComponent: () => import('./companion').then((m) => m.CompanionPage) },
  { path: 'mood', title: 'Mood · MindBridge', loadComponent: () => import('./mood').then((m) => m.MoodPage) },
  { path: 'journal', title: 'Journal · MindBridge', loadComponent: () => import('./journal').then((m) => m.JournalPage) },
  { path: 'self-help', title: 'Self-help · MindBridge', loadComponent: () => import('../shared/self-help').then((m) => m.SelfHelpListPage) },
  { path: 'self-help/:slug', title: 'Self-help · MindBridge', loadComponent: () => import('../shared/self-help').then((m) => m.SelfHelpDetailPage) },
  { path: 'professionals', title: 'Find a professional · MindBridge', loadComponent: () => import('../shared/professionals').then((m) => m.ProfessionalsPage) },
  { path: 'professionals/:id', title: 'Professional · MindBridge', loadComponent: () => import('../shared/professionals').then((m) => m.ProfessionalDetailPage) },
  { path: 'appointments', title: 'Appointments · MindBridge', loadComponent: () => import('../shared/appointments').then((m) => m.AppointmentsPage) },
  { path: 'appointments/:id', title: 'Appointment · MindBridge', loadComponent: () => import('../shared/appointments').then((m) => m.AppointmentDetailPage) },
  { path: 'messages', title: 'Messages · MindBridge', loadComponent: () => import('../shared/messages').then((m) => m.MessagesPage) },
  { path: 'privacy', title: 'Privacy & data · MindBridge', loadComponent: () => import('./privacy').then((m) => m.PrivacyPage) },
];
