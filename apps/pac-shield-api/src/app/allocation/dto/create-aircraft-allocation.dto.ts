import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsInt } from 'class-validator';

export class CreateAircraftAllocationDto {
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
    description: 'Aircraft request ID being fulfilled',
  })
  @IsNotEmpty()
  @IsInt()
  aircraftRequestId!: number;

  @ApiProperty({
    type: 'integer',
    format: 'int32',
    description: 'Aircraft instance ID being allocated',
  })
  @IsNotEmpty()
  @IsInt()
  aircraftInstanceId!: number;

  @ApiProperty({
    type: 'integer',
    format: 'int32',
    description: 'Team ID receiving the aircraft',
  })
  @IsNotEmpty()
  @IsInt()
  allocatedToTeamId!: number;
}