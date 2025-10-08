import { IsInt, IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ThreatType } from '@prisma/client';

export class UpdateThreatTokenDto {
  @IsOptional()
  @IsEnum(ThreatType)
  type?: ThreatType;

  @IsOptional()
  @IsInt()
  strength?: number;

  @IsOptional()
  @IsString()
  locationHex?: string;

  @IsOptional()
  @IsDateString()
  destroyedAt?: string;

  @IsOptional()
  @IsInt()
  destroyedByTeamId?: number;
}
