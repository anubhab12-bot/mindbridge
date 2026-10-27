import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

const toBool = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1' || value === 'yes';
const toInt = ({ value }: { value: unknown }) => (value === undefined || value === '' ? undefined : Number(value));

/**
 * Every runtime setting comes from the environment and is validated at boot.
 * The process refuses to start with missing or weak secrets rather than falling back to defaults.
 */
export class EnvironmentVariables {
  @IsIn(['development', 'test', 'staging', 'production'])
  NODE_ENV: 'development' | 'test' | 'staging' | 'production' = 'development';

  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  @IsString()
  MONGO_URI!: string;

  @IsString()
  REDIS_URL = 'redis://localhost:6379';

  @IsString()
  @MinLength(32, { message: 'JWT_ACCESS_SECRET must be at least 32 characters' })
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(32, { message: 'MFA_TOKEN_SECRET must be at least 32 characters' })
  MFA_TOKEN_SECRET!: string;

  @Transform(toInt)
  @IsInt()
  @Min(60)
  @Max(3600)
  JWT_ACCESS_TTL_SECONDS = 900;

  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(90)
  REFRESH_TOKEN_TTL_DAYS = 14;

  @Transform(toBool)
  @IsBoolean()
  COOKIE_SECURE = true;

  /** Comma-separated list of allowed browser origins. */
  @IsString()
  CORS_ORIGINS = 'http://localhost:4200';

  @IsUrl({ require_tld: false })
  WEB_APP_URL = 'http://localhost:4200';

  @IsUrl({ require_tld: false })
  AI_SERVICE_URL = 'http://localhost:8000';

  @IsString()
  @MinLength(32, { message: 'AI_SERVICE_TOKEN must be at least 32 characters' })
  AI_SERVICE_TOKEN!: string;

  @Transform(toInt)
  @IsInt()
  @Min(1000)
  @Max(120000)
  AI_SERVICE_TIMEOUT_MS = 20000;

  /** Base64-encoded 32-byte key for AES-256-GCM field encryption. */
  @IsString()
  FIELD_ENCRYPTION_KEY!: string;

  @IsString()
  @MinLength(32, { message: 'FILE_SIGNING_SECRET must be at least 32 characters' })
  FILE_SIGNING_SECRET!: string;

  @IsString()
  UPLOAD_DIR = './var/uploads';

  @IsIn(['smtp', 'memory'])
  MAIL_TRANSPORT: 'smtp' | 'memory' = 'smtp';

  @IsString()
  SMTP_HOST = 'localhost';

  @Transform(toInt)
  @IsInt()
  SMTP_PORT = 1025;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASSWORD?: string;

  @Transform(toBool)
  @IsBoolean()
  SMTP_SECURE = false;

  @IsString()
  MAIL_FROM = 'MindBridge <no-reply@mindbridge.local>';

  /** When false, background jobs run inline (used by tests and single-process dev). */
  @Transform(toBool)
  @IsBoolean()
  QUEUES_ENABLED = true;

  @Transform(toBool)
  @IsBoolean()
  SWAGGER_ENABLED = true;

  @Transform(toInt)
  @IsInt()
  @Min(1)
  THROTTLE_LIMIT = 120;

  @Transform(toInt)
  @IsInt()
  @Min(1)
  THROTTLE_TTL_SECONDS = 60;

  @Transform(toInt)
  @IsInt()
  @Min(1)
  AUTH_THROTTLE_LIMIT = 10;

  @Transform(toInt)
  @IsInt()
  @Min(1)
  MAX_FAILED_LOGINS = 5;

  @Transform(toInt)
  @IsInt()
  @Min(1)
  LOCKOUT_MINUTES = 15;

  /** Crisis resources older than this are not served as "verified". */
  @Transform(toInt)
  @IsInt()
  @Min(1)
  CRISIS_RESOURCE_MAX_AGE_DAYS = 180;

  /** Minimum group size for any aggregated admin metric (smaller counts are suppressed). */
  @Transform(toInt)
  @IsInt()
  @Min(1)
  ANALYTICS_MIN_GROUP_SIZE = 5;

  @Transform(toInt)
  @IsInt()
  @Min(0)
  CANCELLATION_NOTICE_HOURS = 24;

  @Transform(toInt)
  @IsInt()
  @Min(1)
  AI_DAILY_MESSAGE_QUOTA = 200;

  @Transform(toInt)
  @IsInt()
  @Min(1)
  AI_CONVERSATION_RETENTION_DAYS = 365;

  @Transform(toInt)
  @IsInt()
  @Min(0)
  ACCOUNT_DELETION_GRACE_DAYS = 7;

  @IsIn(['none', 'jitsi'])
  VIDEO_PROVIDER: 'none' | 'jitsi' = 'none';

  @IsOptional()
  @IsString()
  VIDEO_JITSI_DOMAIN?: string;

  @IsIn(['debug', 'info', 'warn', 'error'])
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error' = 'info';
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, { enableImplicitConversion: false });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const messages = errors.map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`);
    throw new Error(`Invalid environment configuration:\n  ${messages.join('\n  ')}`);
  }
  const key = Buffer.from(validated.FIELD_ENCRYPTION_KEY, 'base64');
  if (key.length !== 32) {
    throw new Error('Invalid environment configuration:\n  FIELD_ENCRYPTION_KEY must be base64 for exactly 32 bytes');
  }
  if (validated.NODE_ENV === 'production') {
    if (!validated.COOKIE_SECURE) throw new Error('COOKIE_SECURE must be true in production');
    if (validated.MAIL_TRANSPORT === 'memory') throw new Error('MAIL_TRANSPORT=memory is not allowed in production');
  }
  return validated;
}
