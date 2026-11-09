import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialogComponent } from './shared/ui/confirm';
import { ToastOutletComponent } from './shared/ui/toast-outlet';
import { CompanionCharacterComponent } from './shared/ui/companion-character';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    ToastOutletComponent,
    ConfirmDialogComponent,
    CompanionCharacterComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<router-outlet /><mb-toasts /><mb-confirm-dialog /><mb-companion-character />`,
})
export class App {}
