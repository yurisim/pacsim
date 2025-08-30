import { Controller, Post, Body } from '@nestjs/common';
import { GameService } from './game.service';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post('create')
  async createGame(@Body() body: { name: string }) {
    return this.gameService.createGame(body.name);
  }
}

