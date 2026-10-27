import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppointmentsModule } from '../appointments/appointments.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PolicyDocument, PolicyDocumentSchema } from '../consent/schemas/policy-document.schema.js';
import { DoctorProfile, DoctorProfileSchema } from '../doctors/schemas/doctor-profile.schema.js';
import { Feedback, FeedbackSchema } from '../feedback/schemas/feedback.schema.js';
import { SupportModule } from '../support/support.module.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { VerificationModule } from '../verification/verification.module.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

@Module({
  imports: [
    AuthModule,
    AppointmentsModule,
    VerificationModule,
    SupportModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: DoctorProfile.name, schema: DoctorProfileSchema },
      { name: Feedback.name, schema: FeedbackSchema },
      { name: PolicyDocument.name, schema: PolicyDocumentSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
