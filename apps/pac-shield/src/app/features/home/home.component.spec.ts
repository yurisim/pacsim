import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { HomeComponent } from './home.component';
import { ApiService } from '../../shared/services/api.service';
import { AuthService } from '../../shared/services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { WebSocketService } from '../../shared/services/websocket.service';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let mockApiService: jest.Mocked<ApiService>;
  let mockRouter: jest.Mocked<Router>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockWebSocketService: jest.Mocked<WebSocketService>;
  let connectionStatus$: BehaviorSubject<boolean>;

  beforeEach(async () => {
    connectionStatus$ = new BehaviorSubject<boolean>(true);

    mockApiService = {
      post: jest.fn()
    } as unknown as jest.Mocked<ApiService>;

    mockRouter = {
      navigate: jest.fn()
    } as unknown as jest.Mocked<Router>;

    mockAuthService = {
      createGameMaster: jest.fn(),
      getGameId: jest.fn()
    } as unknown as jest.Mocked<AuthService>;

    mockNotificationService = {
      success: jest.fn()
    } as unknown as jest.Mocked<NotificationService>;

    mockWebSocketService = {
      connectionStatus$: connectionStatus$
    } as unknown as jest.Mocked<WebSocketService>;

    await TestBed.configureTestingModule({
      imports: [HomeComponent, NoopAnimationsModule],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: WebSocketService, useValue: mockWebSocketService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
  });

  describe('button disabled state behavior', () => {
    it('should disable "Start New Game" button when WebSocket is disconnected', () => {
      connectionStatus$.next(false);
      component.isLoading = false;
      fixture.detectChanges();

      const startButton = fixture.debugElement.query(
        By.css('button[matButton="filled"]')
      );

      expect(startButton.nativeElement.disabled).toBe(true);
    });

    it('should disable "Start New Game" button when loading', () => {
      connectionStatus$.next(true);
      component.isLoading = true;
      fixture.detectChanges();

      const startButton = fixture.debugElement.query(
        By.css('button[matButton="filled"]')
      );

      expect(startButton.nativeElement.disabled).toBe(true);
    });

    it('should disable "Start New Game" button when both loading and disconnected', () => {
      connectionStatus$.next(false);
      component.isLoading = true;
      fixture.detectChanges();

      const startButton = fixture.debugElement.query(
        By.css('button[matButton="filled"]')
      );

      expect(startButton.nativeElement.disabled).toBe(true);
    });

    it('should enable "Start New Game" button when connected and not loading', () => {
      connectionStatus$.next(true);
      component.isLoading = false;
      fixture.detectChanges();

      const startButton = fixture.debugElement.query(
        By.css('button[matButton="filled"]')
      );

      expect(startButton.nativeElement.disabled).toBe(false);
    });

    it('should disable "Join Game" button when WebSocket is disconnected', () => {
      connectionStatus$.next(false);
      fixture.detectChanges();

      const joinButton = fixture.debugElement.query(
        By.css('button[matButton="tonal"]')
      );

      expect(joinButton.nativeElement.disabled).toBe(true);
    });

    it('should enable "Join Game" button when WebSocket is connected', () => {
      connectionStatus$.next(true);
      fixture.detectChanges();

      const joinButton = fixture.debugElement.query(
        By.css('button[matButton="tonal"]')
      );

      expect(joinButton.nativeElement.disabled).toBe(false);
    });

    it('should react to WebSocket connection status changes', () => {
      // Initially connected
      connectionStatus$.next(true);
      fixture.detectChanges();

      const startButton = fixture.debugElement.query(
        By.css('button[matButton="filled"]')
      );
      const joinButton = fixture.debugElement.query(
        By.css('button[matButton="tonal"]')
      );

      expect(startButton.nativeElement.disabled).toBe(false);
      expect(joinButton.nativeElement.disabled).toBe(false);

      // Connection lost
      connectionStatus$.next(false);
      fixture.detectChanges();

      expect(startButton.nativeElement.disabled).toBe(true);
      expect(joinButton.nativeElement.disabled).toBe(true);

      // Connection restored
      connectionStatus$.next(true);
      fixture.detectChanges();

      expect(startButton.nativeElement.disabled).toBe(false);
      expect(joinButton.nativeElement.disabled).toBe(false);
    });
  });
});
