import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PatientProfile, PatientProfileSchema } from '../patients/schemas/patient-profile.schema.js';
import { AccountController } from './account.controller.js';
import { User, UserSchema } from './schemas/user.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PatientProfile.name, schema: PatientProfileSchema },
    ]),
  ],
  controllers: [AccountController],
})
export class UsersModule {}
