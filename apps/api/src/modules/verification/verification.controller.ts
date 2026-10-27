import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminPermission, DoctorVerificationStatus, Role } from '@mindbridge/shared-types';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { CurrentUser, RequireAdminPermissions, Roles } from '../../common/auth/decorators.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { Paginated } from '../../common/interceptors/response-envelope.interceptor.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { MAX_DOCUMENT_BYTES } from '../files/storage.service.js';
import { VerificationDocumentType } from './schemas/professional-verification.schema.js';
import { VerificationService } from './verification.service.js';

class UploadDocumentDto {
  @IsIn(Object.values(VerificationDocumentType))
  type!: VerificationDocumentType;
}

class DecisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

class ReviewQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(Object.values(DoctorVerificationStatus))
  status?: DoctorVerificationStatus;
}

@ApiTags('verification')
@ApiBearerAuth()
@Controller({ version: '1' })
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  // ---- doctor (any verification status, including pending)

  @Roles(Role.DOCTOR)
  @Get('doctors/me/verification')
  @ApiOperation({ summary: 'My verification application and status (DOCTOR, own record only).' })
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.verification.getMine(user.id);
  }

  @Roles(Role.DOCTOR)
  @Post('doctors/verification-documents')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1 } }))
  @ApiOperation({ summary: 'Upload a verification document: PDF/PNG/JPEG ≤ 5 MB (DOCTOR, own application).' })
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException({ code: 'FILE_REQUIRED', message: 'Choose a file to upload.' });
    return this.verification.addDocument(user, dto.type, file);
  }

  @Roles(Role.DOCTOR)
  @Delete('doctors/verification-documents/:documentId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove one of my documents before approval (DOCTOR, own application).' })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('documentId', ParseObjectIdPipe) documentId: string) {
    await this.verification.removeDocument(user, documentId);
  }

  // ---- admin (doctors:verify)

  @Roles(Role.ADMIN)
  @RequireAdminPermissions(AdminPermission.DOCTORS_VERIFY)
  @Get('admin/doctors/pending-verification')
  @ApiOperation({ summary: 'Applications awaiting review (ADMIN + doctors:verify).' })
  async pending(@Query() q: ReviewQueryDto) {
    const { items, total } = await this.verification.listForReview(q.status, q.skip, q.pageSize);
    return Paginated.of(items, total, q.page, q.pageSize);
  }

  @Roles(Role.ADMIN)
  @RequireAdminPermissions(AdminPermission.DOCTORS_VERIFY)
  @Get('admin/verifications/:id')
  @ApiOperation({ summary: 'Full application with signed document links (ADMIN + doctors:verify). Audited.' })
  detail(@CurrentUser() admin: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.verification.getForAdmin(id, admin);
  }

  @Roles(Role.ADMIN)
  @RequireAdminPermissions(AdminPermission.DOCTORS_VERIFY)
  @Post('admin/verifications/:id/approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve a professional (ADMIN + doctors:verify).' })
  approve(@CurrentUser() admin: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: DecisionDto) {
    return this.verification.decide(id, 'approve', admin, dto.reason);
  }

  @Roles(Role.ADMIN)
  @RequireAdminPermissions(AdminPermission.DOCTORS_VERIFY)
  @Post('admin/verifications/:id/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reject with a recorded reason (ADMIN + doctors:verify).' })
  reject(@CurrentUser() admin: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: DecisionDto) {
    return this.verification.decide(id, 'reject', admin, dto.reason);
  }

  @Roles(Role.ADMIN)
  @RequireAdminPermissions(AdminPermission.DOCTORS_VERIFY)
  @Post('admin/verifications/:id/request-info')
  @HttpCode(200)
  @ApiOperation({ summary: 'Ask the professional for more information (ADMIN + doctors:verify).' })
  requestInfo(@CurrentUser() admin: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: DecisionDto) {
    return this.verification.decide(id, 'requestInfo', admin, dto.reason);
  }

  @Roles(Role.ADMIN)
  @RequireAdminPermissions(AdminPermission.DOCTORS_VERIFY)
  @Post('admin/verifications/:id/suspend')
  @HttpCode(200)
  @ApiOperation({ summary: 'Suspend an approved professional (ADMIN + doctors:verify).' })
  suspend(@CurrentUser() admin: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: DecisionDto) {
    return this.verification.decide(id, 'suspend', admin, dto.reason);
  }

  @Roles(Role.ADMIN)
  @RequireAdminPermissions(AdminPermission.DOCTORS_VERIFY)
  @Post('admin/verifications/:id/reactivate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reactivate a suspended professional (ADMIN + doctors:verify).' })
  reactivate(@CurrentUser() admin: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: DecisionDto) {
    return this.verification.decide(id, 'reactivate', admin, dto.reason);
  }
}
