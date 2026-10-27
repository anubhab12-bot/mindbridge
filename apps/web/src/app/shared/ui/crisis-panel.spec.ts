import { TestBed } from '@angular/core/testing';
import type { CrisisResourcesResponse } from '@mindbridge/shared-types';
import { CrisisPanelComponent } from './crisis-panel';

const DATA: CrisisResourcesResponse = {
  country: 'IN',
  fallbackAdvice: 'Call your local emergency number.',
  resources: [
    {
      id: 'r1',
      name: 'Example line',
      country: 'IN',
      serviceType: 'MENTAL_HEALTH_HELPLINE',
      phone: '1-800-000 0000',
      languages: ['en'],
      availability: '24x7',
      sourceUrl: 'https://example.org/source',
      verifiedAt: '2026-10-01T00:00:00Z',
    },
  ],
};

describe('CrisisPanelComponent', () => {
  it('renders registry numbers as tel: links and always shows fallback advice', async () => {
    const fixture = TestBed.createComponent(CrisisPanelComponent);
    fixture.componentRef.setInput('data', DATA);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector('a[href^="tel:"]') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('tel:18000000000');
    expect(el.textContent).toContain('Call your local emergency number.');
    expect(el.textContent).toContain('not an emergency service');
  });

  it('shows no phone numbers when the registry has none for the country', async () => {
    const fixture = TestBed.createComponent(CrisisPanelComponent);
    fixture.componentRef.setInput('data', { ...DATA, resources: [] });
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a[href^="tel:"]')).toBeNull();
    expect(el.textContent).toContain("don't have a verified crisis line");
  });
});
