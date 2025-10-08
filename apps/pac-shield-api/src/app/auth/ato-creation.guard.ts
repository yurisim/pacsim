import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlayerRole } from '@prisma/client';

/**
 * Guard that prevents CAOC and CSpOC team members from creating Air Tasking Orders (ATOs).
 * - Allows Game Masters to bypass the restriction
 * - Blocks players whose team.type === 'CAOC' or 'CSPOC'
 * - Allows all other team types to create ATOs
 */
@Injectable()
export class AtoCreationGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    const candidate = user?.sub ?? user?.playerId;
    if (candidate == null) {
      throw new ForbiddenException('Authentication required to create Air Tasking Orders');
    }

    // Resolve player by numeric id (preferred) or by sessionId as a fallback
    const candidateStr = String(candidate);
    const isNumericId = /^\d+$/.test(candidateStr);
    const player = await this.prisma.player.findUnique({
      where: isNumericId ? { id: Number(candidateStr) } : { sessionId: candidateStr },
      include: { team: true }
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    // Allow GMs to create ATOs for any team
    if (player.role === PlayerRole.GM) {
      return true;
    }

    // Block CAOC and CSPOC team members
    if (player.team?.type === 'CSPOC' || player.team?.type === 'CAOC') {
      throw new ForbiddenException(
        'CAOC and CSpOC team members cannot create Air Tasking Orders'
      );
    }

    return true;
  }
}
