import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { WebHookStatusType } from 'src/entities/webhook_logs.entity';
import { Type } from 'class-transformer';

/**
 * DTO for updating a webhook log entry.
 * Used when receiving new webhook payloads in the system.
 */
export class UpdateWebhookLogDto {
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
}
