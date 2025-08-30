import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
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
    CommonModule,
  ],
  templateUrl: './join.component.html',
  styleUrls: ['./join.component.scss'],
})
export class JoinComponent {
  roomCode = '';
  isLoading = false;
  errorMessage = '';

  private authService = inject(AuthService);
  private router = inject(Router);

  joinGame(): void {
    if (!this.roomCode) {
      this.errorMessage = 'Room code is required.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.joinGame(this.roomCode).subscribe({
      next: () => {
        // On success, the backend will return a JWT. The service handles storing it.
        // We can then navigate to the game page.
        // The specific game ID would typically come from the JWT payload or the join response.
        // For now, we'll assume a static or derivable ID.
        const gameId = this.authService.getGameId();
        if (gameId) {
          this.router.navigate(['/game', gameId]);
        } else {
          this.errorMessage =
            'Failed to retrieve game details from session. Please try logging in again.';
          this.isLoading = false; // Stop loading indicator on this error
        }
      },
      error: (err) => {
        this.errorMessage =
          err.error?.message ||
          'Failed to join the game. Please check the room code and try again.';
        this.isLoading = false;
      },
    });
  }
}
