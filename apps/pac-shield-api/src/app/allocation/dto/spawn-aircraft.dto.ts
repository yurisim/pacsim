import { IsInt, IsEnum, IsOptional, IsString, Min } from 'class-validator';
import { AircraftType } from '@prisma/client';

/**
 * DTO for spawning a new aircraft instance (GM only)
 */
export class SpawnAircraftDto {
  /**
   * Game ID where the aircraft will be spawned
   */
  @IsInt()
  gameId!: number;

  /**
   * Aircraft type (C130, C17, C5, F16, F22)
   */
  @IsEnum(['C130', 'C17', 'C5', 'F16', 'F22'])
  type!: AircraftType;

  /**
   * Aircraft subtype (BOBCAT or RHINO for C5 variants, null for others)
   */
  @IsOptional()
  @IsString()
  subtype?: string | null;

  /**
   * Team ID that will own this aircraft
   */
  @IsInt()
  teamId!: number;

  /**
   * Range in hexes (optional - defaults based on aircraft type if not provided)
   * C-130: 3 hexes, C-17: 4 hexes, C-5: 4 hexes
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  rangeHexes?: number;

  /**
   * Optional FOS location ID where aircraft starts
   */
  @IsOptional()
  @IsString()
  locationFosId?: string;

  /**
   * Optional hex location where aircraft starts
   */
  @IsOptional()
  @IsString()
  locationHex?: string;
}
