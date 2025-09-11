import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

import { JoinFacadeService } from '../services/join-facade.service';
import { JoinStep } from '../models/join.models';
import { AccountRoomFormComponent } from '../components/account-room-form/account-room-form.component';
import { NameConflictResolveComponent } from '../components/name-conflict-resolve/name-conflict-resolve.component';
import { NewPersonFormComponent } from '../components/new-person-form/new-person-form.component';
import { ContinueSessionCardComponent } from '../components/continue-session-card/continue-session-card.component';
import { ErrorAlertComponent } from '../../../shared/components/error-alert/error-alert.component';

@Component({
  selector: 'app-join-shell',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatDividerModule,
    MatButtonModule,
    MatIconModule,
    AccountRoomFormComponent,
    NameConflictResolveComponent,
    NewPersonFormComponent,
    ContinueSessionCardComponent,
    ErrorAlertComponent,
  ],
  templateUrl: './join-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Component Intent: Main container component for the game joining workflow,
 * orchestrating the multi-step join process with state management and navigation.
 *
 * This component provides:
 * - Step-based navigation through join process (room code → player name → conflict resolution)
 * - Integration with JoinFacadeService for state management
 * - URL parameter handling for deep-linking and navigation recovery
 * - Conditional rendering of appropriate join step components
 * - Error handling and display through ErrorAlertComponent
 * - Home navigation fallback for user cancellation
 * - Reactive view model binding for UI state synchronization
 */
export class JoinShellComponent implements OnInit {
  protected readonly facade = inject(JoinFacadeService);
  private readonly router = inject(Router);

  protected readonly vm = this.facade.viewModel;
  protected readonly stepEnum = JoinStep;

  /**
   * Method Intent: Initialize the join component by reading URL parameters
   * to restore the appropriate join step for deep-linking and navigation recovery.
   *
   * This method handles:
   * - URL query parameter extraction for step restoration
   * - Deep-linking support for bookmarkable join process states
   * - Navigation recovery when users refresh or navigate back
   * - Facade service integration for state synchronization
   * - Graceful handling of missing or invalid step parameters
   */
  ngOnInit(): void {
    // Initialize step from URL query param for deep-link resiliency
    const stepParam = new URLSearchParams(window.location.search).get('step');
    this.facade.setStepFromUrl(stepParam);
  }

  /**
   * Method Intent: Handle user navigation back to home page when they
   * cancel or exit the join process.
   *
   * This method handles:
   * - Router navigation to home page
   * - Clean exit from join workflow
   * - State cleanup and navigation state management
   * - User experience continuity during cancellation
   */
  onBackHome(): void {
    this.router.navigate(['/']);
  }
}
