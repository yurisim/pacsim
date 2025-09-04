import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';

export enum PlayerRole {
  PLAYER = 'PLAYER',
  COMMANDER = 'COMMANDER',
  DEPUTY = 'DEPUTY',
  STRATEGIST = 'STRATEGIST',
  GM = 'GM'
}

export class UpdatePlayerWithRoleDto {
  @ApiProperty({
    type: 'string',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    enum: PlayerRole,
    required: false,
  })
  @IsOptional()
  @IsEnum(PlayerRole)
  role?: PlayerRole;
}