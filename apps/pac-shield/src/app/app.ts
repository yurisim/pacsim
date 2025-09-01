import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ToolbarModule } from 'primeng/toolbar';
import { WebSocketService } from './shared/services/websocket.service';

import { ButtonModule } from 'primeng/button';

@Component({
  imports: [RouterModule, ToolbarModule, AsyncPipe, CommonModule, ButtonModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  standalone: true,
})
export class App implements OnInit {
  protected title = 'OPERATION: PACIFIC SHIELD';
  protected ws = inject(WebSocketService);

  ngOnInit(): void {
    this.ws.connect('lobby');
  }
}

