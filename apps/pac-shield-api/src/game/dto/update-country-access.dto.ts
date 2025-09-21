import { IsEnum, IsOptional, IsString, IsISO8601 } from 'class-validator';

export enum PoliticalAccessType {
  ACCESS = 'access',
  OVERFLIGHT = 'overflight',
}

export enum PoliticalAccessLevel {
  FULL_ACCESS = 'FULL_ACCESS',
  OVERFLIGHT_ONLY = 'OVERFLIGHT_ONLY',
  NO_ACCESS = 'NO_ACCESS',
}

export enum UpdateSource {
  MAP = 'map',
  PANEL = 'panel',
}

export class UpdateCountryAccessDto {
  @IsString()
  country!: string;

  @IsEnum(PoliticalAccessType)
  accessType!: PoliticalAccessType;

  @IsEnum(PoliticalAccessLevel)
  accessLevel!: PoliticalAccessLevel;

  @IsOptional()
  @IsEnum(UpdateSource)
  source?: UpdateSource;

  @IsOptional()
  @IsISO8601()
  at?: string;
}

/**
 * Optional bulk update DTO (stub for future use):
 * Sets the same accessLevel across multiple countries.
 * If countries is omitted, the implementation may choose to apply to all known countries in-memory.
 */
export class BulkCountryAccessDto {
  @IsEnum(PoliticalAccessLevel)
  accessLevel!: PoliticalAccessLevel;

  @IsOptional()
  countries?: string[];
}
