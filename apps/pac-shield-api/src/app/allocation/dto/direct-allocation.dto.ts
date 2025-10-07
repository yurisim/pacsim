import { IsInt } from 'class-validator';

/**
 * DTO for directly allocating an aircraft to a team (CFACC/GM only)
 * Bypasses the request workflow for immediate allocation
 */
export class DirectAllocationDto {
  /**
   * Aircraft instance ID to allocate
   */
  @IsInt()
  aircraftInstanceId!: number;

  /**
   * Team ID receiving the aircraft
   */
  @IsInt()
  allocatedToTeamId!: number;

  /**
   * Allocation cycle ID
   */
  @IsInt()
  allocationCycleId!: number;
}
