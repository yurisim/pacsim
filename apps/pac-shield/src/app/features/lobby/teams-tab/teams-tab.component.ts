import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { FilterBarComponent, FilterOptions } from '../filter-bar/filter-bar.component';
import { TeamCardComponent, RoleGroup } from '../team-card/team-card.component';
import { Team, Player, Game } from '../../../generated';

@Component({
  selector: 'app-teams-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatExpansionModule,
    MatIconModule,
    FilterBarComponent,
    TeamCardComponent
  ],
  template: `
    <div class="p-6">
      <!-- Filter Bar -->
      <app-filter-bar
        [filters]="filters"
        [showHideEmpty]="true"
        [showDenseToggle]="true"
        (filtersChange)="onFiltersChange($event)"
      ></app-filter-bar>

      <!-- Team Accordion -->
      <mat-accordion>
        <!-- MOB Teams -->
        @if (mobTeams.length > 0) {
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>
              <mat-icon fontIcon="flag" class="mr-2"></mat-icon>
              Main Operating Bases ({{ mobTeams.length }})
            </mat-panel-title>
          </mat-expansion-panel-header>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            @for (team of mobTeams; track team.id) {
            <app-team-card
              [team]="team"
              [roleGroups]="getRoleGroupsForTeam(team)"
              [teamTypeInfo]="getTeamTypeInfo(team)"
              [currentPlayer]="currentPlayer"
              [allTeams]="allTeams"
              [showGMTools]="showGMTools"
              [dense]="filters.dense"
              [unassignedCount]="unassignedCount"
              (joinTeam)="joinTeam.emit(team)"
              (assignOneUnassigned)="assignOneUnassigned.emit(team.id!)"
              (toggleLock)="toggleTeamLock.emit(team)"
              (changeRole)="changeRole.emit($event)"
              (moveToTeam)="moveToTeam.emit($event)"
              (removeFromTeam)="removeFromTeam.emit($event)"
              (removeFromGame)="removeFromGame.emit($event)"
            ></app-team-card>
            }
          </div>
        </mat-expansion-panel>
        }

        <!-- Command & Control Teams -->
        @if (commandControlTeams.length > 0) {
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>
              <mat-icon fontIcon="account_tree" class="mr-2"></mat-icon>
              Command & Control ({{ commandControlTeams.length }})
            </mat-panel-title>
          </mat-expansion-panel-header>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @for (team of commandControlTeams; track team.id) {
            <app-team-card
              [team]="team"
              [roleGroups]="getRoleGroupsForTeam(team)"
              [teamTypeInfo]="getTeamTypeInfo(team)"
              [currentPlayer]="currentPlayer"
              [allTeams]="allTeams"
              [showGMTools]="showGMTools"
              [dense]="filters.dense"
              [unassignedCount]="unassignedCount"
              (joinTeam)="joinTeam.emit(team)"
              (assignOneUnassigned)="assignOneUnassigned.emit(team.id!)"
              (toggleLock)="toggleTeamLock.emit(team)"
              (changeRole)="changeRole.emit($event)"
              (moveToTeam)="moveToTeam.emit($event)"
              (removeFromTeam)="removeFromTeam.emit($event)"
              (removeFromGame)="removeFromGame.emit($event)"
            ></app-team-card>
            }
          </div>
        </mat-expansion-panel>
        }

        <!-- Support Teams -->
        @if (supportTeams.length > 0) {
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>
              <mat-icon fontIcon="favorite" class="mr-2"></mat-icon>
              Support Teams ({{ supportTeams.length }})
            </mat-panel-title>
          </mat-expansion-panel-header>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @for (team of supportTeams; track team.id) {
            <app-team-card
              [team]="team"
              [roleGroups]="getRoleGroupsForTeam(team)"
              [teamTypeInfo]="getTeamTypeInfo(team)"
              [currentPlayer]="currentPlayer"
              [allTeams]="allTeams"
              [showGMTools]="showGMTools"
              [dense]="filters.dense"
              [unassignedCount]="unassignedCount"
              (joinTeam)="joinTeam.emit(team)"
              (assignOneUnassigned)="assignOneUnassigned.emit(team.id!)"
              (toggleLock)="toggleTeamLock.emit(team)"
              (changeRole)="changeRole.emit($event)"
              (moveToTeam)="moveToTeam.emit($event)"
              (removeFromTeam)="removeFromTeam.emit($event)"
              (removeFromGame)="removeFromGame.emit($event)"
            ></app-team-card>
            }
          </div>
        </mat-expansion-panel>
        }
      </mat-accordion>
    </div>
  `
})
export class TeamsTabComponent {
  @Input() allTeams: Team[] = [];
  @Input() currentPlayer?: Player;
  @Input() showGMTools = false;
  @Input() unassignedCount = 0;
  @Input() filters: FilterOptions = {
    searchTerm: '',
    filterTeamType: 'ALL',
    filterRole: 'ALL',
    filterUnassignedOnly: false,
    hideEmptyTeams: true,
    dense: true
  };
  @Input() getTeamTypeInfo!: (team: Team) => { icon: string; color: string };
  @Input() groupPlayersByRole!: (team: Team) => RoleGroup[];

  @Output() filtersChange = new EventEmitter<FilterOptions>();
  @Output() joinTeam = new EventEmitter<Team>();
  @Output() assignOneUnassigned = new EventEmitter<number>();
  @Output() toggleTeamLock = new EventEmitter<Team>();
  @Output() changeRole = new EventEmitter<Player>();
  @Output() moveToTeam = new EventEmitter<Player>();
  @Output() removeFromTeam = new EventEmitter<Player>();
  @Output() removeFromGame = new EventEmitter<Player>();

  get mobTeams(): Team[] {
    const teams = this.allTeams.filter(team => team.type?.startsWith('MOB_'));
    return this.filters.hideEmptyTeams ? teams.filter(t => (t.players?.length || 0) > 0) : teams;
  }

  get commandControlTeams(): Team[] {
    const teams = this.allTeams.filter(team => team.type === 'CAOC' || team.type === 'CSPOC');
    return this.filters.hideEmptyTeams ? teams.filter(t => (t.players?.length || 0) > 0) : teams;
  }

  get supportTeams(): Team[] {
    const teams = this.allTeams.filter(team => team.type === 'MEDCOM' || team.type === 'GM');
    return this.filters.hideEmptyTeams ? teams.filter(t => (t.players?.length || 0) > 0) : teams;
  }

  onFiltersChange(filters: FilterOptions): void {
    this.filtersChange.emit(filters);
  }

  getRoleGroupsForTeam(team: Team): RoleGroup[] {
    return this.groupPlayersByRole(team);
  }
}