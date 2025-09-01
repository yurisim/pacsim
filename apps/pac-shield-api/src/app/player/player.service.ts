import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlayerDto, UpdatePlayerDto, Player } from '../generated';
import { JwtService } from '@nestjs/jwt';
import { EventsGateway } from '../events.gateway';
import { JoinGameDto } from '../../game/dto/join-game.dto';
import { ClsService } from 'nestjs-cls';
import { UpdatePlayerWithRoleDto } from './dto/update-player-with-role.dto';

@Injectable()
export class PlayerService {
  private readonly logger = new Logger(PlayerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly eventsGateway: EventsGateway,
    private readonly cls: ClsService,
  ) {}

  async joinGame(joinGameDto: JoinGameDto): Promise<{ token: string; player: Player }> {
    const game = await this.prisma.game.findUnique({
      where: { roomCode: joinGameDto.roomCode },
    });

    if (!game) {
      throw new NotFoundException('Invalid room code');
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

  async update(id: number, updatePlayerDto: UpdatePlayerDto) {
    return this.prisma.player.update({ where: { id }, data: updatePlayerDto });
  }

  async updateWithRole(id: number, updatePlayerDto: UpdatePlayerWithRoleDto) {
    const requestId = this.cls.getId();
    this.logger.log(`[${requestId}] Updating player ${id} with data: ${JSON.stringify(updatePlayerDto)}`);
    
    // Validate input
    if (updatePlayerDto.name !== undefined) {
      const trimmedName = updatePlayerDto.name?.trim();
      if (!trimmedName || trimmedName.length === 0) {
        throw new BadRequestException('Name cannot be empty');
      }
      updatePlayerDto.name = trimmedName;
    }

    // Validate role if provided
    if (updatePlayerDto.role !== undefined) {
      const validRoles = ['PLAYER', 'COMMANDER', 'DEPUTY', 'STRATEGIST', 'GM'];
      if (!validRoles.includes(updatePlayerDto.role as string)) {
        throw new BadRequestException(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }
    }
    
    try {
      const result = await this.prisma.player.update({ where: { id }, data: updatePlayerDto });
      this.logger.log(`[${requestId}] Successfully updated player ${id}`);
      return result;
    } catch (error) {
      this.logger.error(`[${requestId}] Failed to update player ${id}: ${error.message}`, error.stack);
      if (error.code === 'P2025') {
        throw new NotFoundException('Player not found');
      }
      throw error;
    }
  }

  async updatePlayerName(id: number, newName: string) {
    const requestId = this.cls.getId();
    this.logger.log(`[${requestId}] Updating player ${id} name to: ${newName}`);

    // Validate name
    const trimmedName = newName?.trim();
    if (!trimmedName || trimmedName.length === 0) {
      throw new BadRequestException('Name cannot be empty');
    }

    try {
      const updatedPlayer = await this.prisma.player.update({
        where: { id },
        data: { name: trimmedName },
        include: { game: true },
      });

      if (updatedPlayer.game) {
        const players = await this.prisma.player.findMany({
          where: { gameId: updatedPlayer.gameId },
        });
        this.eventsGateway.sendToLobby(updatedPlayer.game.roomCode, 'playerListUpdate', players);
      }

      this.logger.log(`[${requestId}] Successfully updated player ${id} name`);
      return updatedPlayer;
    } catch (error) {
      this.logger.error(`[${requestId}] Failed to update player ${id} name: ${error.message}`, error.stack);
      if (error.code === 'P2025') {
        throw new NotFoundException('Player not found');
      }
      throw error;
    }
  }

  remove(id: number) {
    return this.prisma.player.delete({ where: { id } });
  }
}
