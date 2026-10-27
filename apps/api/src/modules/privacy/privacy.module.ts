import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppointmentsModule } from '../appointments/appointments.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { JournalModule } from '../journal/journal.module.js';
import { MessagingModule } from '../messaging/messaging.module.js';
import { MoodModule } from '../mood/mood.module.js';
import { PatientProfile, PatientProfileSchema } from '../patients/schemas/patient-profile.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { PrivacyController } from './privacy.controller.js';
import { PrivacyService } from './privacy.service.js';

@Module({
  imports: [
    AuthModule,
    MoodModule,
    JournalModule,
    AppointmentsModule,
    MessagingModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PatientProfile.name, schema: PatientProfileSchema },
    ]),
  ],
  controllers: [PrivacyController],
  providers: [PrivacyService],
  exports: [PrivacyService],
})
export class PrivacyModule {}
