import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../shared/services/auth.service';
import { Router } from '@angular/router';
import { Player } from '../../models/player.model';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { CommonModule } from '@angular/common';

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
  joinForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  roomCode = '';
  playerName = '';

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  public router = inject(Router);

  constructor() {
    this.joinForm = this.fb.group({
      gameId: ['', Validators.required],
      playerName: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.joinForm.valid) {
      this.isLoading = true;
      this.errorMessage = null;

      const { gameId, playerName } = this.joinForm.value;
      this.roomCode = gameId;
      this.playerName = playerName;

      this.authService.joinGame(gameId, playerName).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          this.authService.setToken(response.token);
          this.authService.setPlayer(response.player);
          this.router.navigate(['/lobby']);
        },
        error: (err: unknown) => {
          this.isLoading = false;
          this.errorMessage = (err as Error).message || 'Join failed';
          console.error('Join failed', err);
        }
      });
    }
  }
}
