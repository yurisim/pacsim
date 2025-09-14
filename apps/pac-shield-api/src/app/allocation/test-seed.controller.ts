import { Body, Controller, ForbiddenException, NotFoundException, Post, Req } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AircraftStatus, AircraftType, LocationType, PlayerRole, TeamType } from '@prisma/client';
import { Request } from 'express';

/**
 * Test-only seeding endpoints for deterministic E2E tests.
 * Guarded by:
 * - process.env.E2E_TEST_MODE === 'true'
 * - header x-test-seed-secret must equal process.env.TEST_SEED_SECRET
 *
 * Routes:
 * - POST /test-seed/aircraft { gameId, teamId, callSign, type, strength?, rangeHexes?, status?, locationType? }
 * - POST /test-seed/role { playerId, role, teamId? }
 */
@Controller('test-seed')
export class TestSeedController {
  constructor(private readonly prisma: PrismaService) {}

  private ensureEnabled(req: Request): void {
    const enabled = process.env.E2E_TEST_MODE === 'true';
    const headerSecret =
      req.headers['x-test-seed-secret'] ||
      (Array.isArray(req.headers['x-test-seed-secret'])
        ? req.headers['x-test-seed-secret'][0]
        : undefined);
    const secret = typeof headerSecret === 'string' ? headerSecret : undefined;

    if (!enabled) {
      throw new ForbiddenException('Test seeding is disabled');
    }
    if (!process.env.TEST_SEED_SECRET || secret !== process.env.TEST_SEED_SECRET) {
      throw new ForbiddenException('Invalid or missing test seed secret');
    }
  }

  @Post('aircraft')
  async seedAircraft(
    @Req() req: Request,
    @Body()
    body: {
      gameId: number;
      teamId: number;
      callSign: string;
      type: AircraftType;
      strength?: number;
      rangeHexes?: number;
      status?: AircraftStatus;
      locationType?: LocationType;
    }
  ) {
    this.ensureEnabled(req);

    const {
      gameId,
      teamId,
      callSign,
      type,
      strength = 10,
      rangeHexes = 20,
      status = AircraftStatus.FMC,
      locationType = LocationType.MOB,
    } = body;

    if (!gameId || !teamId || !callSign || !type) {
      throw new ForbiddenException('Missing required fields for aircraft seeding');
    }

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { game: true },
    });

    if (!team) {
      throw new NotFoundException(`Team ${teamId} not found`);
    }
    if (team.gameId !== gameId) {
      throw new ForbiddenException(`Team ${teamId} does not belong to game ${gameId}`);
    }

    // Upsert by unique callSign for idempotency
    const aircraft = await this.prisma.aircraftInstance.upsert({
      where: { callSign },
      update: {
        type,
        strength,
        rangeHexes,
        status,
        locationType,
        teamId: team.id,
      },
      create: {
        callSign,
        type,
        strength,
        rangeHexes,
        status,
        locationType,
        teamId: team.id,
      },
    });

    return aircraft;
  }

  @Post('role')
  async seedRole(
    @Req() req: Request,
    @Body()
    body: {
      playerId: number;
      role: PlayerRole;
      teamId?: number;
    }
  ) {
    this.ensureEnabled(req);

    const { playerId, role, teamId } = body;

    if (!playerId || !role) {
      throw new ForbiddenException('Missing required fields for role seeding');
    }

    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: { game: true, team: true },
    });

    if (!player) {
      throw new NotFoundException(`Player ${playerId} not found`);
    }
    if (!player.gameId) {
      throw new ForbiddenException('Player is not associated to a game');
    }

    let resolvedTeamId = teamId ?? player.teamId ?? undefined;

    // If setting GM role, ensure the player is on the GM team for their game
    if (role === PlayerRole.GM) {
      const gmTeam = await this.prisma.team.findFirst({
        where: { gameId: player.gameId, type: TeamType.GM },
        select: { id: true, type: true },
      });
      if (!gmTeam) {
        throw new NotFoundException('GM team not found for player game');
      }
      resolvedTeamId = gmTeam.id;
    } else if (typeof resolvedTeamId === 'number') {
      // Validate provided team matches player's game
      const team = await this.prisma.team.findUnique({ where: { id: resolvedTeamId } });
      if (!team) {
        throw new NotFoundException(`Team ${resolvedTeamId} not found`);
      }
      if (team.gameId !== player.gameId) {
        throw new ForbiddenException(`Team ${resolvedTeamId} does not belong to player game ${player.gameId}`);
      }
    }

    const updated = await this.prisma.player.update({
      where: { id: playerId },
      data: {
        role,
        teamId: resolvedTeamId,
      },
    });

    return updated;
  }
}
