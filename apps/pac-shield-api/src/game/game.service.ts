import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGameDto, Game } from '@pac-shield/types';
import { TeamType } from '.prisma/client';

@Injectable()
export class GameService {
  constructor(private prisma: PrismaService) {}

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
