import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DoctorProfile, DoctorProfileSchema } from '../doctors/schemas/doctor-profile.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { AiChatController } from './ai-chat.controller.js';
import { AiChatService } from './ai-chat.service.js';
import { AiClientService } from './ai-client.service.js';
import { AiInteraction, AiInteractionSchema } from './schemas/ai-interaction.schema.js';
import { AiMessage, AiMessageSchema } from './schemas/ai-message.schema.js';
import { Conversation, ConversationSchema } from './schemas/conversation.schema.js';
import { SafetyEvent, SafetyEventSchema } from './schemas/safety-event.schema.js';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: AiMessage.name, schema: AiMessageSchema },
      { name: AiInteraction.name, schema: AiInteractionSchema },
      { name: SafetyEvent.name, schema: SafetyEventSchema },
      { name: User.name, schema: UserSchema },
      { name: DoctorProfile.name, schema: DoctorProfileSchema },
    ]),
  ],
  controllers: [AiChatController],
  providers: [AiClientService, AiChatService],
  exports: [AiClientService, AiChatService],
})
export class AiModule {}
