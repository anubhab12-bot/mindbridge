import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DoctorProfile, DoctorProfileSchema } from '../doctors/schemas/doctor-profile.schema.js';
import { CareController } from './care.controller.js';
import { CareService } from './care.service.js';
import { CareRelationship, CareRelationshipSchema } from './schemas/care-relationship.schema.js';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CareRelationship.name, schema: CareRelationshipSchema },
      { name: DoctorProfile.name, schema: DoctorProfileSchema },
    ]),
  ],
  controllers: [CareController],
  providers: [CareService],
  exports: [CareService],
})
export class CareModule {}
