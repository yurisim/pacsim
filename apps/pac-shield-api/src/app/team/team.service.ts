import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../events.gateway';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway
  ) {}

  /**
   * Set team.locked = true and broadcast a roster update to refresh clients.
   */
  async lockTeam(id: number) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: { game: true },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const updated = await this.prisma.team.update({
      where: { id },
      data: { locked: true },
      include: { game: true },
    });

    await this.broadcastPlayerListUpdate(updated.gameId, updated.game?.roomCode);
    return updated;
  }

  /**
   * Set team.locked = false and broadcast a roster update to refresh clients.
   */
  async unlockTeam(id: number) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: { game: true },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const updated = await this.prisma.team.update({
      where: { id },
      data: { locked: false },
      include: { game: true },
    });

    await this.broadcastPlayerListUpdate(updated.gameId, updated.game?.roomCode);
    return updated;
  }

  /**
   * Assign the first available unassigned player in the same game to this team.
   * Respects:
   * - Team roster lock (cannot assign when locked)
   * - GM role constraint (GM can only be on GM team)
   */
  async assignOneUnassigned(id: number) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: { game: true },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.locked) {
      throw new BadRequestException('Team roster is locked');
    }

    // Find the first unassigned player in this game
    const player = await this.prisma.player.findFirst({
      where: { gameId: team.gameId, teamId: null },
      orderBy: { id: 'asc' },
    });

    if (!player) {
      throw new BadRequestException('No unassigned players available');
    }

    // Enforce GM role constraint - GM must be on GM team
    if ((player.role || '').toUpperCase() === 'GM' && team.type !== 'GM') {
      throw new BadRequestException('GM players can only be assigned to the GM team');
    }

    const updatedPlayer = await this.prisma.player.update({
      where: { id: player.id },
      data: { teamId: team.id },
      include: { game: true, team: true },
    });

    // Broadcast roster update to refresh clients
    await this.broadcastPlayerListUpdate(team.gameId, team.game?.roomCode);

    return updatedPlayer;
  }

  private async broadcastPlayerListUpdate(gameId: number, roomCode?: string) {
    if (!roomCode) {
      // Resolve roomCode if not provided
      const game = await this.prisma.game.findUnique({
        where: { id: gameId },
        select: { roomCode: true },
      });
      roomCode = game?.roomCode;
    }

    if (!roomCode) {
      this.logger.warn(`Could not resolve roomCode for gameId=${gameId}; skipping broadcast`);
      return;
    }

    const players = await this.prisma.player.findMany({
      where: { gameId },
      include: { team: true },
    });

    this.eventsGateway.sendToLobby(roomCode, 'playerListUpdate', players);
  }
}
