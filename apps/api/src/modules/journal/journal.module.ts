import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JournalController } from './journal.controller.js';
import { JournalService } from './journal.service.js';
import { JournalEntry, JournalEntrySchema } from './schemas/journal-entry.schema.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: JournalEntry.name, schema: JournalEntrySchema }])],
  controllers: [JournalController],
  providers: [JournalService],
  exports: [JournalService],
})
export class JournalModule {}
