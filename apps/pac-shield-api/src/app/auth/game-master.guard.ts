import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';

type AuthenticatedRequest = Request & {
  user?: { sub?: number | string; playerId?: number | string };
  params?: Record<string, string>;
  body?: Record<string, unknown>;
};

/**
 * Guard that allows only Game Masters (GM role) from the same game as the resource.
 * - Reads authenticated request user set by JwtAuthGuard
 * - Resolves the Player by numeric id (sub/playerId) or sessionId
 * - Verifies player.role === 'GM'
 * - For FOS operations, verifies the GM belongs to the same game as the FOS
 */
@Injectable()
export class GameMasterGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const user = req.user;
    const candidate = user?.sub ?? user?.playerId;
    if (candidate == null) {
      throw new ForbiddenException('Only GMs can perform this action');
    }

    const candidateStr = String(candidate);
    const isNumericId = /^\d+$/.test(candidateStr);
    const player = await this.prisma.player.findUnique({
      where: isNumericId ? { id: Number(candidateStr) } : ({} as any),
    });

    // If not numeric id, try sessionId
    const resolvedPlayer =
      player ??
      (await this.prisma.player.findUnique({
        where: { sessionId: candidateStr },
      }).catch(() => null));

    if (!resolvedPlayer || resolvedPlayer.role !== 'GM') {
      throw new ForbiddenException('Only GMs can perform this action');
    }

    // For FOS RFI operations, verify GM is in the same game as the FOS
    const method = (req.method || '').toUpperCase();
    const url = (req.originalUrl || req.url || '').toLowerCase();

    if ((method === 'POST' || method === 'PATCH') && url.includes('/fos/') && (url.includes('/rfi') || url.includes('/roll-dice'))) {
      const fosId = req.params?.id as string | undefined;
      if (fosId) {
        const fos = await this.prisma.forwardOperatingSite.findUnique({
          where: { id: fosId },
          select: { gameId: true },
        });

        if (fos && fos.gameId !== resolvedPlayer.gameId) {
          throw new ForbiddenException('Access denied to this FOS');
        }
      }
    }

    return true;
  }
}
