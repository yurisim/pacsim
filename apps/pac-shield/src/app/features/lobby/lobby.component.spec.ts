import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { LobbyComponent } from './lobby.component';
import { ApiService } from '../../shared/services/api.service';
import { WebSocketService } from '../../shared/services/websocket.service';
import { AuthService } from '../../shared/services/auth.service';
import { Game, Player } from '../../generated';

describe('LobbyComponent', () => {
  let component: LobbyComponent;
  let fixture: ComponentFixture<LobbyComponent>;
  let mockApiService: jasmine.SpyObj<ApiService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockWebSocketService: jasmine.SpyObj<WebSocketService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockDialogService: jasmine.SpyObj<DialogService>;

  const mockGame: Game = {
    id: 1,
    roomCode: 'ABCD',
    turn: 1,
    day: 1,
    executionBlock: 1,
    phase: 'CRISIS',
    victoryConditionMP: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    players: [
      {
        id: 1,
        sessionId: 'session1',
        name: 'Test Player',
        role: 'COMMANDER',
        teamId: null,
        gameId: 1,
      },
      {
        id: 2,
        sessionId: 'session2',
        name: 'Another Player',
        role: 'PLAYER',
        teamId: null,
        gameId: 1,
      },
    ],
    teams: [],
  };

  beforeEach(async () => {
    const apiSpy = {
      get: jest.fn(),
      updatePlayerNameAndRole: jest.fn(),
    };
    const authSpy = {
      getPlayerId: jest.fn(),
    };
    const webSocketSpy = {
      connect: jest.fn(),
      listen: jest.fn(),
    };
    const messageSpy = {
      add: jest.fn(),
    };
    const dialogSpy = {
      open: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LobbyComponent, BrowserAnimationsModule],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: WebSocketService, useValue: webSocketSpy },
        { provide: MessageService, useValue: messageSpy },
        { provide: DialogService, useValue: dialogSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'gameId' ? '1' : null),
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LobbyComponent);
    component = fixture.componentInstance;
    mockApiService = TestBed.inject(ApiService) as any;
    mockAuthService = TestBed.inject(AuthService) as any;
    mockWebSocketService = TestBed.inject(WebSocketService) as any;
    mockMessageService = TestBed.inject(MessageService) as any;
    mockDialogService = TestBed.inject(DialogService) as any;

    // Setup default mocks
    mockApiService.get.mockReturnValue(of(mockGame));
    mockAuthService.getPlayerId.mockReturnValue('1');
    mockWebSocketService.listen.mockReturnValue(of({}));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load game data and set up current player observable', () => {
      component.ngOnInit();

      expect(mockApiService.get).toHaveBeenCalledWith('game/1');
      expect(mockWebSocketService.connect).toHaveBeenCalledWith('1');

      // Test that currentPlayer$ emits the correct player
      component.currentPlayer$.subscribe((player) => {
        expect(player).toEqual(mockGame.players[0]); // Player with id 1
      });
    });

    it('should handle missing gameId', () => {
      // Override the ActivatedRoute to return null gameId
      const route = TestBed.inject(ActivatedRoute);
      jest.spyOn(route.snapshot.paramMap, 'get').mockReturnValue(null);

      component.ngOnInit();

      expect(mockApiService.get).not.toHaveBeenCalled();
    });
  });

  describe('formatRoleDisplay', () => {
    it('should return the role as-is', () => {
      expect(component.formatRoleDisplay('COMMANDER')).toBe('COMMANDER');
      expect(component.formatRoleDisplay('PLAYER')).toBe('PLAYER');
      expect(component.formatRoleDisplay('GM')).toBe('GM');
    });

    it('should return default role for empty input', () => {
      expect(component.formatRoleDisplay('')).toBe('PLAYER');
      expect(component.formatRoleDisplay(null as any)).toBe('PLAYER');
      expect(component.formatRoleDisplay(undefined as any)).toBe('PLAYER');
    });
  });

  describe('onPlayerSettingsSave', () => {
    beforeEach(() => {
      mockApiService.updatePlayerNameAndRole.mockReturnValue(of({}));
    });

    it('should update player settings successfully', () => {
      const settings = { name: 'Updated Name', role: 'COMMANDER' as const };

      component.onPlayerSettingsSave(settings);

      expect(mockApiService.updatePlayerNameAndRole).toHaveBeenCalledWith('1', 'Updated Name', 'COMMANDER');
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Settings Updated',
        detail: 'Your name and role have been updated',
      });
      expect(component.showPlayerSettingsDialog).toBeFalsy();
    });

    it('should handle missing player ID', () => {
      mockAuthService.getPlayerId.mockReturnValue(null);
      const settings = { name: 'Test', role: 'PLAYER' as const };

      component.onPlayerSettingsSave(settings);

      expect(mockApiService.updatePlayerNameAndRole).not.toHaveBeenCalled();
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Not Authenticated',
        detail: 'Please rejoin the game.',
      });
    });

    it('should handle API errors', () => {
      mockApiService.updatePlayerNameAndRole.mockReturnValue({
        subscribe: (callbacks: any) => {
          callbacks.error({ error: { message: 'Update failed' } });
        }
      } as any);
      const settings = { name: 'Test', role: 'PLAYER' as const };

      component.onPlayerSettingsSave(settings);

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Update Failed',
        detail: 'Update failed',
      });
    });
  });

  describe('Player role display in lobby', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should display player roles in the current player section', async () => {
      // Wait for async operations
      await fixture.whenStable();
      fixture.detectChanges();

      // Check that the current player observable provides the correct data
      component.currentPlayer$.subscribe((player) => {
        expect(player?.role).toBe('COMMANDER');
        expect(player?.name).toBe('Test Player');
      });
    });

    it('should show all players with their roles in the lobby list', () => {
      component.game$.subscribe((game) => {
        const players = game.players;
        expect(players.length).toBe(2);
        expect(players[0].role).toBe('COMMANDER');
        expect(players[1].role).toBe('PLAYER');
      });
    });
  });

  describe('openPlayerSettings', () => {
    it('should set showPlayerSettingsDialog to true', () => {
      component.showPlayerSettingsDialog = false;

      component.openPlayerSettings();

      expect(component.showPlayerSettingsDialog).toBeTruthy();
    });
  });

  describe('onPlayerSettingsCancel', () => {
    it('should set showPlayerSettingsDialog to false', () => {
      component.showPlayerSettingsDialog = true;

      component.onPlayerSettingsCancel();

      expect(component.showPlayerSettingsDialog).toBeFalsy();
    });
  });
});