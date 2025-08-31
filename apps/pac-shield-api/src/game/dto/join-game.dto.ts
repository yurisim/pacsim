import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class JoinGameDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  roomCode: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  playerName: string;
}
