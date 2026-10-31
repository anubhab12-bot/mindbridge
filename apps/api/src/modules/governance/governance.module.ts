import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GovernanceController } from './governance.controller.js';
import { GovernanceService } from './governance.service.js';
import { AiScreenerService } from './ai-screener.service.js';
import {
  AdminApplication,
  AdminApplicationSchema,
} from './schemas/admin-application.schema.js';
import { AdminTask, AdminTaskSchema } from './schemas/admin-task.schema.js';
import {
  DynamicSettings,
  DynamicSettingsSchema,
} from './schemas/dynamic-settings.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { DoctorProfile, DoctorProfileSchema } from '../doctors/schemas/doctor-profile.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdminApplication.name, schema: AdminApplicationSchema },
      { name: AdminTask.name, schema: AdminTaskSchema },
      { name: DynamicSettings.name, schema: DynamicSettingsSchema },
      { name: User.name, schema: UserSchema },
      { name: DoctorProfile.name, schema: DoctorProfileSchema },
    ]),
  ],
  controllers: [GovernanceController],
  providers: [GovernanceService, AiScreenerService],
  exports: [GovernanceService, AiScreenerService],
})
export class GovernanceModule {}
