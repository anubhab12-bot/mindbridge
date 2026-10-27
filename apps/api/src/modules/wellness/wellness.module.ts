import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WellnessContent, WellnessContentSchema } from './schemas/wellness-content.schema.js';
import { AdminWellnessController, WellnessController } from './wellness.controller.js';
import { WellnessService } from './wellness.service.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: WellnessContent.name, schema: WellnessContentSchema }])],
  controllers: [WellnessController, AdminWellnessController],
  providers: [WellnessService],
  exports: [WellnessService],
})
export class WellnessModule {}
