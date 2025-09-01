import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlayerDto, UpdatePlayerDto, Player } from '../generated';
import { JwtService } from '@nestjs/jwt';
import { EventsGateway } from '../events.gateway';
import { JoinGameDto } from '../../game/dto/join-game.dto';

@Injectable()
export class PlayerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async joinGame(joinGameDto: JoinGameDto): Promise<{ token: string; player: Player }> {
    const game = await this.prisma.game.findUnique({
      where: { roomCode: joinGameDto.roomCode },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    const player = await this.prisma.player.create({
      data: {
        name: joinGameDto.playerName,
        sessionId: `${joinGameDto.playerName}-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 9)}`,
        gameId: game.id,
      },
    });

    const payload = { gameId: game.id, playerId: player.id };
    const token = this.jwtService.sign(payload);

    const players = await this.prisma.player.findMany({
      where: { gameId: game.id },
    });

    this.eventsGateway.sendToLobby(game.roomCode, 'playerListUpdate', players);

    return { token, player };
  }

  create(createPlayerDto: CreatePlayerDto) {
    return this.prisma.player.create({ data: createPlayerDto });
  }

  async createPlayerInGame(playerName: string, gameId: number) {
    return this.prisma.player.create({
      data: {
        name: playerName,
        sessionId: `${playerName}-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 9)}`,
        gameId: gameId,
      },
    });
  }

  findAll() {
    return this.prisma.player.findMany();
  }

  findOne(id: number) {
    return this.prisma.player.findUnique({ where: { id } });
  }

  update(id: number, updatePlayerDto: UpdatePlayerDto) {
    return this.prisma.player.update({ where: { id }, data: updatePlayerDto });
  }

  async updatePlayerName(id: number, newName: string) {
    const updatedPlayer = await this.prisma.player.update({
      where: { id },
      data: { name: newName },
      include: { game: true },
    });

    if (updatedPlayer.game) {
      const players = await this.prisma.player.findMany({
        where: { gameId: updatedPlayer.gameId },
      });
      this.eventsGateway.sendToLobby(updatedPlayer.game.roomCode, 'playerListUpdate', players);
    }

    return updatedPlayer;
  }

  remove(id: number) {
    return this.prisma.player.delete({ where: { id } });
  }
}
