import { Game } from '../../../shared/models/generated';

export interface GameState {
  game: Game | null;
  loading: boolean;
  error: string | null;
}

export const initialGameState: GameState = {
  game: null,
  loading: false,
  error: null,
};
