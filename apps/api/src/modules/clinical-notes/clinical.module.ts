import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiInteraction, AiInteractionSchema } from '../ai/schemas/ai-interaction.schema.js';
import { Appointment, AppointmentSchema } from '../appointments/schemas/appointment.schema.js';
import { DoctorProfile, DoctorProfileSchema } from '../doctors/schemas/doctor-profile.schema.js';
import { PatientIntake, PatientIntakeSchema } from '../intake/schemas/patient-intake.schema.js';
import { MoodModule } from '../mood/mood.module.js';
import { PatientProfile, PatientProfileSchema } from '../patients/schemas/patient-profile.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { ClinicalController } from './clinical.controller.js';
import { ClinicalService } from './clinical.service.js';
import { AiDraft, AiDraftSchema } from './schemas/ai-draft.schema.js';
import { ClinicalNote, ClinicalNoteSchema } from './schemas/clinical-note.schema.js';

@Module({
  imports: [
    MoodModule,
    MongooseModule.forFeature([
      { name: ClinicalNote.name, schema: ClinicalNoteSchema },
      { name: AiDraft.name, schema: AiDraftSchema },
      { name: AiInteraction.name, schema: AiInteractionSchema },
      { name: User.name, schema: UserSchema },
      { name: PatientProfile.name, schema: PatientProfileSchema },
      { name: Appointment.name, schema: AppointmentSchema },
      { name: PatientIntake.name, schema: PatientIntakeSchema },
      { name: DoctorProfile.name, schema: DoctorProfileSchema },
    ]),
  ],
  controllers: [ClinicalController],
  providers: [ClinicalService],
  exports: [ClinicalService],
})
export class ClinicalModule {}
