import { IsInt, IsString, IsEnum } from 'class-validator';
import { ThreatType } from '@prisma/client';

export class CreateThreatTokenDto {
  @IsInt()
  boardId: number;

  @IsEnum(ThreatType)
  type: ThreatType;

  @IsInt()
  strength: number;

  @IsString()
  locationHex: string;
}
