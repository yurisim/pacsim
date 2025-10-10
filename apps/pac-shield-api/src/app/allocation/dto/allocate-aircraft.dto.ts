import { IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for allocating an aircraft to a team
 */
export class AllocateAircraftDto {
  /**
   * Team ID to allocate the aircraft to
   */
  @ApiProperty({ description: 'Team ID to allocate aircraft to', type: 'integer' })
  @IsInt()
  @IsNotEmpty()
  teamId!: number;
}
