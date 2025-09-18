import { Game } from '../../../generated';

export interface GameState {
  game: Game | null;
  loading: boolean;
  error: string | null;
  hexGrid: Record<string, string> | null;
}

export const initialGameState: GameState = {
  game: null,
  loading: false,
  error: null,
  hexGrid: null,
};
