import { TestBed } from '@angular/core/testing';
import { TelehealthService } from './telehealth.service';

describe('TelehealthService', () => {
  let service: TelehealthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TelehealthService);
  });

  afterEach(() => {
    service.endCall();
  });

  it('should initialize with available doctors and no active call', () => {
    expect(service.onDutyDoctors().length).toBeGreaterThan(0);
    expect(service.currentCall()).toBeNull();
    expect(service.isRinging()).toBe(false);
    expect(service.isConnected()).toBe(false);
  });

  it('should initiate a video call and set status to RINGING', () => {
    service.initiateCall('VIDEO', 'doc-aarav', 'Alice', 'Standard');
    const call = service.currentCall();

    expect(call).toBeDefined();
    expect(call?.mode).toBe('VIDEO');
    expect(call?.patientName).toBe('Alice');
    expect(call?.doctor.id).toBe('doc-aarav');
    expect(service.isRinging()).toBe(true);
    expect(service.isConnected()).toBe(false);
  });

  it('should accept call and change status to CONNECTED', () => {
    service.initiateCall('CHAT', 'doc-sunita', 'Bob');
    expect(service.isRinging()).toBe(true);

    service.acceptCall();
    expect(service.isRinging()).toBe(false);
    expect(service.isConnected()).toBe(true);
    expect(service.currentCall()?.status).toBe('CONNECTED');
  });

  it('should decline call and clear currentCall', () => {
    service.initiateCall('VIDEO');
    expect(service.currentCall()).not.toBeNull();

    service.declineCall();
    expect(service.currentCall()).toBeNull();
    expect(service.isRinging()).toBe(false);
  });

  it('should send in-call chat message', () => {
    service.initiateCall('CHAT');
    service.acceptCall();

    const initialLength = service.inCallMessages().length;
    service.sendChatMessage('I am feeling nervous today.', 'Alice');

    expect(service.inCallMessages().length).toBe(initialLength + 1);
    expect(service.inCallMessages()[initialLength].text).toBe('I am feeling nervous today.');
  });
});
