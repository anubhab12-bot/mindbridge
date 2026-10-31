import { Injectable, signal, computed } from '@angular/core';

export interface DoctorDutyInfo {
  id: string;
  name: string;
  role: string;
  experience: string;
  qualification: string;
  avatar: string;
  status: 'ONLINE' | 'BUSY';
  rating: number;
  languages: string[];
}

export interface ActiveCall {
  id: string;
  patientName: string;
  doctor: DoctorDutyInfo;
  mode: 'VIDEO' | 'CHAT';
  urgency: 'Standard' | 'Urgent' | 'Crisis Support';
  startTime: Date;
  status: 'RINGING' | 'CONNECTED' | 'ENDED';
}

export interface ChatMessage {
  id: string;
  sender: 'PATIENT' | 'DOCTOR';
  senderName: string;
  text: string;
  time: string;
}

@Injectable({ providedIn: 'root' })
export class TelehealthService {
  // Available on-duty specialists for instant sessions
  readonly onDutyDoctors = signal<DoctorDutyInfo[]>([
    {
      id: 'doc-aarav',
      name: 'Dr. Aarav Mehta',
      role: 'Senior Neuro-Psychiatrist',
      experience: '14 yrs exp',
      qualification: 'MBBS, MD (Psychiatry), AIIMS',
      avatar: '👨‍⚕️',
      status: 'ONLINE',
      rating: 4.9,
      languages: ['English', 'Hindi', 'Bengali'],
    },
    {
      id: 'doc-sunita',
      name: 'Dr. Sunita Sen',
      role: 'Clinical Psychologist & Trauma Specialist',
      experience: '11 yrs exp',
      qualification: 'PhD Clinical Psychology, M.Phil',
      avatar: '👩‍⚕️',
      status: 'ONLINE',
      rating: 4.95,
      languages: ['English', 'Bengali', 'Hindi'],
    },
    {
      id: 'doc-priya',
      name: 'Dr. Priya Sharma',
      role: 'Consultant Psychiatrist & Anxiety Coach',
      experience: '9 yrs exp',
      qualification: 'MBBS, DPM (NIMHANS)',
      avatar: '🩺',
      status: 'ONLINE',
      rating: 4.88,
      languages: ['English', 'Hindi'],
    },
  ]);

  // Current active call session
  readonly currentCall = signal<ActiveCall | null>(null);
  readonly isRinging = computed(() => this.currentCall()?.status === 'RINGING');
  readonly isConnected = computed(() => this.currentCall()?.status === 'CONNECTED');

  // In-call chat messages
  readonly inCallMessages = signal<ChatMessage[]>([]);

  // Telehealth launcher modal state
  readonly launcherOpen = signal(false);

  // Web Audio Context & Ringtone interval for Teams sound
  private audioCtx: AudioContext | null = null;
  private ringInterval: any = null;

