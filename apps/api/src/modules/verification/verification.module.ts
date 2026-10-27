import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DoctorProfile, DoctorProfileSchema } from '../doctors/schemas/doctor-profile.schema.js';
import { FilesController } from '../files/files.controller.js';
import { StorageService } from '../files/storage.service.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { ProfessionalVerification, ProfessionalVerificationSchema } from './schemas/professional-verification.schema.js';
import { VerificationController } from './verification.controller.js';
import { VerificationService } from './verification.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProfessionalVerification.name, schema: ProfessionalVerificationSchema },
      { name: DoctorProfile.name, schema: DoctorProfileSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [VerificationController, FilesController],
  providers: [VerificationService, StorageService],
  exports: [VerificationService],
})
export class VerificationModule {}
