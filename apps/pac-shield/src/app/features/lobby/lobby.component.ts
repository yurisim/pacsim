import {
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { ApiService } from '../../shared/services/api.service';
import { Game, Player, Team } from '../../generated';
import { AuthService } from '../../shared/services/auth.service';
import { WebSocketService } from '../../shared/services/websocket.service';
import { PlayerSettingsDialogComponent, PlayerSettings } from './player-settings-dialog/player-settings-dialog.component';
import { playerRole, PlayerRole } from '../../generated/enums';


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
    InputGroupModule,
    InputGroupAddonModule,
    ReactiveFormsModule,
    FormsModule,
    PlayerSettingsDialogComponent,
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
  private authService = inject(AuthService);
  private webSocketService = inject(WebSocketService);

  game: WritableSignal<Game | null> = signal(null);
  playerForm: FormGroup;
  isPlayerRegistered = false;
  gameCode = '';
  players: Player[] = [];
  newPlayerName = '';
  showPlayerSettingsDialog = false;

  currentPlayer = computed(() => {
    const playerId = this.authService.getPlayerId();
    return this.game()?.players?.find((p) => p.id === Number(playerId));
  });

  constructor() {
    this.playerForm = this.formBuilder.group({
      name: ['', Validators.required],
      pin: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
    });

    effect(() => {
      const currentName = this.currentPlayer()?.name;
      if (currentName) {
        this.newPlayerName = currentName;
      }
    });
  }

  ngOnInit(): void {
    const gameId = this.route.snapshot.paramMap.get('gameId');
    if (gameId) {
      this.gameCode = gameId;

      this.webSocketService
        .listen<Player[]>('playerListUpdate')
        .subscribe((players) => {
          this.game.update((game) => {
            if (!game) return null;
            const updatedGame = { ...game, players };
            if (updatedGame.teams) {
              updatedGame.teams.forEach((team) => {
                team.players = players.filter((p) => p.teamId === team.id);
              });
            }
            return updatedGame;
          });
        });

      this.apiService
        .get<Game>(`game/${gameId}`)
        .subscribe((game) => this.game.set(game));
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
        detail:
          'Please register your player name and PIN before joining a team.',
      });
      return;
    }

    // Here you would typically also show a role selection dropdown or similar
    // For now, we'll hardcode a role for simplicity.
    const playerData = {
      ...this.playerForm.value,
      role: 'PLAYER', // Default role
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

  changeName() {
    const player = this.currentPlayer();
    if (!player || !this.newPlayerName || this.newPlayerName === player.name)
      return;

    const playerId = this.authService.getPlayerId();
    if (!playerId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Not Authenticated',
        detail: 'Please rejoin the game.',
      });
      return;
    }

    this.apiService.updatePlayerName(playerId, this.newPlayerName).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Name Updated',
          detail: 'Your name has been changed',
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Update Failed',
          detail: err.error?.message || 'Failed to update name',
        });
      },
    });
  }

  openPlayerSettings(): void {
    this.showPlayerSettingsDialog = true;
  }

  onPlayerSettingsSave(settings: PlayerSettings): void {
    const playerId = this.authService.getPlayerId();
    if (!playerId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Not Authenticated',
        detail: 'Please rejoin the game.',
      });
      return;
    }

    this.apiService.updatePlayerNameAndRole(playerId, settings.name, settings.role).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Settings Updated',
          detail: 'Your name and role have been updated',
        });
        this.showPlayerSettingsDialog = false;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Update Failed',
          detail: err.error?.message || 'Failed to update settings',
        });
      },
    });
  }

  onPlayerSettingsCancel(): void {
    this.showPlayerSettingsDialog = false;
  }

  formatRoleDisplay(role: string): string {
    switch (role) {
      case 'GM':
        return 'Game Master';
      case 'PLAYER':
        return 'Player';
      case 'COMMANDER':
        return 'Commander';
      case 'DEPUTY':
        return 'Deputy';
      case 'STRATEGIST':
        return 'Strategist';
      default:
        return role;
    }
  }
}
