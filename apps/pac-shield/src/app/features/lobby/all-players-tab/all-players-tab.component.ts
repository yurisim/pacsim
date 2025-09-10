import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FilterBarComponent, FilterOptions } from '../filter-bar/filter-bar.component';
import { PlayerCardComponent } from '../player-card/player-card.component';
import { Player, Team } from '../../../generated';

@Component({
  selector: 'app-all-players-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatSlideToggleModule,
    FilterBarComponent,
    PlayerCardComponent
  ],
  template: `
    <div class="p-6">
      <h3 class="md-typescale-headline-small mb-4">
        All Players ({{ filteredPlayers.length }})
      </h3>

      <!-- Filter Bar -->
      <app-filter-bar
        [filters]="filters"
        [showTeamType]="false"
        [showUnassignedOnly]="true"
        [showHideEmpty]="false"
        [showDenseToggle]="false"
        (filtersChange)="onFiltersChange($event)"
      ></app-filter-bar>

      <!-- Player List -->
      <div class="space-y-2">
        @for (player of filteredPlayers; track player.id) {
        <app-player-card
          [player]="player"
          variant="list"
          [showGMMenu]="showGMTools"
          [allTeams]="allTeams"
          (changeRole)="changeRole.emit($event)"
          (moveToTeam)="moveToTeam.emit($event)"
          (removeFromTeam)="removeFromTeam.emit($event)"
          (removeFromGame)="removeFromGame.emit($event)"
        ></app-player-card>
        }

        @if (filteredPlayers.length === 0) {
        <div class="text-center md-padding-xl">
          <mat-icon
            class="md-sys-color-outline"
          >group_off</mat-icon>
          <p class="md-typescale-body-medium md-sys-color-on-surface-variant">
            No players match your filters
          </p>
        </div>
        }
      </div>
    </div>
  `
})
export class AllPlayersTabComponent {
  @Input() filteredPlayers: Player[] = [];
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