import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PlayerService } from './player.service';
import { CreatePlayerDto, Player, UpdatePlayerDto } from '../generated';
import { JoinGameDto } from '../../game/dto/join-game.dto';
import { UpdatePlayerWithRoleDto } from './dto/update-player-with-role.dto';

@Controller('player')
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Post()
  create(@Body() createPlayerDto: CreatePlayerDto) {
    return this.playerService.create(createPlayerDto);
  }

  @Get()
  findAll() {
    return this.playerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.playerService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePlayerDto: UpdatePlayerWithRoleDto) {
    return this.playerService.updateWithRole(+id, updatePlayerDto);
  }

  @Patch(':id/name')
  async updatePlayerName(
    @Param('id') id: string,
    @Body() body: { name: string }
  ): Promise<Player> {
    return this.playerService.updatePlayerName(+id, body.name);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.playerService.remove(+id);
  }

  @Post('join')
  async joinGame(
    @Body() joinGameDto: JoinGameDto,
  ): Promise<{ token: string; player: Player; id: number }> {
    const { token, player } = await this.playerService.joinGame(joinGameDto);
    return { token, player, id: player.id };
  }
}
