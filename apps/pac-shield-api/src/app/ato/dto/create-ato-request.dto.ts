import { CreateATOLineDto } from '../../generated/aTOLine/create-aTOLine.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateATORequestDto extends CreateATOLineDto {
  @ApiProperty({
    type: 'integer',
    format: 'int32',
    description: 'Game ID for the flight plan',
  })
  @IsNotEmpty()
  @IsInt()
  gameId!: number;

  @ApiProperty({
    type: 'boolean',
    required: false,
    description: 'Whether a risk token was used for this flight plan',
  })
  @IsOptional()
  @IsBoolean()
  riskTokenUsed?: boolean;
}