import {
  IsEnum,
  IsIP,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { Type } from 'class-transformer';
import {
  WebHookLogType,
  WebHookStatusType,
} from 'src/entities/webhook_logs.entity';

/**
 * DTO for creating a webhook log entry.
 * Used when receiving new webhook payloads in the system.
 */
export class CreateWebhookLogDto {
  @IsEnum(WebHookLogType, { message: 'Invalid webhook log type.' })
  type: WebHookLogType;

  @IsEnum(WebHookStatusType, { message: 'Invalid status.' })
  status: WebHookStatusType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsObject({ message: 'Request must be a valid object.' })
  @Type(() => Object)
  request?: Record<string, any>;

  @IsOptional()
  @IsObject({ message: 'Response must be a valid object.' })
  @Type(() => Object)
  response?: Record<string, any>;

  @IsOptional()
  @IsIP(undefined, { message: 'Invalid IP address.' })
  ipAddress?: string;
}
