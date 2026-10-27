import { Controller, ForbiddenException, Get, NotFoundException, Param, Query, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@mindbridge/shared-types';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { CurrentUser, Roles } from '../../common/auth/decorators.js';
import { VerificationService } from '../verification/verification.service.js';
import { StorageService } from './storage.service.js';

/**
 * Private file download. Requires BOTH a valid session and a short-lived signature bound to the
 * same viewer, then re-checks resource-level access in the owning module.
 */
@ApiTags('files')
@ApiBearerAuth()
@Controller({ path: 'files', version: '1' })
export class FilesController {
  constructor(
    private readonly storage: StorageService,
    private readonly verification: VerificationService,
  ) {}

  @Roles(Role.DOCTOR, Role.ADMIN)
  @Get(':ref')
  @ApiOperation({ summary: 'Download a private document via signed link (owner or authorized admin).' })
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ref') ref: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
  ) {
    if (!this.storage.verifySignature(ref, user.id, Number(exp), String(sig ?? ''))) {
      throw new ForbiddenException({ code: 'LINK_EXPIRED', message: 'This link has expired. Refresh the page and try again.' });
    }
    const [kind, a, b] = ref.split('.');
    if (kind !== 'verification' || !a || !b) throw new NotFoundException();
    const file = await this.verification.resolveDocument(a, b, user);
    return new StreamableFile(file.buffer, {
      type: file.mimeType,
      disposition: `attachment; filename="${file.name.replace(/"/g, '')}"`,
    });
  }
}
