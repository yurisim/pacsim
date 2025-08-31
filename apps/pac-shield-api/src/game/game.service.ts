import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { TeamType } from '.prisma/client';
import { CreateGameDto, Game, ConnectGameDto } from '../app/generated';

@Injectable()
export class GameService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService
  ) {}

  async createGame(createGameDto: CreateGameDto): Promise<Game> {
    const { victoryConditionMP } = createGameDto;
    let roomCode: string;

    do {
      roomCode = this.generateRoomCode();
    } while (await this.prisma.game.findUnique({ where: { roomCode } }));

    const game = await this.prisma.game.create({
      data: {
        roomCode,
        victoryConditionMP,
      },
    });

    const teamTypes = Object.values(TeamType);
    for (const type of teamTypes) {
      await this.prisma.team.create({
        data: {
          gameId: game.id,
          type,
          name: `${type} Team`,
        },
      });
    }

    return game;
  }

  async getGameById(id: number): Promise<Game> {
    const game = await this.prisma.game.findUnique({
      where: { id },
      include: {
        teams: true,
      },
    });

    if (!game) {
      throw new NotFoundException(`Game with ID "${id}" not found`);
    }

    return game;
  }

  async joinGame(connectGameDto: ConnectGameDto) {
    const { roomCode } = connectGameDto;

    const game = await this.prisma.game.findUnique({
      where: { roomCode },
      include: {
        teams: true,
      },
    });

    if (!game) {
      throw new NotFoundException(
        `Game with room code "${roomCode}" not found`
      );
    }

    return this.authService.login(game.id);
  }

  private generateRoomCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    return result;
  }
}
