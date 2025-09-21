import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { PlayerRole } from '.prisma/client';

export class JoinGameDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  roomCode: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  playerName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(['PLAYER', 'COMMANDER', 'DEPUTY', 'LNO', 'GM'])
  role?: PlayerRole;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pin?: string;
}
