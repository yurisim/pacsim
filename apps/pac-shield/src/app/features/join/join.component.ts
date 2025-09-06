import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../shared/services/auth.service';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Player } from '../../models/player.model';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { InputOtpComponent } from '../../shared/components/input-otp/input-otp.component';

interface JoinResponse {
  token: string;
  player: Player;
}

@Component({
  selector: 'app-join',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatIconModule,
    InputOtpComponent,
  ],
  templateUrl: './join.component.html',
  styleUrls: ['./join.component.scss'],
})
export class JoinComponent {
  joinForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  roomCode = '';
  playerName = '';
  showNameConflict = false;
  pinForm: FormGroup;
  newPersonForm: FormGroup;
  isValidatingRoom = false;
  isRoomValid = false;
  roomValidated = false;
  hasValidJWT = false;
  isNewPersonFlow = false;
  isCheckingName = false;
  isNameAvailable = false;
  currentPlayer: Player | null = null;
  currentGameId: string | null = null;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  public router = inject(Router);

  constructor() {
    this.joinForm = this.fb.group({
      gameId: ['', Validators.required],
      playerName: ['', Validators.required],
    });

    this.pinForm = this.fb.group({
      pin: ['', Validators.required],
    });

    this.newPersonForm = this.fb.group({
      newPlayerName: ['', Validators.required],
    });

    // Check if user has a valid JWT and populate name
    this.initializeFromJWT();
  }

  private initializeFromJWT() {
    if (this.authService.isAuthenticated()) {
      this.hasValidJWT = true;
      this.currentPlayer = this.authService.getPlayer();
      this.currentGameId = this.authService.getGameId();

      if (this.currentPlayer && this.currentPlayer.name) {
        this.joinForm.patchValue({ playerName: this.currentPlayer.name });
      }
    }
  }

  onRoomCodeChange() {
    const gameId = this.joinForm.get('gameId')?.value;
    if (gameId && gameId.length >= 4) {
      this.validateRoomCode(gameId);
    } else {
      this.isRoomValid = false;
      this.roomValidated = false;
    }
  }

  onRoomCodeOtpComplete(code: string) {
    const upper = (code || '').toUpperCase();
    this.joinForm.patchValue({ gameId: upper });
    if (upper.length === 6) {
      this.validateRoomCode(upper);
    } else {
      this.isRoomValid = false;
      this.roomValidated = false;
    }
  }

  private validateRoomCode(roomCode: string) {
    this.isValidatingRoom = true;
    this.errorMessage = null;

    this.authService.validateRoomCode(roomCode).subscribe({
      next: (response) => {
        this.isValidatingRoom = false;
        this.isRoomValid = response.valid;
        this.roomValidated = true;
        if (!response.valid) {
          this.errorMessage = 'Invalid room code';
        }
      },
      error: () => {
        this.isValidatingRoom = false;
        this.isRoomValid = false;
        this.roomValidated = true;
        this.errorMessage = 'Error validating room code';
      }
    });
  }

  onSubmit() {
    if (this.joinForm.valid && this.isRoomValid) {
      this.isLoading = true;
      this.errorMessage = null;

      const { gameId, playerName } = this.joinForm.value;
      this.roomCode = gameId;
      this.playerName = playerName;

      this.authService.joinGame(gameId, playerName).subscribe({
        next: (_response: JoinResponse) => {
          this.isLoading = false;
          // JWT is automatically stored by AuthService.joinGame method
          const currentGameId = this.authService.getGameId();
          this.router.navigate(['/lobby', currentGameId || gameId]);
        },
        error: (err: unknown) => {
          this.isLoading = false;
          if (err instanceof HttpErrorResponse) {
            if (err.status === 404) {
              this.errorMessage = 'Invalid room code';
            } else if (err.status === 400 && err.error?.code === 'NAME_CONFLICT') {
              this.showNameConflict = true;
              this.errorMessage = null;
            } else {
              this.errorMessage = err.error?.message || 'Join failed';
            }
          } else {
            this.errorMessage = (err as Error).message || 'Join failed';
          }
          console.error('Join failed', err);
        }
      });
    }
  }

