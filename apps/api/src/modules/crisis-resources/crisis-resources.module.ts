import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminCrisisResourcesController, CrisisResourcesController } from './crisis-resources.controller.js';
import { CrisisResourcesService } from './crisis-resources.service.js';
import { CrisisResource, CrisisResourceSchema } from './schemas/crisis-resource.schema.js';

@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: CrisisResource.name, schema: CrisisResourceSchema }])],
  controllers: [CrisisResourcesController, AdminCrisisResourcesController],
  providers: [CrisisResourcesService],
  exports: [CrisisResourcesService],
})
export class CrisisResourcesModule {}
