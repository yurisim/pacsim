import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt } from 'class-validator';

export class CreateGameDto {
  @ApiProperty({ example: 'My Awesome Game', description: 'The name of the game.' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 100, description: 'The mission points required for victory.' })
  @IsInt()
  @IsNotEmpty()
  victoryConditionMP: number;
}
