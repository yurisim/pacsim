import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class ActivateFOSDto {
  @ApiProperty({
    description: 'Team ID to assign FOS to',
    type: 'number',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  teamId: number;

  @ApiProperty({
    description: 'Current game turn',
    type: 'number',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  currentTurn: number;
}