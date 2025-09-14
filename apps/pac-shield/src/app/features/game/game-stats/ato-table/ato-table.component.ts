import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Store } from '@ngrx/store';
import { ATOLine } from '../../../../generated/aTOLine/aTOLine.entity';
import { CreateATOLineDto } from '../../../../generated/aTOLine/create-aTOLine.dto';
import { UpdateATOLineDto } from '../../../../generated/aTOLine/update-aTOLine.dto';
import { TeamType, PlayerRole, PPRStatus } from '../../../../generated/enums';
import { FlightPlannerDialogComponent, FlightPlannerDialogData } from '../../dialogs/flight-planner/flight-planner-dialog.component';
import * as AtoActions from '../../../../store/ato/ato.actions';

/**
 * Interactive ATO table for flight planning and PPR approval.
 * Features role-based actions for MOBs and CAOC.
 */
@Component({
  selector: 'app-ato-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  templateUrl: './ato-table.component.html',
})
export class AtoTableComponent {
  @Input() lines: ATOLine[] = [];
  @Input() currentUserTeam: TeamType | null = null;
  @Input() currentUserRole: PlayerRole | null = null;
  @Input() currentGameId: number | null = null;
  @Input() currentTurn = 1;
  @Input() readonly = false;

  private dialog = inject(MatDialog);
  private store = inject(Store);

  displayedColumns = ['callSign', 'aircraft', 'route', 'intent', 'configuration', 'ppr', 'actions'];

  get isCaoc(): boolean {
    return this.currentUserTeam === 'CAOC';
  }

  get isMob(): boolean {
    return this.currentUserTeam?.startsWith('MOB') || false;
  }

  get canCreateFlightPlan(): boolean {
    return (this.isMob || this.currentUserRole === 'GM') && !this.readonly;
  }

  get canApprovePpr(): boolean {
    return this.isCaoc && !this.readonly;
  }

  get hasPendingPpr(): boolean {
    return this.lines.some(line => line.pprStatus === 'PENDING');
  }

  onCreateFlightPlan(): void {
    if (!this.currentGameId) {
      console.error('Cannot create flight plan: No game ID provided');
      return;
    }

    const dialogData: FlightPlannerDialogData = {
      currentTurn: this.currentTurn,
      gameId: this.currentGameId,
      availableAircraft: [], // TODO: Get from game state
    };

    const dialogRef = this.dialog.open(FlightPlannerDialogComponent, {
      width: '90vw',
      maxWidth: '800px',
      maxHeight: '90vh',
      data: dialogData,
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result: (CreateATOLineDto & { gameId: number; riskTokenUsed?: boolean }) | undefined) => {
      if (result) {
        // Dispatch create action to NgRx store
        this.store.dispatch(AtoActions.createAtoLine({
          flightPlan: result
        }));
      }
    });
  }

  onEditFlightPlan(line: ATOLine): void {
    if (!this.currentGameId) {
      console.error('Cannot edit flight plan: No game ID provided');
      return;
    }

    const dialogData: FlightPlannerDialogData = {
      existingFlightPlan: line,
      currentTurn: this.currentTurn,
      gameId: this.currentGameId,
      availableAircraft: [], // TODO: Get from game state
    };

    const dialogRef = this.dialog.open(FlightPlannerDialogComponent, {
      width: '90vw',
      maxWidth: '800px',
      maxHeight: '90vh',
      data: dialogData,
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result: (UpdateATOLineDto & { riskTokenUsed?: boolean }) | undefined) => {
      if (result && line.id) {
        // Dispatch update action to NgRx store
        this.store.dispatch(AtoActions.updateAtoLine({
          id: line.id,
          updates: result
        }));
      }
    });
  }

  onApprovePpr(line: ATOLine): void {
    if (line.id) {
      this.store.dispatch(AtoActions.approvePpr({ id: line.id }));
    }
  }

  onDenyPpr(line: ATOLine): void {
    if (line.id) {
      this.store.dispatch(AtoActions.denyPpr({ id: line.id }));
    }
  }


  onDeleteFlightPlan(line: ATOLine): void {
    if (line.id) {
      this.store.dispatch(AtoActions.deleteAtoLine({ id: line.id }));
    }
  }

  getPprStatusColor(status: PPRStatus): string {
    switch (status) {
      case 'APPROVED':
        return 'md-sys-color-primary';
      case 'DENIED':
        return 'md-sys-color-error';
      case 'PENDING':
      default:
        return 'md-sys-color-tertiary';
    }
  }

  getPprStatusIcon(status: PPRStatus): string {
    switch (status) {
      case 'APPROVED':
        return 'check_circle';
      case 'DENIED':
        return 'cancel';
      case 'PENDING':
      default:
        return 'schedule';
    }
  }

  canEditFlightPlan(line: ATOLine): boolean {
    // MOBs and GMs can edit pending flight plans
    return (this.isMob || this.currentUserRole === 'GM') && line.pprStatus === 'PENDING' && !this.readonly;
  }

  canDeleteFlightPlan(line: ATOLine): boolean {
    // MOBs and GMs can delete pending flight plans
    return (this.isMob || this.currentUserRole === 'GM') && line.pprStatus === 'PENDING' && !this.readonly;
  }

  formatRoute(line: ATOLine): string {
    let route = line.startLocation;
    if (line.enRouteDestination) {
      route += ` → ${line.enRouteDestination}`;
    }
    route += ` → ${line.finalDestination}`;
    if (line.alternateDestination) {
      route += ` (ALT: ${line.alternateDestination})`;
    }
    return route;
  }
}