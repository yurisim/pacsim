import { IsNumber, Min, Max, IsEnum, IsArray, IsOptional, IsString } from 'class-validator';
import { Country, AccessStatus } from '.prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDiceRollDto {
  @ApiProperty({
    description: 'Dice roll value (1-20)',
    minimum: 1,
    maximum: 20,
    example: 15
  })
  @IsNumber()
  @Min(1)
  @Max(20)
  diceRoll!: number;

  @ApiProperty({
    description: 'Optional notes about the dice roll',
    required: false,
    example: 'GM override for scenario'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkDiceRollDto {
  @ApiProperty({
    description: 'Array of dice roll updates for multiple countries',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        country: {
          enum: Object.values(Country),
          description: 'Country code'
        },
        diceRoll: {
          type: 'number',
          minimum: 1,
          maximum: 20,
          description: 'Dice roll value'
        }
      }
    }
  })
  @IsArray()
  diceRolls!: Array<{
    country: Country;
    diceRoll: number;
  }>;

  @ApiProperty({
    description: 'Optional notes about the bulk dice roll update',
    required: false,
    example: 'Rerolled all dice for new turn'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkAccessUpdateDto {
  @ApiProperty({
    description: 'Access level to apply to all countries',
    enum: AccessStatus,
    example: 'FULL_ACCESS'
  })
  @IsEnum(AccessStatus)
  accessLevel!: AccessStatus;

  @ApiProperty({
    description: 'Specific countries to update (if omitted, applies to all countries)',
    required: false,
    enum: Country,
    isArray: true,
    example: ['JAPAN', 'PHILIPPINES']
  })
  @IsOptional()
  @IsArray()
  @IsEnum(Country, { each: true })
  countries?: Country[];

  @ApiProperty({
    description: 'Optional notes about the bulk access update',
    required: false,
    example: 'Crisis escalation - all access revoked'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}