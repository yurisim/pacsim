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

  @Patch(':id/lock')
  async lock(@Param('id') id: string): Promise<Team> {
    return this.teamService.lockTeam(+id);
  }

  @Patch(':id/unlock')
  async unlock(@Param('id') id: string): Promise<Team> {
    return this.teamService.unlockTeam(+id);
  }

  @Post(':id/assign-one-unassigned')
  async assignOneUnassigned(@Param('id') id: string): Promise<Player> {
    return this.teamService.assignOneUnassigned(+id);
  }
}
