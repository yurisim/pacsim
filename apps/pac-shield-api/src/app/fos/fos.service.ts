import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../events.gateway';
import { ForwardOperatingSite } from '../generated';

@Injectable()
export class FosService {
  private readonly logger = new Logger(FosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway
  ) {}

  /**
   * Get all FOSs for a game, including their activation status
   */
  async getFOSsForGame(gameId: number): Promise<ForwardOperatingSite[]> {
    return this.prisma.forwardOperatingSite.findMany({
      where: { gameId },
      include: {
        team: true,
        game: true,
      },
    });
  }

  /**
   * Activate a FOS and assign it to a team
   * Creates the FOS in the database if it doesn't exist (using fosId as fosIdNumber)
   */
  async activateFOS(fosIdNumber: number, teamId: number, currentTurn: number): Promise<ForwardOperatingSite> {
    // Verify the team exists first to get the gameId
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Find existing FOS by fosIdNumber and gameId, or create it
    let fos = await this.prisma.forwardOperatingSite.findFirst({
      where: {
        fosIdNumber: fosIdNumber,
        gameId: team.gameId
      },
      include: { game: true, team: true },
    });

    if (!fos) {
      // Create the FOS if it doesn't exist
      fos = await this.prisma.forwardOperatingSite.create({
        data: {
          gameId: team.gameId,
          fosIdNumber: fosIdNumber,
          isActive: false,
          parkingRampMOG: 'TWO_C17_SEVEN_FIGHTERS', // Default MOG level
          runwayStatus: 'OPERATIONAL',
        },
        include: { game: true, team: true },
      });
    }

    if (fos.isActive) {
      throw new BadRequestException('FOS is already active');
    }

    const activatedFOS = await this.prisma.forwardOperatingSite.update({
      where: { id: fos.id },
      data: {
        isActive: true,
        teamId: teamId,
        turnActivated: currentTurn,
      },
      include: {
        team: true,
        game: true,
      },
    });

    // Broadcast FOS activation to all clients in the game
    await this.broadcastFOSUpdate(fos.gameId, fos.game?.roomCode);

    this.logger.log(`FOS ${fos.fosIdNumber} activated for team ${team.name} in game ${fos.gameId}`);

    return activatedFOS;
  }

  /**
   * Deactivate a FOS (remove team assignment)
   */
  async deactivateFOS(fosId: number): Promise<ForwardOperatingSite> {
    const fos = await this.prisma.forwardOperatingSite.findUnique({
      where: { id: fosId },
      include: { game: true, team: true },
    });

    if (!fos) {
      throw new NotFoundException('FOS not found');
    }

    if (!fos.isActive) {
      throw new BadRequestException('FOS is already inactive');
    }

    const deactivatedFOS = await this.prisma.forwardOperatingSite.update({
      where: { id: fosId },
      data: {
        isActive: false,
        teamId: null,
        turnActivated: null,
      },
      include: {
        team: true,
        game: true,
      },
    });

    // Broadcast FOS deactivation to all clients in the game
    await this.broadcastFOSUpdate(fos.gameId, fos.game?.roomCode);

    this.logger.log(`FOS ${fos.fosIdNumber} deactivated in game ${fos.gameId}`);

    return deactivatedFOS;
  }

  private async broadcastFOSUpdate(gameId: number, roomCode?: string) {
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

    const fossList = await this.getFOSsForGame(gameId);
    this.eventsGateway.sendToLobby(roomCode, 'fosListUpdate', fossList);
  }
}