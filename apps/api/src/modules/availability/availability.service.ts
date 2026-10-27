import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SLOT_HOLDING_STATUSES, type TimeSlot } from '@mindbridge/shared-types';
import { type Model, Types } from 'mongoose';
import { addDays, dayOfWeek, localDate, zonedTimeToUtc } from '../../common/utils/dates.js';
import { Appointment } from '../appointments/schemas/appointment.schema.js';
import { DoctorProfile } from '../doctors/schemas/doctor-profile.schema.js';
import { AvailabilityKind, AvailabilitySlot } from './schemas/availability-slot.schema.js';

/** Patients cannot book a slot starting sooner than this. */
export const MIN_LEAD_MINUTES = 120;
export const MAX_RANGE_DAYS = 31;
export const MAX_BOOKING_HORIZON_DAYS = 90;

interface Interval {
  start: number;
  end: number;
}

const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel(AvailabilitySlot.name) private readonly exceptions: Model<AvailabilitySlot>,
    @InjectModel(Appointment.name) private readonly appointments: Model<Appointment>,
    @InjectModel(DoctorProfile.name) private readonly doctors: Model<DoctorProfile>,
  ) {}

  /**
   * Free bookable slots for [fromDate, toDate] (YYYY-MM-DD in the doctor's timezone).
   * Slots = weekly working hours + extra availability − leave − slots held by appointments.
   */
  async freeSlots(doctorProfileId: string, fromDate: string, toDate: string, now = new Date()): Promise<TimeSlot[]> {
    const doctor = await this.doctors.findById(doctorProfileId).lean();
    if (!doctor) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Professional not found.' });
    if (toDate < fromDate) throw new BadRequestException({ code: 'INVALID_RANGE', message: '`to` must not be before `from`.' });
    const today = localDate(now, doctor.timezone);
    const from = fromDate < today ? today : fromDate;
    const horizon = addDays(today, MAX_BOOKING_HORIZON_DAYS);
    const to = toDate > horizon ? horizon : toDate;
    if (from > to) return [];
    let span = 0;
    for (let d = from; d <= to; d = addDays(d, 1)) if (++span > MAX_RANGE_DAYS) break;
    if (span > MAX_RANGE_DAYS) {
      throw new BadRequestException({ code: 'RANGE_TOO_LARGE', message: `Ask for at most ${MAX_RANGE_DAYS} days.` });
    }

    const durationMs = doctor.slotDurationMinutes * 60_000;
    const rangeStart = zonedTimeToUtc(from, '00:00', doctor.timezone);
    const rangeEnd = zonedTimeToUtc(addDays(to, 1), '00:00', doctor.timezone);

    const [exceptions, booked] = await Promise.all([
      this.exceptions
        .find({ doctorProfileId: doctor._id, startAt: { $lt: rangeEnd }, endAt: { $gt: rangeStart } })
        .lean(),
      this.appointments
        .find({
          doctorProfileId: doctor._id,
          status: { $in: SLOT_HOLDING_STATUSES },
          startAt: { $lt: rangeEnd },
          endAt: { $gt: rangeStart },
        })
        .select('startAt endAt')
        .lean(),
    ]);

    const blocked: Interval[] = [
      ...exceptions.filter((e) => e.kind === AvailabilityKind.UNAVAILABLE).map((e) => ({ start: +e.startAt, end: +e.endAt })),
      ...booked.map((a) => ({ start: +a.startAt, end: +a.endAt })),
    ];
    const windows: Interval[] = exceptions
      .filter((e) => e.kind === AvailabilityKind.EXTRA_AVAILABLE)
      .map((e) => ({ start: +e.startAt, end: +e.endAt }));

    for (let d = from; d <= to; d = addDays(d, 1)) {
      const dow = dayOfWeek(d);
      for (const wh of doctor.workingHours.filter((w) => w.dayOfWeek === dow)) {
        windows.push({ start: +zonedTimeToUtc(d, wh.start, doctor.timezone), end: +zonedTimeToUtc(d, wh.end, doctor.timezone) });
      }
    }

    const earliest = now.getTime() + MIN_LEAD_MINUTES * 60_000;
    const seen = new Set<number>();
    const slots: TimeSlot[] = [];
    for (const w of windows.sort((a, b) => a.start - b.start)) {
      for (let s = w.start; s + durationMs <= w.end; s += durationMs) {
        const slot = { start: s, end: s + durationMs };
        if (s < earliest || s < +rangeStart || s >= +rangeEnd || seen.has(s)) continue;
        if (blocked.some((b) => overlaps(slot, b))) continue;
        seen.add(s);
        slots.push({ startAt: new Date(s).toISOString(), endAt: new Date(s + durationMs).toISOString() });
      }
    }
    return slots.sort((a, b) => a.startAt.localeCompare(b.startAt));
  }

  /** True when `startAt` is exactly one of the free slots (used to validate bookings). */
  async isBookable(doctorProfileId: string, startAt: Date, now = new Date()) {
    const doctor = await this.doctors.findById(doctorProfileId).select('timezone slotDurationMinutes').lean();
    if (!doctor) return null;
    const day = localDate(startAt, doctor.timezone);
    const slots = await this.freeSlots(doctorProfileId, day, day, now);
    const match = slots.find((s) => s.startAt === startAt.toISOString());
    return match ? { startAt: new Date(match.startAt), endAt: new Date(match.endAt) } : null;
  }

  // ---------------------------------------------------------------- doctor-managed exceptions

  async listExceptions(doctorProfileId: string, from: Date, to: Date) {
    const rows = await this.exceptions
      .find({ doctorProfileId: new Types.ObjectId(doctorProfileId), endAt: { $gt: from }, startAt: { $lt: to } })
      .sort({ startAt: 1 })
      .lean();
    return rows.map((r) => ({ id: r._id.toString(), kind: r.kind, startAt: r.startAt, endAt: r.endAt, note: r.note }));
  }

  async addException(doctorProfileId: string, dto: { kind: AvailabilityKind; startAt: Date; endAt: Date; note?: string }) {
    if (dto.endAt <= dto.startAt) throw new BadRequestException({ code: 'INVALID_RANGE', message: 'End must be after start.' });
    if (+dto.endAt - +dto.startAt > 60 * 24 * 3600 * 1000) {
      throw new BadRequestException({ code: 'RANGE_TOO_LARGE', message: 'A single block can be at most 60 days.' });
    }
    const row = await this.exceptions.create({ doctorProfileId: new Types.ObjectId(doctorProfileId), ...dto });
    // Leave does not silently cancel existing bookings; the doctor is told which ones overlap.
    const conflicting =
      dto.kind === AvailabilityKind.UNAVAILABLE
        ? await this.appointments.countDocuments({
            doctorProfileId: new Types.ObjectId(doctorProfileId),
            status: { $in: SLOT_HOLDING_STATUSES },
            startAt: { $lt: dto.endAt },
            endAt: { $gt: dto.startAt },
          })
        : 0;
    return { id: row._id.toString(), kind: row.kind, startAt: row.startAt, endAt: row.endAt, note: row.note, conflictingAppointments: conflicting };
  }

  async removeException(doctorProfileId: string, id: string) {
    const res = await this.exceptions.deleteOne({ _id: new Types.ObjectId(id), doctorProfileId: new Types.ObjectId(doctorProfileId) });
    if (res.deletedCount === 0) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Block not found.' });
  }
}
