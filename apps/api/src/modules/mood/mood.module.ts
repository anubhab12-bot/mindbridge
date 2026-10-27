import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { MoodController } from './mood.controller.js';
import { MoodService } from './mood.service.js';
import { MoodEntry, MoodEntrySchema } from './schemas/mood-entry.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MoodEntry.name, schema: MoodEntrySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [MoodController],
  providers: [MoodService],
  exports: [MoodService],
})
export class MoodModule {}
