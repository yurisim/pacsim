import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { WebSocketService } from './shared/services/websocket.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  imports: [RouterModule, CommonModule, FormsModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  standalone: true,
})
export class App implements OnInit, OnDestroy {
  protected title = 'pac-shield';
  public pingMessage = 'Hello from Angular!';
  public pongMessages: string[] = [];

  private webSocketService = inject(WebSocketService);

  ngOnInit(): void {
    this.webSocketService.listen<string>('pong').subscribe((data) => {
      this.pongMessages.push(data);
    });
  }

  sendPing(): void {
    if (this.pingMessage) {
      this.webSocketService.sendMessage('ping', this.pingMessage);
    }
  }

  ngOnDestroy(): void {
    this.webSocketService.disconnect();
  }
}
