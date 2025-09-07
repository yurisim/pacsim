import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';

export interface FilterOptions {
  searchTerm: string;
  filterTeamType: 'ALL' | 'MOB' | 'CAOC' | 'CSPOC' | 'MEDCOM' | 'GM';
  filterRole: 'ALL' | 'PLAYER' | 'COMMANDER' | 'DEPUTY' | 'STRATEGIST' | 'GM';
  filterUnassignedOnly: boolean;
  hideEmptyTeams: boolean;
  dense: boolean;
}

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule
  ],
  template: `
    <div class="flex flex-wrap gap-4 mb-6 items-center">
      @if (showSearch) {
      <mat-form-field appearance="outline" class="min-w-64">
        <mat-label>Search players...</mat-label>
        <input matInput [(ngModel)]="filters.searchTerm" (ngModelChange)="onFiltersChange()" />
        <mat-icon matSuffix fontIcon="search"></mat-icon>
      </mat-form-field>
      }

      @if (showTeamType) {
      <mat-form-field appearance="outline" class="min-w-48">
        <mat-label>Team Type</mat-label>
        <mat-select [(value)]="filters.filterTeamType" (selectionChange)="onFiltersChange()">
          <mat-option value="ALL">All Types</mat-option>
          <mat-option value="MOB">MOB Teams</mat-option>
          <mat-option value="CAOC">CAOC</mat-option>
          <mat-option value="CSPOC">CSPOC</mat-option>
          <mat-option value="MEDCOM">MEDCOM</mat-option>
          <mat-option value="GM">GM</mat-option>
        </mat-select>
      </mat-form-field>
      }

      @if (showRole) {
      <mat-form-field appearance="outline" class="min-w-48">
        <mat-label>Role</mat-label>
        <mat-select [(value)]="filters.filterRole" (selectionChange)="onFiltersChange()">
          <mat-option value="ALL">All Roles</mat-option>
          <mat-option value="GM">GM</mat-option>
          <mat-option value="COMMANDER">Commander</mat-option>
          <mat-option value="DEPUTY">Deputy</mat-option>
          <mat-option value="STRATEGIST">Strategist</mat-option>
          <mat-option value="PLAYER">Player</mat-option>
        </mat-select>
      </mat-form-field>
      }

      <div class="flex gap-4 ml-auto">
        @if (showUnassignedOnly) {
        <mat-slide-toggle [(ngModel)]="filters.filterUnassignedOnly" (ngModelChange)="onFiltersChange()">
          Unassigned Only
        </mat-slide-toggle>
        }
        @if (showHideEmpty) {
        <mat-slide-toggle [(ngModel)]="filters.hideEmptyTeams" (ngModelChange)="onFiltersChange()">
          Hide Empty Teams
        </mat-slide-toggle>
        }
        @if (showDenseToggle) {
        <mat-slide-toggle [(ngModel)]="filters.dense" (ngModelChange)="onFiltersChange()">
          Dense View
        </mat-slide-toggle>
        }
      </div>
    </div>
  `
})
export class FilterBarComponent {
  @Input() filters: FilterOptions = {
    searchTerm: '',
    filterTeamType: 'ALL',
    filterRole: 'ALL',
    filterUnassignedOnly: false,
    hideEmptyTeams: true,
    dense: true
  };

  @Input() showSearch = true;
  @Input() showTeamType = true;
  @Input() showRole = true;
  @Input() showUnassignedOnly = false;
  @Input() showHideEmpty = false;
  @Input() showDenseToggle = false;

  @Output() filtersChange = new EventEmitter<FilterOptions>();

  onFiltersChange(): void {
    this.filtersChange.emit(this.filters);
  }
}