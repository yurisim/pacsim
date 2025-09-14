import { UpdateATOLineDto } from '../../generated/aTOLine/update-aTOLine.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateATORequestDto extends UpdateATOLineDto {
  @ApiProperty({
    type: 'boolean',
    required: false,
    description: 'Whether a risk token was used for this flight plan',
  })
  @IsOptional()
  @IsBoolean()
  riskTokenUsed?: boolean;
}