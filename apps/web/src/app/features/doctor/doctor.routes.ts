import type { Routes } from '@angular/router';

export const DOCTOR_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', title: 'Dashboard · MindBridge', loadComponent: () => import('./dashboard').then((m) => m.DoctorDashboardPage) },
  { path: 'appointments', title: 'Appointments · MindBridge', loadComponent: () => import('../shared/appointments').then((m) => m.AppointmentsPage) },
  { path: 'appointments/:id', title: 'Appointment · MindBridge', loadComponent: () => import('../shared/appointments').then((m) => m.AppointmentDetailPage) },
  { path: 'patients', title: 'Patients · MindBridge', loadComponent: () => import('./patients').then((m) => m.PatientsPage) },
  { path: 'patients/:patientId', title: 'Patient · MindBridge', loadComponent: () => import('./patient-detail').then((m) => m.PatientDetailPage) },
  { path: 'messages', title: 'Messages · MindBridge', loadComponent: () => import('../shared/messages').then((m) => m.MessagesPage) },
  { path: 'ai-assist', title: 'AI drafting · MindBridge', loadComponent: () => import('./ai-assist').then((m) => m.AiAssistPage) },
  { path: 'availability', title: 'Availability · MindBridge', loadComponent: () => import('./availability').then((m) => m.AvailabilityPage) },
  { path: 'verification', title: 'Verification · MindBridge', loadComponent: () => import('./verification').then((m) => m.VerificationPage) },
];
