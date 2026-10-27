import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DoctorsModule } from '../doctors/doctors.module.js';
import { DoctorProfile, DoctorProfileSchema } from '../doctors/schemas/doctor-profile.schema.js';
import { Feedback, FeedbackSchema } from '../feedback/schemas/feedback.schema.js';
import { PatientIntake, PatientIntakeSchema } from '../intake/schemas/patient-intake.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { AppointmentsController } from './appointments.controller.js';
import { AppointmentsService } from './appointments.service.js';
import { Appointment, AppointmentSchema } from './schemas/appointment.schema.js';
import { VideoProvider } from './video.provider.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
      { name: User.name, schema: UserSchema },
      { name: DoctorProfile.name, schema: DoctorProfileSchema },
      { name: PatientIntake.name, schema: PatientIntakeSchema },
      { name: Feedback.name, schema: FeedbackSchema },
    ]),
    DoctorsModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, VideoProvider],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
