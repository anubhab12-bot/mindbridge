import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { CompanionCharacterComponent } from './companion-character';

describe('CompanionCharacterComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompanionCharacterComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('renders the animated character button in the corner', async () => {
    const fixture = TestBed.createComponent(CompanionCharacterComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const btn = el.querySelector('.character-btn');
    expect(btn).toBeTruthy();
    expect(el.querySelector('.mindi-svg')).toBeTruthy();
  });

  it('toggles the companion popup card when clicked', async () => {
    const fixture = TestBed.createComponent(CompanionCharacterComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance.isOpen()).toBe(false);
    expect(el.querySelector('.companion-card')).toBeNull();

    fixture.componentInstance.toggleOpen();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.isOpen()).toBe(true);
    expect(el.querySelector('.companion-card')).toBeTruthy();
  });

  it('selects mood and presents guidance message', async () => {
    const fixture = TestBed.createComponent(CompanionCharacterComponent);
    fixture.componentInstance.isOpen.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const mood = fixture.componentInstance.moods[0];
    fixture.componentInstance.selectMood(mood);
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedMood()).toBe(mood);
  });

  it('starts and stops guided box breathing', () => {
    const fixture = TestBed.createComponent(CompanionCharacterComponent);
    expect(fixture.componentInstance.isBreathingActive()).toBe(false);

    fixture.componentInstance.toggleBreathing();
    expect(fixture.componentInstance.isBreathingActive()).toBe(true);
    expect(fixture.componentInstance.breathingPhase()).toBe('inhale');

    fixture.componentInstance.toggleBreathing();
    expect(fixture.componentInstance.isBreathingActive()).toBe(false);
  });

  it('sends quick prompt and navigates to companion route', () => {
    const fixture = TestBed.createComponent(CompanionCharacterComponent);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    fixture.componentInstance.promptInput = 'how to release stress';
    fixture.componentInstance.sendQuickPrompt();

    expect(navigateSpy).toHaveBeenCalledWith(['/patient/companion'], {
      queryParams: { prompt: 'how to release stress' },
    });
  });
});
