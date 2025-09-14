import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsInt, IsString, IsEnum, Min, Max } from 'class-validator';
import { AircraftType } from '@prisma/client';

export class CreateAircraftRequestDto {
  @ApiProperty({
    type: 'integer',
    format: 'int32',
    description: 'Allocation cycle ID',
  })
  @IsNotEmpty()
  @IsInt()
  allocationCycleId!: number;

  @ApiProperty({
    type: 'integer',
    format: 'int32',
    description: 'Team ID making the request',
  })
  @IsNotEmpty()
  @IsInt()
  teamId!: number;

  @ApiProperty({
    enum: AircraftType,
    description: 'Type of aircraft requested',
  })
  @IsNotEmpty()
  @IsEnum(AircraftType)
  aircraftType!: AircraftType;

  @ApiProperty({
    type: 'integer',
    minimum: 1,
    description: 'Number of aircraft requested',
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantityRequested!: number;

  @ApiProperty({
    type: 'string',
    description: 'Mission justification for the request',
  })
  @IsNotEmpty()
  @IsString()
  missionJustification!: string;

  @ApiProperty({
    type: 'integer',
    minimum: 1,
    maximum: 5,
    description: 'Priority level (1-5, 1 being highest)',
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(5)
  priority!: number;

  @ApiProperty({
    type: 'string',
    description: 'Detailed rationale for the request',
  })
  @IsNotEmpty()
  @IsString()
  rationale!: string;
}
