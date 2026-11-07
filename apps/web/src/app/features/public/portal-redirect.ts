import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'mb-portal-redirect',
  template: '',
})
export class PortalRedirectComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  ngOnInit() {
    const qp = this.route.snapshot.queryParams;
    void this.router.navigate(['/patient/dashboard'], { queryParams: qp, replaceUrl: true });
  }
}
