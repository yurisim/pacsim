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
export class JoinShellComponent implements OnInit {
  protected readonly facade = inject(JoinFacadeService);
  private readonly router = inject(Router);

  protected readonly vm = this.facade.viewModel;
  protected readonly stepEnum = JoinStep;

  ngOnInit(): void {
    // Initialize step from URL query param for deep-link resiliency
    const stepParam = new URLSearchParams(window.location.search).get('step');
    this.facade.setStepFromUrl(stepParam);
  }

  onBackHome(): void {
    this.router.navigate(['/']);
  }
}
