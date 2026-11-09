import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialogComponent } from './shared/ui/confirm';
import { ToastOutletComponent } from './shared/ui/toast-outlet';
import { CompanionCharacterComponent } from './shared/ui/companion-character';
import { QaBugReporterComponent } from './shared/ui/qa-bug-reporter';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    ToastOutletComponent,
    ConfirmDialogComponent,
    CompanionCharacterComponent,
    QaBugReporterComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<router-outlet /><mb-toasts /><mb-confirm-dialog /><mb-companion-character /><mb-qa-bug-reporter />`,
})
export class App {}
