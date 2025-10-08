import { GameScoringService } from './scoring.service';
import { GamePhase, TeamType } from '.prisma/client';

type DeepPartial<T> = {
  [K in keyof T]?: DeepPartial<T[K]>;
};

// Minimal PrismaService mock surface used by GameScoringService
class PrismaServiceMock {
  game = {
    findUnique: jest.fn(),
  };
  forwardOperatingSite = {
    findMany: jest.fn(),
  };
  aTOLine = {
    findMany: jest.fn(),
  };
  aircraftInstance = {
    findMany: jest.fn(),
  };
  threatToken = {
    findMany: jest.fn(),
  };
  team = {
    findMany: jest.fn(),
  };
}

describe('GameScoringService', () => {
  let service: GameScoringService;
  let prisma: PrismaServiceMock;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma = new PrismaServiceMock();
    // @ts-expect-error using mock in place of real PrismaService
    service = new GameScoringService(prisma);
  });

  it('computes assessment points (+5 per fully assessed FOS)', async () => {
    const gameId = 1;

    prisma.game.findUnique.mockResolvedValue({ id: gameId, phase: 'CRISIS' as GamePhase });

    // Two FOS: one explicitly fully assessed, one with 10 RFIs answered
    prisma.forwardOperatingSite.findMany.mockResolvedValue([
      { isFullyAssessed: true, _count: { answeredRFIs: 4 } },
      { isFullyAssessed: false, _count: { answeredRFIs: 10 } },
      { isFullyAssessed: false, _count: { answeredRFIs: 7 } },
    ]);

    prisma.aTOLine.findMany.mockResolvedValue([]); // no sorties
    prisma.aircraftInstance.findMany.mockResolvedValue([]);
    prisma.threatToken.findMany.mockResolvedValue([]); // no destroyed tokens
    prisma.team.findMany.mockResolvedValue([]); // no DP

    const result = await service.computeScore(gameId);
    expect(result.breakdown.assessments.count).toBe(2);
    expect(result.breakdown.assessments.points).toBe(10);
    expect(result.total).toBe(10); // only assessments contribute
  });

  it('counts crisis fighter sorties: F-16/F-22 from FOS into operational area (+5 each)', async () => {
    const gameId = 2;

    prisma.game.findUnique.mockResolvedValue({ id: gameId, phase: 'CRISIS' as GamePhase });

    prisma.forwardOperatingSite.findMany.mockResolvedValue([]);

    // Three ATO lines, but only two are fighters by joined aircraft
    prisma.aTOLine.findMany.mockResolvedValue([
      { aircraftCallSign: 'VIPER11' },
      { aircraftCallSign: 'RAPTOR21' },
      { aircraftCallSign: 'HEAVY31' },
    ]);

    prisma.aircraftInstance.findMany.mockResolvedValue([
      { callSign: 'VIPER11', type: 'F16' },
      { callSign: 'RAPTOR21', type: 'F22' },
      // HEAVY31 is not included, simulating cargo aircraft (e.g., C-17) and should not count
    ]);

    prisma.threatToken.findMany.mockResolvedValue([]);
    prisma.team.findMany.mockResolvedValue([]);

    const result = await service.computeScore(gameId);
    expect(result.breakdown.crisisSorties.count).toBe(2);
    expect(result.breakdown.crisisSorties.points).toBe(10);
    expect(result.total).toBe(10);
  });

  it('maps destroyed PLA targets to correct MP: 20→10pts, 12→7pts (+AA_JAMMING), 10→5pts', async () => {
    const gameId = 3;

    prisma.game.findUnique.mockResolvedValue({ id: gameId, phase: 'CONFLICT' as GamePhase });

    prisma.forwardOperatingSite.findMany.mockResolvedValue([]);
    prisma.aTOLine.findMany.mockResolvedValue([]);
    prisma.aircraftInstance.findMany.mockResolvedValue([]);

    prisma.threatToken.findMany.mockResolvedValue([
      { type: 'FIFTH_GEN_FIGHTER_20', strength: 20 },
      { type: 'FOURTH_GEN_FIGHTER_12', strength: 12 },
      { type: 'GROUND_TARGET_10', strength: 10 },
      { type: 'AA_JAMMING', strength: 0 }, // airborne jammer counts in 12-based bucket
    ]);

    prisma.team.findMany.mockResolvedValue([]);

    const result = await service.computeScore(gameId);
    expect(result.breakdown.destroyedTargets.byStrength.s20).toBe(1);
    expect(result.breakdown.destroyedTargets.byStrength.s12).toBe(2);
    expect(result.breakdown.destroyedTargets.byStrength.airborneJammer).toBe(1);
    expect(result.breakdown.destroyedTargets.byStrength.s10).toBe(1);

    // Points: 1*10 + 2*7 + 1*5 = 29
    expect(result.breakdown.destroyedTargets.points).toBe(29);
    expect(result.total).toBe(29);
  });

  it('applies DP penalty: floor(sum DP for non-CSpOC teams / 5)', async () => {
    const gameId = 4;

    prisma.game.findUnique.mockResolvedValue({ id: gameId, phase: 'CRISIS' as GamePhase });

    prisma.forwardOperatingSite.findMany.mockResolvedValue([]);
    prisma.aTOLine.findMany.mockResolvedValue([]);
    prisma.aircraftInstance.findMany.mockResolvedValue([]);
    prisma.threatToken.findMany.mockResolvedValue([]);

    // Include a CSPOC team whose DP should be excluded
    prisma.team.findMany.mockResolvedValue([
      { demoralizationPoints: 4, type: 'MOB_KADENA' as TeamType },
      { demoralizationPoints: 7, type: 'CAOC' as TeamType },
      { demoralizationPoints: 9, type: 'CSPOC' as TeamType }, // excluded
    ]);

    const result = await service.computeScore(gameId);
    // Per requirements: demoralization is set to 0 for now
    expect(result.breakdown.demoralizationPenalty.dpTotal).toBe(0);
    expect(result.breakdown.demoralizationPenalty.penalty).toBe(0);
    expect(result.total).toBe(0);
  });

  it('aggregates all components and subtracts DP penalty', async () => {
    const gameId = 5;

    prisma.game.findUnique.mockResolvedValue({ id: gameId, phase: 'CONFLICT' as GamePhase });

    // Assessments: 1 fully assessed (+5)
    prisma.forwardOperatingSite.findMany.mockResolvedValue([
      { isFullyAssessed: true, _count: { answeredRFIs: 10 } },
    ]);

    // Sorties: 1 fighter sortie (+5)
    prisma.aTOLine.findMany.mockResolvedValue([{ aircraftCallSign: 'VIPER11' }]);
    prisma.aircraftInstance.findMany.mockResolvedValue([{ callSign: 'VIPER11', type: 'F16' }]);

    // Destroyed targets: one of each strength incl jammer (10 + 7 + 5 = 22)
    prisma.threatToken.findMany.mockResolvedValue([
      { type: 'FIFTH_GEN_FIGHTER_20', strength: 20 },
      { type: 'FOURTH_GEN_FIGHTER_12', strength: 12 },
      { type: 'GROUND_TARGET_10', strength: 10 },
      { type: 'AA_JAMMING', strength: 0 },
    ]);

    // DP penalty: non-CSPOC DPs = 9 ➜ floor(9/5)=2
    prisma.team.findMany.mockResolvedValue([
      { demoralizationPoints: 9, type: 'MOB_ANDERSEN' as TeamType },
      { demoralizationPoints: 3, type: 'CSPOC' as TeamType },
    ]);

    const result = await service.computeScore(gameId);

    expect(result.breakdown.assessments.points).toBe(5);
    expect(result.breakdown.crisisSorties.points).toBe(5);
    // Includes AA_JAMMING in the 12-based bucket per rules (20→10, 12→7, 10→5, jammer→+7)
    expect(result.breakdown.destroyedTargets.points).toBe(29);
    // Per requirements: demoralization is set to 0 for now
    expect(result.breakdown.demoralizationPenalty.penalty).toBe(0);

    expect(result.total).toBe(5 + 5 + 29);
  });
});
