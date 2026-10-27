import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DoctorProfile, DoctorProfileSchema } from '../doctors/schemas/doctor-profile.schema.js';
import { ConsentController } from './consent.controller.js';
import { ConsentService } from './consent.service.js';
import { ConsentRecord, ConsentRecordSchema } from './schemas/consent-record.schema.js';
import { PolicyDocument, PolicyDocumentSchema } from './schemas/policy-document.schema.js';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ConsentRecord.name, schema: ConsentRecordSchema },
      { name: PolicyDocument.name, schema: PolicyDocumentSchema },
      { name: DoctorProfile.name, schema: DoctorProfileSchema },
    ]),
  ],
  controllers: [ConsentController],
  providers: [ConsentService],
  exports: [ConsentService, MongooseModule],
})
export class ConsentModule {}
