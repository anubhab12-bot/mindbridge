import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SafetyEvent, SafetyEventSchema } from '../ai/schemas/safety-event.schema.js';
import { AuthModule } from '../auth/auth.module.js';
import { DoctorProfile, DoctorProfileSchema } from '../doctors/schemas/doctor-profile.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { MessagingController } from './messaging.controller.js';
import { MessagingGateway } from './messaging.gateway.js';
import { MessagingService } from './messaging.service.js';
import { MessageThread, MessageThreadSchema } from './schemas/message-thread.schema.js';
import { SecureMessage, SecureMessageSchema } from './schemas/secure-message.schema.js';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: MessageThread.name, schema: MessageThreadSchema },
      { name: SecureMessage.name, schema: SecureMessageSchema },
      { name: DoctorProfile.name, schema: DoctorProfileSchema },
      { name: User.name, schema: UserSchema },
      { name: SafetyEvent.name, schema: SafetyEventSchema },
    ]),
  ],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingGateway],
  exports: [MessagingService, MessagingGateway],
})
export class MessagingModule {}
