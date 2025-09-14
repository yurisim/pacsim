import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, IsString, Min, Max } from 'class-validator';

export class UpdateAircraftRequestDto {
  @ApiProperty({
    type: 'integer',
    minimum: 1,
    description: 'Number of aircraft requested',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantityRequested?: number;

  @ApiProperty({
    type: 'string',
    description: 'Mission justification for the request',
    required: false,
  })
  @IsOptional()
  @IsString()
  missionJustification?: string;

  @ApiProperty({
    type: 'integer',
    minimum: 1,
    maximum: 5,
    description: 'Priority level (1-5, 1 being highest)',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  priority?: number;

  @ApiProperty({
    type: 'string',
    description: 'Detailed rationale for the request',
    required: false,
  })
  @IsOptional()
  @IsString()
  rationale?: string;
}
