import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FilterBarComponent, FilterOptions } from '../filter-bar/filter-bar.component';
import { PlayerCardComponent } from '../player-card/player-card.component';
import { Player, Team } from '../../../generated';

@Component({
  selector: 'app-unassigned-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    FilterBarComponent,
    PlayerCardComponent
  ],
  template: `
    <div class="p-6">
      <h3 class="md-typescale-headline-small mb-4">
        Unassigned Players ({{ filteredUnassignedPlayers.length }})
      </h3>

      <!-- Filter Bar -->
      <app-filter-bar
        [filters]="filters"
        [showTeamType]="false"
        [showUnassignedOnly]="false"
        [showHideEmpty]="false"
        [showDenseToggle]="false"
        (filtersChange)="onFiltersChange($event)"
      ></app-filter-bar>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        @for (player of filteredUnassignedPlayers; track player.id) {
        <app-player-card
          [player]="player"
          variant="simple"
          [showGMMenu]="showGMTools"
          [allTeams]="allTeams"
          (changeRole)="changeRole.emit($event)"
          (moveToTeam)="moveToTeam.emit($event)"
          (removeFromTeam)="removeFromTeam.emit($event)"
          (removeFromGame)="removeFromGame.emit($event)"
        ></app-player-card>
        }

        @if (filteredUnassignedPlayers.length === 0) {
        <div class="col-span-full text-center md-padding-xl">
          <mat-icon
            fontIcon="group_off"
            class="md-typescale-display-small md-sys-color-outline mb-2 opacity-50"
          ></mat-icon>
          <p class="md-typescale-body-medium md-sys-color-on-surface-variant">
            @if (filters.searchTerm || filters.filterRole !== 'ALL') {
              No unassigned players match your filters
            } @else {
              All players are assigned to teams
            }
          </p>
        </div>
        }
      </div>
    </div>
  `
})
export class UnassignedTabComponent {
  @Input() filteredUnassignedPlayers: Player[] = [];
  @Input() allTeams: Team[] = [];
  @Input() showGMTools = false;
  @Input() filters: FilterOptions = {
    searchTerm: '',
    filterTeamType: 'ALL',
    filterRole: 'ALL',
    filterUnassignedOnly: false,
    hideEmptyTeams: false,
    dense: false
  };

  @Output() filtersChange = new EventEmitter<FilterOptions>();
  @Output() changeRole = new EventEmitter<Player>();
  @Output() moveToTeam = new EventEmitter<Player>();
  @Output() removeFromTeam = new EventEmitter<Player>();
  @Output() removeFromGame = new EventEmitter<Player>();

  onFiltersChange(filters: FilterOptions): void {
    this.filtersChange.emit(filters);
  }
}