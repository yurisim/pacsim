import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TeamListComponent } from './team-list.component';

describe('TeamListComponent', () => {
  let fixture: ComponentFixture<TeamListComponent>;
  let component: TeamListComponent;

  const teams: any[] = [
    { id: 1, name: 'Alpha', type: 'MOB_1', locked: false, players: [] },
    { id: 2, name: 'Bravo', type: 'MOB_2', locked: false, players: [] },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamListComponent);
    component = fixture.componentInstance;

    // Provide inputs
    component.teams = teams as any;
    component.allTeams = teams as any;
    component.currentPlayer = undefined as any;
    component.getTeamTypeInfo = () => ({ icon: 'flag', color: '#123456' });
    component.groupPlayersByRole = () => [];
    component.showGMTools = false;
    component.dense = false;

    fixture.detectChanges();
  });

  it('renders one team-card per team', () => {
    const cards = fixture.debugElement.queryAll(By.css('app-team-card'));
    expect(cards.length).toBe(2);
  });

  it('emits joinTeam when a child team-card emits joinTeam', () => {
    const firstTeam = teams[0];
    let emitted: any = null;
    component.joinTeam.subscribe((t) => (emitted = t));

    const firstCard = fixture.debugElement.queryAll(By.css('app-team-card'))[0];
    firstCard.triggerEventHandler('joinTeam', undefined);

    expect(emitted).toEqual(firstTeam);
  });

  it('emits assignOneUnassigned with the correct team', () => {
    const secondTeam = teams[1];
    let emitted: any = null;
    component.assignOneUnassigned.subscribe((t) => (emitted = t));

    const secondCard = fixture.debugElement.queryAll(By.css('app-team-card'))[1];
    secondCard.triggerEventHandler('assignOneUnassigned', undefined);

    expect(emitted).toEqual(secondTeam);
  });
});
