import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role, SCOPE_OF_PRACTICE } from '@mindbridge/shared-types';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { CurrentUser, Public, Roles } from '../../common/auth/decorators.js';
import { Paginated } from '../../common/interceptors/response-envelope.interceptor.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { AvailabilityService } from '../availability/availability.service.js';
import { DoctorsService } from './doctors.service.js';
import {
  AvailabilityExceptionDto,
  DoctorSearchQueryDto,
  RangeQueryDto,
  SetWorkingHoursDto,
  SlotsQueryDto,
  UpdateDoctorProfileDto,
} from './dto/doctor.dto.js';

/** Routes for the signed-in professional. Declared before `:id` routes so "me" is not parsed as an id. */
@ApiTags('doctors')
@ApiBearerAuth()
@Roles(Role.DOCTOR)
@Controller({ path: 'doctors/me', version: '1' })
export class DoctorsMeController {
  constructor(
    private readonly doctors: DoctorsService,
    private readonly availability: AvailabilityService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'My professional profile, verification status and completeness (DOCTOR, own).' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.doctors.getOwn(user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update my profile (DOCTOR, own). Verification fields cannot be changed here.' })
  update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateDoctorProfileDto) {
    return this.doctors.updateOwn(user.id, dto);
  }

  @Patch('availability')
  @ApiOperation({ summary: 'Replace my weekly working hours (DOCTOR, own).' })
  setHours(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetWorkingHoursDto) {
    return this.doctors.setWorkingHours(user.id, dto.workingHours);
  }

  @Put('availability')
  @ApiOperation({ summary: 'Alias of PATCH /doctors/me/availability.' })
  putHours(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetWorkingHoursDto) {
    return this.doctors.setWorkingHours(user.id, dto.workingHours);
  }

  @Get('availability/exceptions')
  @ApiOperation({ summary: 'My leave and extra availability blocks (DOCTOR, own).' })
  listExceptions(@CurrentUser() user: AuthenticatedUser, @Query() q: RangeQueryDto) {
    const from = q.from ? new Date(q.from) : new Date(Date.now() - 7 * 86400_000);
    const to = q.to ? new Date(q.to) : new Date(Date.now() + 120 * 86400_000);
    return this.availability.listExceptions(user.doctorProfileId!, from, to);
  }

  @Post('availability/exceptions')
  @ApiOperation({ summary: 'Add leave or extra availability (DOCTOR, own). Reports overlapping bookings.' })
  addException(@CurrentUser() user: AuthenticatedUser, @Body() dto: AvailabilityExceptionDto) {
    return this.availability.addException(user.doctorProfileId!, {
      kind: dto.kind,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      note: dto.note,
    });
  }

  @Delete('availability/exceptions/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove one of my availability blocks (DOCTOR, ownership enforced).' })
  async removeException(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    await this.availability.removeException(user.doctorProfileId!, id);
  }
}

/** Public professional directory. Only APPROVED, ACTIVE professionals are visible. */
@ApiTags('doctors')
@Public()
@Controller({ path: 'doctors', version: '1' })
export class DoctorsPublicController {
  constructor(
    private readonly doctors: DoctorsService,
    private readonly availability: AvailabilityService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Search verified professionals (public).' })
  async search(@Query() q: DoctorSearchQueryDto) {
    const { items, total } = await this.doctors.search({ ...q, skip: q.skip, limit: q.pageSize });
    return Paginated.of(items, total, q.page, q.pageSize);
  }

  @Get('facets')
  @ApiOperation({ summary: 'Specialties and languages offered by verified professionals (public).' })
  facets() {
    return this.doctors.facets();
  }

  @Get('categories')
  @ApiOperation({ summary: 'Professional categories and their scope of practice (public).' })
  categories() {
    return SCOPE_OF_PRACTICE;
  }

  @Get('top-experienced')
  @ApiOperation({ summary: 'Top verified professionals ranked by years of experience (public).' })
  topExperienced() {
    return this.doctors.getTopExperienced(3);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Verified professional profile (public).' })
  get(@Param('id', ParseObjectIdPipe) id: string) {
    return this.doctors.getPublic(id);
  }

  @Get(':id/slots')
  @ApiOperation({ summary: 'Free slots between two dates in the professional’s timezone (public).' })
  async slots(@Param('id', ParseObjectIdPipe) id: string, @Query() q: SlotsQueryDto) {
    if (!(await this.doctors.findBookable(id))) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Professional not found.' });
    return this.availability.freeSlots(id, q.from, q.to);
  }
}
