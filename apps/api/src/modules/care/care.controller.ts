import { Controller, Delete, Get, HttpCode, Param } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@mindbridge/shared-types';
import type { Model } from 'mongoose';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { CurrentUser, Roles } from '../../common/auth/decorators.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { DoctorProfile } from '../doctors/schemas/doctor-profile.schema.js';
import { CareService } from './care.service.js';

@ApiTags('care')
@ApiBearerAuth()
@Roles(Role.PATIENT)
@Controller({ path: 'patients/care-team', version: '1' })
export class CareController {
  constructor(
    private readonly care: CareService,
    @InjectModel(DoctorProfile.name) private readonly doctors: Model<DoctorProfile>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Professionals who currently or previously had access to my care (PATIENT, own).' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    const rows = await this.care.listForPatient(user.id);
    const profiles = await this.doctors
      .find({ _id: { $in: rows.map((r) => r.doctorProfileId) } })
      .select('displayName professionalCategory')
      .lean();
    const byId = new Map(profiles.map((p) => [p._id.toString(), p]));
    return rows.map((r) => ({
      doctorId: r.doctorProfileId.toString(),
      displayName: byId.get(r.doctorProfileId.toString())?.displayName ?? 'Professional',
      professionalCategory: byId.get(r.doctorProfileId.toString())?.professionalCategory,
      status: r.status,
      establishedAt: r.establishedAt,
      endedAt: r.endedAt,
    }));
  }

  @Delete(':doctorId')
  @HttpCode(204)
  @ApiOperation({ summary: 'End a care relationship: the professional immediately loses access (PATIENT, own).' })
  async end(@CurrentUser() user: AuthenticatedUser, @Param('doctorId', ParseObjectIdPipe) doctorId: string) {
    await this.care.endByPatient(user.id, doctorId);
  }
}
