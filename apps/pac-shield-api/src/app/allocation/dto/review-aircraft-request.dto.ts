import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsInt, IsString, IsEnum, Min } from 'class-validator';
import { AllocationRequestStatus } from '@prisma/client';

export class ReviewAircraftRequestDto {
  @ApiProperty({
    enum: AllocationRequestStatus,
    description: 'Status of the request after CFACC review',
  })
  @IsNotEmpty()
  @IsEnum(AllocationRequestStatus)
  status!: AllocationRequestStatus;

  @ApiProperty({
    type: 'integer',
    minimum: 0,
    description: 'Number of aircraft allocated (if approved)',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  quantityAllocated?: number;

  @ApiProperty({
    type: 'string',
    description: 'CFACC notes and rationale for the decision',
    required: false,
  })
  @IsOptional()
  @IsString()
  cfaccNotes?: string;
}
