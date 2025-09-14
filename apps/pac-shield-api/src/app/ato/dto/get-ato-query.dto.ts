import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

/**
 * Query DTO for GET /ato/game/:gameId
 * Provides optional numeric turn filter with proper transform/validation.
 */
export class GetAtoQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  turn?: number;
}
