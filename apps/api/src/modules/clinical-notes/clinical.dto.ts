import { ClinicalNoteType, DoctorAssistTask } from '@mindbridge/shared-types';
import { IsIn, IsMongoId, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateNoteDto {
  @IsIn(Object.values(ClinicalNoteType))
  type!: ClinicalNoteType;

  @IsString()
  @Length(1, 140)
  title!: string;

  @IsString()
  @Length(1, 20000)
  content!: string;

  @IsOptional()
  @IsMongoId()
  appointmentId?: string;

  /** The AI draft this note started from, for provenance. */
  @IsOptional()
  @IsMongoId()
  fromDraftId?: string;
}

export class UpdateNoteDto {
  @IsOptional()
  @IsString()
  @Length(1, 140)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20000)
  content?: string;
}

export class AddendumDto {
  @IsString()
  @Length(1, 5000)
  content!: string;
}

export class AiAssistDto {
  @IsIn(Object.values(DoctorAssistTask))
  task!: DoctorAssistTask;

  /** Patient context is included only with care relationship + the patient's consents. */
  @IsOptional()
  @IsMongoId()
  patientId?: string;

  @IsOptional()
  @IsMongoId()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructions?: string;
}
