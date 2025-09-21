import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';

type AuthenticatedRequest = Request & {
  user?: { sub?: number | string; playerId?: number | string };
  params?: Record<string, string>;
  body?: Record<string, unknown>;
};

/**
 * Guard that allows only Game Masters (GM role).
 * - Reads authenticated request user set by JwtAuthGuard
 * - Resolves the Player by numeric id (sub/playerId) or sessionId
 * - Allows when player.role === 'GM'; otherwise throws ForbiddenException
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

    return true;
  }
}
