import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { CommonModule } from '@angular/common';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AppState } from '../../../core/store/app.state';
import * as GameActions from '../../../core/store/game/game.actions';
import { selectGame, selectGameError, selectGameLoading } from '../../../core/store/game/game.selectors';

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule],
  templateUrl: './game-board.component.html',
  styleUrls: ['./game-board.component.scss']
})
export class GameBoardComponent implements OnInit {
  private store = inject(Store<AppState>);
  private route = inject(ActivatedRoute);

  game$ = this.store.select(selectGame);
  isLoading$ = this.store.select(selectGameLoading);
  error$ = this.store.select(selectGameError);

  ngOnInit(): void {
    // The roomCode from the route is actually the gameId
    const gameId = this.route.snapshot.paramMap.get('id');
    if (gameId) {
      this.store.dispatch(GameActions.loadGameById({ gameId }));
    }
  }
}