  onVerifyPin() {
    if (this.pinForm.valid && this.pinForm.value.pin?.length === 4) {
      this.isLoading = true;
      this.errorMessage = null;

      const { pin } = this.pinForm.value;

      this.authService.joinGameWithPin(this.roomCode, this.playerName, pin).subscribe({
        next: (_response: JoinResponse) => {
          this.isLoading = false;
          const currentGameId = this.authService.getGameId();
          this.router.navigate(['/lobby', currentGameId || this.roomCode]);
        },
        error: (err: unknown) => {
          this.isLoading = false;
          if (err instanceof HttpErrorResponse) {
            if (err.error?.code === 'INVALID_PIN') {
              this.errorMessage = 'The PIN you entered is incorrect. Please try again.';
            } else {
              this.errorMessage = err.error?.message || 'PIN verification failed';
            }
          } else {
            this.errorMessage = (err as Error).message || 'PIN verification failed';
          }
          console.error('PIN verification failed', err);
        }
      });
    } else {
      this.errorMessage = 'Please enter all 4 digits of your PIN';
    }
  }

  onPinComplete(pin: string) {
    // Auto-trigger PIN verification when all 4 digits are entered
    if (pin.length === 4) {
      this.pinForm.patchValue({ pin });
      setTimeout(() => {
        this.onVerifyPin();
      }, 200); // Small delay for better UX
    }
  }

  onNewPerson() {
    this.isNewPersonFlow = true;
    this.errorMessage = null;
  }

  onCheckNameAvailability() {
    if (this.newPersonForm.valid) {
      this.isCheckingName = true;
      this.errorMessage = null;
      const newPlayerName = this.newPersonForm.value.newPlayerName;
      this.authService.checkPlayerNameAvailability(this.roomCode, newPlayerName).subscribe({
        next: ({ isAvailable }) => {
          this.isCheckingName = false;
          this.isNameAvailable = isAvailable;
          if (!isAvailable) {
            this.errorMessage = 'This name is already taken. Please choose another one.';
          }
        },
        error: () => {
          this.isCheckingName = false;
          this.errorMessage = 'Error checking name availability.';
        },
      });
    }
  }

  onCreateNewPlayer() {
    if (this.newPersonForm.valid && this.isNameAvailable) {
      this.isLoading = true;
      this.errorMessage = null;
      const newPlayerName = this.newPersonForm.value.newPlayerName;

      this.authService.joinGame(this.roomCode, newPlayerName).subscribe({
        next: (_response: JoinResponse) => {
          this.isLoading = false;
          const currentGameId = this.authService.getGameId();
          this.router.navigate(['/lobby', currentGameId || this.roomCode]);
        },
        error: (err: unknown) => {
          this.isLoading = false;
          if (err instanceof HttpErrorResponse) {
            this.errorMessage = err.error?.message || 'Failed to create new player';
          } else {
            this.errorMessage = (err as Error).message || 'Failed to create new player';
          }
          console.error('New player creation failed', err);
        },
      });
    }
  }

  onBackToJoin() {
    this.showNameConflict = false;
    this.isNewPersonFlow = false;
    this.errorMessage = null;
    this.pinForm.reset();
    this.newPersonForm.reset();
  }

  isVerifyButtonDisabled(): boolean {
    return this.pinForm.invalid || !this.pinForm.value.pin || this.pinForm.value.pin.length !== 4 || this.isLoading;
  }

  isJoinButtonDisabled(): boolean {
    return this.joinForm.invalid || !this.isRoomValid || this.isLoading || this.isValidatingRoom;
  }

  shouldShowPlayerName(): boolean {
    return this.isRoomValid && this.roomValidated;
  }

  onContinueGame() {
    if (this.hasValidJWT && this.currentGameId) {
      this.router.navigate(['/lobby', this.currentGameId]);
    }
  }

  shouldShowContinueOption(): boolean {
    return this.hasValidJWT && !!this.currentPlayer && !!this.currentGameId;
  }
}
