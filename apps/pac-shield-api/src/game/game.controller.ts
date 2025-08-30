import { Controller, Post, Body } from '@nestjs/common';
import { GameService } from './game.service';
import { CreateGameDto } from '../../node_modules/.prisma/dto';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post('create')
    async createGame(@Body() createGameDto: CreateGameDto) {
    return this.gameService.createGame(createGameDto);
  }
}

