import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialogComponent } from './shared/ui/confirm';
import { ToastOutletComponent } from './shared/ui/toast-outlet';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastOutletComponent, ConfirmDialogComponent],
  template: `<router-outlet /><mb-toasts /><mb-confirm-dialog />`,
})
export class App {}
