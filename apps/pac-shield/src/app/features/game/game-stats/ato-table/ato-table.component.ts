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
import { ATOLine } from '../../../../generated/aTOLine/aTOLine.entity';
import { CreateATOLineDto } from '../../../../generated/aTOLine/create-aTOLine.dto';
import { UpdateATOLineDto } from '../../../../generated/aTOLine/update-aTOLine.dto';
import { TeamType, PlayerRole, PPRStatus } from '../../../../generated/enums';
import { AircraftInstance } from '../../../../generated/aircraftInstance/aircraftInstance.entity';
import { FlightPlannerDialogComponent, FlightPlannerDialogData } from '../../dialogs/flight-planner/flight-planner-dialog.component';
import { AtoStateService } from '../../../../shared/services/ato-state.service';

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
  @Input() allocatedAircraft: AircraftInstance[] = [];

  private dialog = inject(MatDialog);
  private atoState = inject(AtoStateService);

  displayedColumns = ['callSign', 'aircraft', 'route', 'intent', 'configuration', 'ppr', 'actions'];

  get isCaoc(): boolean {
    return this.currentUserTeam === 'CAOC';
  }

  get isMob(): boolean {
    return this.currentUserTeam?.startsWith('MOB') || false;
  }

  get canCreateFlightPlan(): boolean {
    // GMs can always create flight plans
    if (this.currentUserRole === 'GM') {
      return !this.readonly;
    }
    // MOB teams need allocated aircraft to create flight plans
    return this.isMob && !this.readonly && this.allocatedAircraft.length > 0;
  }

  get canCreateFlightPlanTooltip(): string {
    if (this.readonly) {
      return 'Read-only mode';
    }
    if (this.currentUserRole === 'GM') {
      return 'Create new flight plan';
    }
    if (!this.isMob) {
      return 'Only MOB teams can create flight plans';
    }
    if (this.allocatedAircraft.length === 0) {
      return 'No aircraft allocated to your team';
    }
    return 'Create new flight plan';
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
      availableAircraft: this.allocatedAircraft,
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
        this.atoState.createAtoLine(result).subscribe({
          error: (err) => console.error('Failed to create ATO line:', err)
        });
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
      availableAircraft: this.allocatedAircraft,
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
        this.atoState.updateAtoLine(line.id, result).subscribe({
          error: (err) => console.error('Failed to update ATO line:', err)
        });
      }
    });
  }

  onApprovePpr(line: ATOLine): void {
    if (line.id) {
      this.atoState.approvePpr(line.id).subscribe({
        error: (err) => console.error('Failed to approve PPR:', err)
      });
    }
  }

  onDenyPpr(line: ATOLine): void {
    if (line.id) {
      this.atoState.denyPpr(line.id).subscribe({
        error: (err) => console.error('Failed to deny PPR:', err)
      });
    }
  }


  onDeleteFlightPlan(line: ATOLine): void {
    if (line.id) {
      this.atoState.deleteAtoLine(line.id).subscribe({
        error: (err) => console.error('Failed to delete ATO line:', err)
      });
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
