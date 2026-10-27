import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from '../appointments/schemas/appointment.schema.js';
import { AvailabilityService } from '../availability/availability.service.js';
import { AvailabilitySlot, AvailabilitySlotSchema } from '../availability/schemas/availability-slot.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { DoctorsMeController, DoctorsPublicController } from './doctors.controller.js';
import { DoctorsService } from './doctors.service.js';
import { DoctorProfile, DoctorProfileSchema } from './schemas/doctor-profile.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DoctorProfile.name, schema: DoctorProfileSchema },
      { name: User.name, schema: UserSchema },
      { name: AvailabilitySlot.name, schema: AvailabilitySlotSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
  ],
  // DoctorsMeController must be registered before the public `:id` routes.
  controllers: [DoctorsMeController, DoctorsPublicController],
  providers: [DoctorsService, AvailabilityService],
  exports: [DoctorsService, AvailabilityService],
})
export class DoctorsModule {}
