import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class RollDiceDto {
  @ApiProperty({
    type: 'string',
    description: 'RFI category key to roll dice for (e.g., CFR, Mobility, Ramp, ATC, Equipment)',
    example: 'CFR'
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  rfiKey!: string;
}