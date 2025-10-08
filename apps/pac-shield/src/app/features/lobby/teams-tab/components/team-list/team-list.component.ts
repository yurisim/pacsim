import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TeamCardComponent, RoleGroup } from '../../../team-card/team-card.component';
import { Player, Team } from '../../../../../generated';

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [CommonModule, TeamCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [ngClass]="gridClass">
      @for (team of teams; track team.id) {
        <app-team-card
          [team]="team"
          [roleGroups]="groupPlayersByRole(team)"
          [teamTypeInfo]="getTeamTypeInfo(team)"
          [currentPlayer]="currentPlayer"
          [allTeams]="allTeams"
          [showGMTools]="showGMTools"
          [dense]="dense"
          [unassignedCount]="unassignedCount"
          [playerRoles]="playerRoles"
          [getTeamTypeInfo]="getTeamTypeInfo"
          (joinTeam)="onJoinTeam(team)"
          (assignOneUnassigned)="onAssignOne(team)"
          (toggleLock)="toggleLock.emit(team)"
          (changeRole)="changeRole.emit($event)"
          (moveToTeam)="moveToTeam.emit($event)"
          (removeFromTeam)="removeFromTeam.emit($event)"
          (removeFromGame)="removeFromGame.emit($event)"
        ></app-team-card>
      }
    </div>
  `
})
export class TeamListComponent {
  @Input() teams: Team[] = [];
  @Input() currentPlayer?: Player;
  @Input() allTeams: Team[] = [];
  @Input() showGMTools = false;
  @Input() dense = false;
  @Input() unassignedCount = 0;
  @Input() playerRoles: string[] = ['GM', 'COMMANDER', 'DEPUTY', 'LNO', 'PLAYER'];

  // Allow TeamsTab container to control layout differences per category
  @Input() gridClass = 'grid grid-cols-1 md:grid-cols-2 gap-4';

  // View-model helpers provided by container
  @Input() getTeamTypeInfo!: (team: Team) => { icon: string; color: string };
  @Input() groupPlayersByRole!: (team: Team) => RoleGroup[];

  // Outputs bubbled to container with minimal surface
  @Output() joinTeam = new EventEmitter<Team>();
  @Output() assignOneUnassigned = new EventEmitter<Team>();
  @Output() toggleLock = new EventEmitter<Team>();

  @Output() changeRole = new EventEmitter<{player: Player, role: string}>();
  @Output() moveToTeam = new EventEmitter<{player: Player, team: Team}>();
  @Output() removeFromTeam = new EventEmitter<Player>();
  @Output() removeFromGame = new EventEmitter<Player>();

  // Public to enable simple, light unit tests
  onJoinTeam(team: Team): void {
    this.joinTeam.emit(team);
  }

  onAssignOne(team: Team): void {
    this.assignOneUnassigned.emit(team);
  }
}
