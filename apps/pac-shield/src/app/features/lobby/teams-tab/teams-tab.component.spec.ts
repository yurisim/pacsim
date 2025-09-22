import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TeamsTabComponent } from './teams-tab.component';
import { Team, Player } from '../../../generated';

/**
 * Test suite for TeamsTabComponent behavior and composition
 *
 * This test suite covers:
 * - Composition: verifies team lists are rendered via child components (no direct loops)
 * - Event re-emission: joinTeam and assignOneUnassigned bubble correctly with payloads
 * - Basic rendering with provided team inputs and filter defaults
 *
 * @group Lobby/Teams Tab Component Tests
 */
describe('TeamsTabComponent (refactor)', () => {
  let fixture: ComponentFixture<TeamsTabComponent>;
  let component: TeamsTabComponent;

  const makeTeam = (id: number, name: string, type: Team['type'], playersCount = 1): Team =>
    ({
      id,
      name,
      type,
      locked: false as any,
      gameId: 1 as any,
      missionPoints: 0 as any,
      demoralizationPoints: 0 as any,
      resourcePoints: 0 as any,
      riskTokensAvailable: 0 as any,
      players: Array.from({ length: playersCount }).map((_, i) => ({
        id: id * 100 + i,
        name: `${name}-P${i + 1}`,
        teamId: id,
      })) as any,
    } as unknown as Team);

  const teams: Team[] = [
    makeTeam(1, 'MOB Alpha', 'MOB_KADENA', 2),
    makeTeam(2, 'MOB Bravo', 'MOB_ANDERSEN', 1),
    makeTeam(3, 'CAOC', 'CAOC', 1),
    makeTeam(4, 'CSPOC', 'CSPOC', 1),
    makeTeam(5, 'MEDCOM', 'MEDCOM', 1),
    makeTeam(6, 'GM', 'GM', 1),
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamsTabComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamsTabComponent);
    component = fixture.componentInstance;

    component.allTeams = teams;
    component.currentPlayer = { id: 999, name: 'Tester' } as unknown as Player;
    component.unassignedCount = 0;
    component.getTeamTypeInfo = () => ({ icon: 'flag', color: '#246' });
    component.groupPlayersByRole = (t: Team) => [{ role: 'PLAYER', players: (t.players || []) as any }];
    // Keep defaults, but ensure not hiding empty so our provided teams always render
    component.filters = { ...component.filters, hideEmptyTeams: false };

    fixture.detectChanges();
  });

  /**
   * Verifies that team lists are rendered via the app-team-list child component
   * rather than looping and rendering team cards directly in this component.
   * Ensures the intended composition pattern is followed.
   * @test
   */
  it('renders lists via team-list composition (no direct team-card loops)', () => {
    const lists = fixture.debugElement.queryAll(By.css('app-team-list'));
    expect(lists.length).toBeGreaterThan(0);
    // Expect 3 lists for the three sections (MOB, C2, Support)
    // Some sections may group multiple teams but still one list per section
    expect(lists.length).toBe(3);
  });

  /**
   * Ensures the component re-emits joinTeam events from nested children with the
   * original Team payload so container parents can handle the action.
   * @test
   */
  it('re-emits joinTeam from nested list/cards with the correct team payload', () => {
    let emitted: Team | null = null;
    component.joinTeam.subscribe((t) => (emitted = t));

    const lists = fixture.debugElement.queryAll(By.css('app-team-list'));
    expect(lists.length).toBe(3);

    // Trigger on the first list (MOB)
    lists[0].triggerEventHandler('joinTeam', teams[0]);
    expect(emitted).toEqual(teams[0]);
  });

  /**
   * Ensures the component re-emits assignOneUnassigned events from nested children
   * using the correct team identifier.
   * @test
   */
  it('re-emits assignOneUnassigned with team id from nested list', () => {
    let emittedId: number | null = null;
    component.assignOneUnassigned.subscribe((id) => (emittedId = id));

    const lists = fixture.debugElement.queryAll(By.css('app-team-list'));
    lists[1].triggerEventHandler('assignOneUnassigned', teams[3]);
    expect(emittedId).toBe(teams[3].id);
  });
});
