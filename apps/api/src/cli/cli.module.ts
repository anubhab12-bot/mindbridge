import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CryptoModule } from '../common/crypto/crypto.module.js';
import { AppConfigModule } from '../config/config.module.js';
import { AppConfigService } from '../config/app-config.service.js';
import { AuditModule } from '../modules/audit/audit.module.js';
import { PasswordService } from '../modules/auth/password.service.js';
import { User, UserSchema } from '../modules/users/schemas/user.schema.js';

/** Minimal context for CLI commands: config, database, audit and password hashing only. */
@Module({
  imports: [
    AppConfigModule,
    MongooseModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({ uri: config.get('MONGO_URI'), serverSelectionTimeoutMS: 10_000 }),
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    CryptoModule,
    AuditModule,
  ],
  providers: [PasswordService],
})
export class CliModule {}
