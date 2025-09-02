import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { GameService } from './game.service';
import { CreateGameDto } from '../app/generated';
import { JoinGameDto } from './dto/join-game.dto';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post('create')
  async createGame(@Body() createGameDto: CreateGameDto) {
    return this.gameService.createGame(createGameDto);
  }

  @Get(':id')
  async getGameById(@Param('id') id: string) {
    return this.gameService.getGameById(+id);
  }

  @Get('validate/:roomCode')
  async validateRoomCode(@Param('roomCode') roomCode: string) {
    return this.gameService.validateRoomCode(roomCode);
  }

  @Post('join')
  async joinGame(@Body() joinGameDto: JoinGameDto) {
    return this.gameService.joinGame(joinGameDto);
  }
}

