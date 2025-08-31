import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../shared/services/api.service';
import { Game, Player, Team } from '../../generated';
import { EMPTY, Observable } from 'rxjs';
import { JoinTeamDialogComponent } from './join-team-dialog/join-team-dialog.component';
import { WebSocketService } from '../../shared/services/websocket.service';

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
    DynamicDialogModule,
    InputTextModule,
    AutoCompleteModule,
    ReactiveFormsModule,
  ],
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss'],
  providers: [MessageService, DialogService],
})
export class LobbyComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private apiService = inject(ApiService);
  private clipboard = inject(Clipboard);
  private messageService = inject(MessageService);
  private dialogService = inject(DialogService);
  private webSocketService = inject(WebSocketService);

  game$: Observable<Game> = EMPTY;
  playerRoles = Object.values(PlayerRole);

  ngOnInit(): void {
    const gameId = this.route.snapshot.paramMap.get('gameId');
    if (gameId) {
      this.game$ = this.apiService.get<Game>(`game/${gameId}`);
      this.webSocketService.connect(gameId);
      this.webSocketService.listen('playerJoined').subscribe(() => {
        this.game$ = this.apiService.get<Game>(`game/${gameId}`);
      });
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

  openJoinTeamDialog(team: Team): void {
    const ref = this.dialogService.open(JoinTeamDialogComponent, {
      header: `Join ${team.name}`,
      width: '70%',
      data: {
        teamId: team.id,
        roles: this.playerRoles,
      },
    });

    ref.onClose.subscribe((playerData: Omit<Player, 'id' | 'team'>) => {
      if (playerData) {
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
    });
  }
}
