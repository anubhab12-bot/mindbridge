import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.removeItem('mb_theme');
    localStorage.removeItem('mb_admin_theme');
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.removeItem('mb_theme');
    localStorage.removeItem('mb_admin_theme');
  });

  it('should initialize with a default theme', () => {
    expect(service.theme()).toBeDefined();
    expect(['light', 'dark']).toContain(service.theme());
  });

  it('should toggle theme between light and dark', () => {
    service.setTheme('light');
    expect(service.theme()).toBe('light');
    expect(service.isDark()).toBe(false);

    service.toggleTheme();
    expect(service.theme()).toBe('dark');
    expect(service.isDark()).toBe(true);

    service.toggleTheme();
    expect(service.theme()).toBe('light');
    expect(service.isDark()).toBe(false);
  });

  it('should persist theme to localStorage', () => {
    service.setTheme('dark');
    expect(localStorage.getItem('mb_theme')).toBe('dark');
    expect(localStorage.getItem('mb_admin_theme')).toBe('dark');

    service.setTheme('light');
    expect(localStorage.getItem('mb_theme')).toBe('light');
    expect(localStorage.getItem('mb_admin_theme')).toBe('light');
  });
});
