import { Pipe, PipeTransform } from '@angular/core';
import { Player } from '../../generated';

@Pipe({
  name: 'unassignedPlayers',
  standalone: true
})
export class UnassignedPlayersPipe implements PipeTransform {
  transform(players: Player[] | undefined): Player[] {
    if (!players) {
      return [];
    }
    return players.filter(player => !player.teamId);
  }
}