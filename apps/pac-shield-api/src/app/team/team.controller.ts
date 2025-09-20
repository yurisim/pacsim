import { Controller, Patch, Post, Param } from '@nestjs/common';
import { TeamService } from './team.service';
import { Player, Team } from '../generated';

/**
 * Team REST API for roster management controls that GMs use in the lobby.
 * Endpoints:
 *  - PATCH /team/:id/lock      -> lock roster (no joins/moves)
 *  - PATCH /team/:id/unlock    -> unlock roster
 *  - POST  /team/:id/assign-one-unassigned -> assign first unassigned player in same game to this team
 */
@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  /**
   * Locks a team's roster to prevent players from joining or being moved to it.
   * Used by game masters to control team composition during game setup.
   * @param id - The team's unique ID as a string
   * @returns Promise<Team> - The updated team record with locked status
   * @throws NotFoundException when team does not exist
   * @example PATCH /team/123/lock
   */
  @Patch(':id/lock')
  async lock(@Param('id') id: string): Promise<Team> {
    return this.teamService.lockTeam(+id);
  }

  /**
   * Unlocks a team's roster to allow players to join or be moved to it.
   * Used by game masters to enable team composition changes during game setup.
   * @param id - The team's unique ID as a string
   * @returns Promise<Team> - The updated team record with unlocked status
   * @throws NotFoundException when team does not exist
   * @example PATCH /team/123/unlock
   */
  @Patch(':id/unlock')
  async unlock(@Param('id') id: string): Promise<Team> {
    return this.teamService.unlockTeam(+id);
  }

  /**
   * Assigns the first available unassigned player to this team.
   * Automatically finds and assigns an unassigned player in the same game to this team.
   * Respects team lock status and GM role constraints.
   * @param id - The team's unique ID as a string
   * @returns Promise<Player> - The player record that was assigned to the team
   * @throws NotFoundException when team does not exist
   * @throws BadRequestException when team is locked or no unassigned players available
   * @example POST /team/123/assign-one-unassigned
   */
  @Post(':id/assign-one-unassigned')
  async assignOneUnassigned(@Param('id') id: string): Promise<Player> {
    return this.teamService.assignOneUnassigned(+id);
  }
}
