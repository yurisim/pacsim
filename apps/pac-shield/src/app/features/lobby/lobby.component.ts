import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule } from 'primeng/autocomplete';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ApiService } from '../../shared/services/api.service';
import { Game, Player, Team } from '../../generated';
import { EMPTY, Observable } from 'rxjs';

enum PlayerRole {
  PLAYER = 'PLAYER',
  COMMANDER = 'COMMANDER',
  DEPUTY = 'DEPUTY',
  STRATEGIST = 'STRATEGIST',
}

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    ClipboardModule,
    ToastModule,
    InputTextModule,
    AutoCompleteModule,
    ReactiveFormsModule,
  ],
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss'],
  providers: [MessageService],
})
export class LobbyComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private apiService = inject(ApiService);
  private clipboard = inject(Clipboard);
  private messageService = inject(MessageService);
  private formBuilder = inject(FormBuilder);

  game$: Observable<Game> = EMPTY;
  playerRoles = Object.values(PlayerRole);
  playerForm: FormGroup;
  isPlayerRegistered = false;

  constructor() {
    this.playerForm = this.formBuilder.group({
      name: ['', Validators.required],
      pin: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
    });
  }

  ngOnInit(): void {
    const gameId = this.route.snapshot.paramMap.get('gameId');
    if (gameId) {
      this.game$ = this.apiService.get<Game>(`game/${gameId}`);
    }
  }

  copyRoomCode(roomCode: string): void {
    this.clipboard.copy(roomCode);
    this.messageService.add({
      severity: 'success',
      summary: 'Copied',
      detail: 'Room code copied to clipboard',
    });
  }

  registerPlayer(): void {
    if (this.playerForm.valid) {
      this.isPlayerRegistered = true;
      this.messageService.add({
        severity: 'success',
        summary: 'Registered',
        detail: `Player ${this.playerForm.value.name} is registered.`,
      });
      this.playerForm.disable(); // Disable form after registration
    }
  }

  joinTeam(team: Team): void {
    if (!this.isPlayerRegistered) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Not Registered',
        detail: 'Please register your player name and PIN before joining a team.',
      });
      return;
    }

    // Here you would typically also show a role selection dropdown or similar
    // For now, we'll hardcode a role for simplicity.
    const playerData = {
      ...this.playerForm.value,
      role: PlayerRole.PLAYER, // Default role
      sessionId: sessionStorage.getItem('sessionId') ?? '',
    };

    this.apiService
      .post<Player>('player', {
        ...playerData,
        team: { connect: { id: team.id } },
      })
      .subscribe(() => {
        // Refresh game data
        this.ngOnInit();
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Joined ${team.name} as ${playerData.name}`,
        });
      });
  }
}
