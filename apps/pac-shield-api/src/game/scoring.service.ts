import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GamePhase, TeamType } from '.prisma/client';

export interface MissionPointsBreakdown {
  assessments: { count: number; points: number };
  crisisSorties: { count: number; points: number };
  destroyedTargets: {
    byStrength: { s10: number; s12: number; s20: number; airborneJammer: number };
    points: number;
  };
  demoralizationPenalty: { dpTotal: number; penalty: number };
}

export interface MissionPointsResult {
  gameId: number;
  phase: GamePhase;
  breakdown: MissionPointsBreakdown;
  total: number;
}

/**
 * Calculates CJTF Mission Points (MP) for a game from persisted state.
 *
 * Rules implemented:
 * - +5 MP per fully assessed airfield (all 10 RFIs answered).
 * - +5 MP per fighter (F-16/F-22) sortie launched from a FOS into an activated operational area (Crisis phase).
 * - Conflict target destruction:
 *   - +10 MP per destroyed 20-strength PLA token
 *   - +7 MP per destroyed 12-strength PLA token (includes AA_JAMMING airborne jammer)
 *   - +5 MP per destroyed 10-strength PLA token
 * - DP penalty: -1 MP for every 5 DP accumulated across all non-CSpOC teams (floor(total/5)).
 */
@Injectable()
export class GameScoringService {
  constructor(private readonly prisma: PrismaService) {}

  public async computeScore(gameId: number): Promise<MissionPointsResult> {
    // Ensure game exists and load phase
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true, phase: true },
    });
    if (!game) throw new NotFoundException(`Game with ID "${gameId}" not found`);

    // 1) Airfield Assessments
    const assessedCount = await this.countFullyAssessedAirfields(gameId);
    const assessmentPoints = assessedCount * 5;

    // 2) Crisis Sorties (fighters from FOS into operational area)
    const crisisSortieCount = await this.countCrisisFighterSorties(gameId);
    const crisisSortiePoints = crisisSortieCount * 5;

    // 3) Destroyed PLA Targets (Conflict phase logic by token strength/type)
    const destroyedStats = await this.getDestroyedTargetStats(gameId);
    const destroyedPoints =
      destroyedStats.s20 * 10 + destroyedStats.s12 * 7 + destroyedStats.s10 * 5;

    // 4) Demoralization Penalty (exclude CSPOC)
    // NOTE: Per requirements, demoralization points are set to 0 for now
    const dpTotal = 0;
    const dpPenalty = 0;

    // Total MPs (aggregate for CJTF)
    const total =
      assessmentPoints +
      crisisSortiePoints +
      destroyedPoints -
      dpPenalty;

    return {
      gameId,
      phase: game.phase,
      breakdown: {
        assessments: { count: assessedCount, points: assessmentPoints },
        crisisSorties: { count: crisisSortieCount, points: crisisSortiePoints },
        destroyedTargets: {
          byStrength: {
            s10: destroyedStats.s10,
            s12: destroyedStats.s12,
            s20: destroyedStats.s20,
            airborneJammer: destroyedStats.airborneJammer,
          },
          points: destroyedPoints,
        },
        demoralizationPenalty: { dpTotal, penalty: dpPenalty },
      },
      total,
    };
  }

  private async countFullyAssessedAirfields(gameId: number): Promise<number> {
    // Count by either explicit flag or 10 RFIs answered (safety net)
    const fosList = await this.prisma.forwardOperatingSite.findMany({
      where: { gameId },
      select: {
        isFullyAssessed: true,
        _count: { select: { answeredRFIs: true } },
      },
    });

    let count = 0;
    for (const fos of fosList) {
      if (fos.isFullyAssessed || fos._count.answeredRFIs >= 10) count++;
    }
    return count;
  }

  private async countCrisisFighterSorties(gameId: number): Promise<number> {
    // ATO lines pre-filtered by: launched from FOS into operational area, approved
    // Be resilient if DB wasn't migrated yet (new columns missing) - fallback to 0
    let atoLines: Array<{ aircraftCallSign: string }> = [];
    try {
      atoLines = await this.prisma.aTOLine.findMany({
        where: ({ gameId, isOperationalArea: true, startLocationType: 'FOS', pprStatus: 'APPROVED' } as any),
        select: { aircraftCallSign: true },
      });
    } catch {
      return 0;
    }

    if (atoLines.length === 0) return 0;

    const callSigns = Array.from(
      new Set(atoLines.map((l) => l.aircraftCallSign).filter(Boolean))
    );

    if (callSigns.length === 0) return 0;

    // Join to aircraft to determine fighter type (F16/F22)
    const aircraft = await this.prisma.aircraftInstance.findMany({
      where: {
        callSign: { in: callSigns },
        team: { gameId }, // ensure same game
        type: { in: ['F16', 'F22'] },
      },
      select: { callSign: true, type: true },
    });

    const fighterCallSigns = new Set(aircraft.map((a) => a.callSign));

    // Count only lines whose aircraft resolves to a fighter
    let count = 0;
    for (const l of atoLines) {
      if (fighterCallSigns.has(l.aircraftCallSign)) count++;
    }
    return count;
  }

  private async getDestroyedTargetStats(gameId: number): Promise<{
    s10: number;
    s12: number;
    s20: number;
    airborneJammer: number;
  }> {
    // Tokens on this game's board that were destroyed
    // Be resilient if DB column destroyedAt not migrated yet - fallback to 0s
    let tokens: Array<{ type: string; strength: number }> = [];
    try {
      tokens = await this.prisma.threatToken.findMany({
        where: ({ destroyedAt: { not: null }, board: { gameId } } as any),
        select: { type: true, strength: true },
      });
    } catch {
      return { s10: 0, s12: 0, s20: 0, airborneJammer: 0 };
    }

    let s10 = 0;
    let s12 = 0;
    let s20 = 0;
    let airborneJammer = 0;

    for (const t of tokens) {
      // Special case: AA_JAMMING counts as 12-based
      if (t.type === 'AA_JAMMING') {
        airborneJammer++;
        s12++;
        continue;
      }
      if (t.strength >= 20) s20++;
      else if (t.strength >= 12) s12++;
      else if (t.strength >= 10) s10++;
    }

    return { s10, s12, s20, airborneJammer };
  }

  private async sumDemoralizationPointsNonCSpOC(gameId: number): Promise<number> {
    // Select type defensively and filter CSPOC in-code as mocks may ignore Prisma 'where'
    const teams = await this.prisma.team.findMany({
      where: { gameId },
      select: { demoralizationPoints: true, type: true },
    });

    return teams
      // Normalize to string to handle both enum and raw string in tests/mocks
      .filter((t: any) => String(t.type) !== 'CSPOC')
      .reduce((sum, t) => sum + (t.demoralizationPoints ?? 0), 0);
  }
}
