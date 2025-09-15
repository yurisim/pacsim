import { Player } from '../../../models/player.model';

export enum JoinStep {
  AccountRoom = 'AccountRoom',
  NameConflict = 'NameConflict',
  NewPerson = 'NewPerson',
  Done = 'Done',
}

export interface AccountFormValue {
  gameId: string;
  playerName: string;
  pin?: string;
}

export interface PinFormValue {
  pin: string;
}

export interface NewPersonFormValue {
  newPlayerName: string;
  pin: string;
}

export type RoomValidationStatus = 'idle' | 'pending' | 'valid' | 'invalid';

export interface RoomStatus {
  status: RoomValidationStatus;
  message?: string | null;
  code?: string | null;
}

export interface NameCheckState {
  pending: boolean;
  available: boolean | null;
  error?: string | null;
}

export interface JwtSessionState {
  hasValid: boolean;
  player?: Player | null;
  gameId?: string | null;
}

export interface JoinState {
  step: JoinStep;
  room: RoomStatus;
  nameCheck: NameCheckState;
  busy: boolean;
  error: string | null;
  jwt: JwtSessionState;
  account?: AccountFormValue;
}

export interface JoinViewModel {
  step: JoinStep;
  room: RoomStatus;
  nameCheck: NameCheckState;
  // For Account step rendering: whether the typed name is available (controls PIN visibility)
  nameAvailable?: boolean;
  busy: boolean;
  error: string | null;
  jwt: JwtSessionState;
  accountForm: AccountFormValue;
  pinForm: PinFormValue;
  newPersonForm: NewPersonFormValue;
  canSubmitAccount: boolean;
  canVerifyPin: boolean;
  canCreateNewPerson: boolean;
}
