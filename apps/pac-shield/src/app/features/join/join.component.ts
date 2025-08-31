import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { AuthService } from '../../shared/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-join',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    CardModule,
    InputGroupModule,
    InputGroupAddonModule,
    CommonModule,
  ],
  templateUrl: './join.component.html',
  styleUrls: ['./join.component.scss'],
})
export class JoinComponent {
  roomCode = '';
  playerName = '';
  isLoading = false;
  errorMessage = '';

  private authService = inject(AuthService);
  public router = inject(Router);

  joinGame(): void {
    if (!this.roomCode) {
      this.errorMessage = 'Room code is required.';
      return;
    }
    if (!this.playerName) {
      this.errorMessage = 'Player name is required.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.joinGame(this.roomCode, this.playerName).subscribe({
      next: () => {
        const gameId = this.authService.getGameId();
        if (gameId) {
          this.router.navigate(['/lobby', gameId]);
        } else {
          this.errorMessage =
            'Failed to retrieve game details. Please try again.';
          this.isLoading = false;
        }
      },
      error: (err) => {
        this.errorMessage =
          err.error?.message || 'Failed to join the game. Please try again.';
        this.isLoading = false;
      },
    });
  }
}
