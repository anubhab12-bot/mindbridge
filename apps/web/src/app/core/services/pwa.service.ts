import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PwaService {
  private deferredPrompt: any = null;

  readonly canInstall = signal<boolean>(false);
  readonly isInstalled = signal<boolean>(false);
  readonly modalOpen = signal<boolean>(false);

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    // Check if already installed / standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      this.isInstalled.set(true);
    }

    // Capture beforeinstallprompt for Chrome / Android / Edge
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.canInstall.set(true);
    });

    // Detect successful installation
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canInstall.set(false);
      this.isInstalled.set(true);
      this.modalOpen.set(false);
    });
  }

  openDownloadModal() {
    this.modalOpen.set(true);
  }

  closeDownloadModal() {
    this.modalOpen.set(false);
  }

  async installApp(): Promise<boolean> {
    if (!this.deferredPrompt) {
      // If native prompt not triggered yet, open the illustrated modal
      this.openDownloadModal();
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        this.canInstall.set(false);
        this.deferredPrompt = null;
        this.modalOpen.set(false);
        return true;
      }
    } catch {
      // Fallback
    }
    return false;
  }
}