  constructor() {
    this.loadTopExperiencedDoctors();

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'mb_telehealth_call' && e.newValue) {
          try {
            const call = JSON.parse(e.newValue);
            if (call.status === 'RINGING' && !this.currentCall()) {
              this.currentCall.set(call);
              this.startTeamsRingtone();
            }
          } catch {}
        } else if (e.key === 'mb_telehealth_event' && e.newValue?.startsWith('ENDED')) {
          this.endCall();
        }
      });
    }
  }

  /**
   * Load the top 3 registered doctors ranked by years of experience from the API
   */
  async loadTopExperiencedDoctors() {
    if (typeof fetch === 'undefined') return;
    try {
      const res = await fetch('/api/v1/doctors/top-experienced');
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data?.data || [];
        if (items.length > 0) {
          const mapped: DoctorDutyInfo[] = items.slice(0, 3).map((d: any, idx: number) => {
            const avatars = ['👨‍⚕️', '👩‍⚕️', '🩺'];
            return {
              id: d.id,
              name: d.displayName,
              role: d.professionalCategory ? d.professionalCategory.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Specialist',
              experience: `${d.yearsExperience || 10} yrs exp`,
              qualification: d.qualifications?.join(', ') || 'AIIMS Certified',
              avatar: avatars[idx % avatars.length],
              status: 'ONLINE',
              rating: d.ratingAverage || 4.9,
              languages: d.languages || ['English', 'Hindi', 'Bengali'],
            };
          });
          this.onDutyDoctors.set(mapped);
        }
      }
    } catch {
      // Retain fallback doctors if offline or during build
    }
  }

  /**
   * Book an appointment with a doctor and send meeting link emails to patient & doctor
   */
  async bookAndSendEmail(doctorId: string, startAt?: string, reason?: string) {
    const res = await fetch('/api/v1/appointments/telehealth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctorId, startAt, reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Could not schedule video consultation.');
    }
    return await res.json();
  }

  /**
   * Resend video meeting link email to patient & doctor
   */
  async resendEmail(appointmentId: string) {
    const res = await fetch(`/api/v1/appointments/${appointmentId}/resend-video`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error('Failed to resend video meeting link.');
    }
    return await res.json();
  }

  openLauncher() {
    this.launcherOpen.set(true);
  }

  closeLauncher() {
    this.launcherOpen.set(false);
  }

  /**
   * Patient initiates an instant call (Video or Chat) to a professional
   */
  initiateCall(
    mode: 'VIDEO' | 'CHAT' = 'VIDEO',
    doctorId?: string,
    patientName: string = 'You (Patient)',
    urgency: 'Standard' | 'Urgent' | 'Crisis Support' = 'Standard',
  ) {
    const doc =
      this.onDutyDoctors().find((d) => d.id === doctorId) || this.onDutyDoctors()[0];

    const newCall: ActiveCall = {
      id: 'call_' + Date.now(),
      patientName: patientName.trim() || 'You (Patient)',
      doctor: doc,
      mode,
      urgency,
      startTime: new Date(),
      status: 'RINGING',
    };

    this.currentCall.set(newCall);
    this.launcherOpen.set(false);

    try {
      localStorage.setItem('mb_telehealth_call', JSON.stringify(newCall));
      localStorage.setItem('mb_telehealth_event', 'RINGING_' + Date.now());
    } catch {}

    // Initial greeting in chat
    this.inCallMessages.set([
      {
        id: 'msg_welcome',
        sender: 'DOCTOR',
        senderName: doc.name,
        text: `Hello, I'm ${doc.name}. I'm here with you. Please take a deep breath. How are you feeling right now?`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    // Start Microsoft Teams style ringing sound
    this.startTeamsRingtone();
  }

  /**
   * Specialist or Patient accepts the incoming call
   */
  acceptCall() {
    const call = this.currentCall();
    if (!call) return;

    this.stopTeamsRingtone();
    this.currentCall.set({
      ...call,
      status: 'CONNECTED',
    });

    try {
      localStorage.setItem('mb_telehealth_event', 'ACCEPTED_' + Date.now());
    } catch {}
  }

  /**
   * Decline / reject incoming call
   */
  declineCall() {
    this.stopTeamsRingtone();
    this.currentCall.set(null);

    try {
      localStorage.removeItem('mb_telehealth_call');
      localStorage.setItem('mb_telehealth_event', 'ENDED_' + Date.now());
    } catch {}
  }

  /**
   * End connected call
   */
  endCall() {
    this.stopTeamsRingtone();
    this.currentCall.set(null);
    this.inCallMessages.set([]);

    try {
      localStorage.removeItem('mb_telehealth_call');
      localStorage.setItem('mb_telehealth_event', 'ENDED_' + Date.now());
    } catch {}
  }

  /**
   * Send a message inside the active call room
   */
  sendChatMessage(text: string, senderName: string = 'Patient') {
    if (!text.trim()) return;

    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'PATIENT',
      senderName,
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    this.inCallMessages.update((prev) => [...prev, newMsg]);

    // Simulated empathetic clinical response after 1.5 seconds if talking to doctor
    const doc = this.currentCall()?.doctor;
    if (doc) {
      setTimeout(() => {
        if (this.currentCall()?.status === 'CONNECTED') {
          const docReplies = [
            `I hear you. Thank you for sharing that with me. Let's explore that feeling together.`,
            `You are in a safe, confidential space right now. Take all the time you need.`,
            `That sounds very challenging. How long have you been carrying this stress?`,
            `Let's try a gentle grounding exercise together while we talk.`,
          ];
          const randomReply = docReplies[Math.floor(Math.random() * docReplies.length)];
          this.inCallMessages.update((prev) => [
            ...prev,
            {
              id: 'msg_doc_' + Date.now(),
              sender: 'DOCTOR',
              senderName: doc.name,
              text: randomReply,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      }, 1500);
    }
  }

  /**
   * Synthesize Microsoft Teams incoming call ringtone via Web Audio API
   */
  private startTeamsRingtone() {
    this.stopTeamsRingtone();

    try {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioCtx = new AudioContextClass();
      if (this.audioCtx.state === 'suspended') {
        void this.audioCtx.resume();
      }

      const playTeamsPhrase = () => {
        if (!this.audioCtx || this.currentCall()?.status !== 'RINGING') return;

        // Microsoft Teams 4-note chime sequence:
        // F5 (698Hz), Ab5 (830Hz), C6 (1046Hz), Eb6 (1244Hz)
        const notes = [
          { freq: 698.46, delay: 0.0, dur: 0.12 },
          { freq: 830.61, delay: 0.14, dur: 0.12 },
          { freq: 1046.5, delay: 0.28, dur: 0.12 },
          { freq: 1244.51, delay: 0.42, dur: 0.35 },
        ];

        const now = this.audioCtx.currentTime;
        notes.forEach(({ freq, delay, dur }) => {
          if (!this.audioCtx) return;
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + delay);

          // Smooth attack and soft exponential release
          gain.gain.setValueAtTime(0.0001, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.22, now + delay + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start(now + delay);
          osc.stop(now + delay + dur + 0.05);
        });
      };

      // Play immediately, then every 2.4 seconds
      playTeamsPhrase();
      this.ringInterval = setInterval(playTeamsPhrase, 2400);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  private stopTeamsRingtone() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
    if (this.audioCtx) {
      try {
        void this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
  }
}
