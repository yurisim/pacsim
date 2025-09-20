import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';

type AuthenticatedRequest = Request & {
  user?: { sub?: number | string; playerId?: number | string };
  params?: Record<string, string>;
  body?: Record<string, unknown>;
};

const MOB_TEAM_TYPES = new Set([
  'MOB_KADENA',
  'MOB_ANDERSEN',
  'MOB_YOKOTA',
  'MOB_OSAN',
  'MOB_JBPHH',
]);

/**
 * Guard that allows both Game Masters and MOB Commanders to manage FOS (Forward Operating Sites).
 * This includes activating and deactivating FOS.
 */
@Injectable()
export class FosManagementGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Ensure we have an authenticated user (JwtAuthGuard should have set this)
    const user = req.user;
    const candidate = user?.sub ?? user?.playerId;
    if (candidate == null) {
      throw new ForbiddenException('Only GMs and MOB CCs can activate/deactivate FOS');
    }

    // Resolve player by numeric id (preferred) or by sessionId as a fallback
    const candidateStr = String(candidate);
    const isNumericId = /^\d+$/.test(candidateStr);
    const player = await this.prisma.player.findUnique({
      where: isNumericId ? { id: Number(candidateStr) } : { sessionId: candidateStr },
      include: { team: true },
    });

    if (!player) {
      throw new ForbiddenException('Only GMs and MOB CCs can activate/deactivate FOS');
    }

    // Allow Game Masters to perform any FOS operations
    if (player.role === 'GM') {
      return true;
    }

    // Allow MOB Commanders to perform FOS operations
    if (player.role === 'COMMANDER' && player.team && MOB_TEAM_TYPES.has(player.team.type)) {
      // Team scoping validations for MOB Commanders
      const method = (req.method || '').toUpperCase();
      const url = (req.originalUrl || req.url || '').toLowerCase();

      // Activate route: POST /api/fos/:fosDisplayNumber/activate
      if (method === 'POST' && url.includes('/fos/') && url.endsWith('/activate')) {
        const bodyTeamId = req.body?.teamId;
        // Only enforce scoping if a numeric teamId is provided; let controller handle 400 for missing/invalid fields
        if (typeof bodyTeamId === 'number' && player.teamId !== bodyTeamId) {
          throw new ForbiddenException('Access denied to this team');
        }
      }

      // Deactivate route: PATCH /api/fos/:id/deactivate
      if (method === 'PATCH' && url.includes('/fos/') && url.endsWith('/deactivate')) {
        const fosId = req.params?.id as string | undefined;
        if (!fosId) {
          // If somehow no id param, deny
          throw new ForbiddenException('Access denied to this team');
        }

        const fos = await this.prisma.forwardOperatingSite.findUnique({
          where: { id: fosId },
          select: { teamId: true },
        });

        // If FOS not found, let the route handler return 404.
        // If FOS exists and is assigned to a team, enforce same-team scoping.
        // If teamId is null (already inactive), allow through so service can return 400.
        if (fos && fos.teamId != null && fos.teamId !== player.teamId) {
          throw new ForbiddenException('Access denied to this team');
        }
      }

      return true;
    }

    // User is neither GM nor MOB Commander
    throw new ForbiddenException('Only GMs and MOB CCs can activate/deactivate FOS');
  }
}
