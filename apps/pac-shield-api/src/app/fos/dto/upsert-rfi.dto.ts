import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UpsertRfiDto {
  @ApiProperty({
    type: 'string',
    description: 'Unique RFI category key (e.g., CFR, Mobility, Ramp, ATC, Equipment, ...)',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  rfiKey!: string;

  @ApiProperty({
    enum: ['1', '2', '3'],
    description: 'RFI result value: "1" | "2" | "3"',
  })
  // Accept number or string; coerce to trimmed string so ValidationPipe passes when frontend sends 1/2/3
  @Transform(({ value }) => (value == null ? value : String(value).trim()))
  @IsString()
  @IsIn(['1', '2', '3'])
  rfiValue!: '1' | '2' | '3';
}
