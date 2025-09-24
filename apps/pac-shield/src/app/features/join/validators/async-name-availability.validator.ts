import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, map, catchError, switchMap, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Async validator that checks if a player name is available for a given room code.
 * NOTE: This is provided as a reusable async validator. The current refactor
 * drives availability checks via the facade to keep presentational components dumb.
 * If you prefer control-level validation, wire this into a FormControl and pass the roomCode.
 */
export function nameAvailabilityValidator(roomCodeAccessor: () => string): AsyncValidatorFn {
  const http = inject(HttpClient);
  return (control: AbstractControl) => {
    return of(control.value as string).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      map((v) => (v || '').trim()),
      switchMap((name) => {
        const roomCode = (roomCodeAccessor() || '').trim();
        if (!roomCode || !name) {
          return of(null);
        }
        return http
          .post<{ isAvailable: boolean }>(`${environment.apiUrl}/player/check-name-availability`, {
            roomCode,
            playerName: name,
          })
          .pipe(
            map((resp) => (resp.isAvailable ? null : ({ nameTaken: true } as ValidationErrors))),
            catchError(() => of({ availabilityError: true } as ValidationErrors))
          );
      })
    );
  };
}
