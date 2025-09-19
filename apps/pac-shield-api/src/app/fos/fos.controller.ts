import { Controller, Get, Post, Patch, Param, Body, ParseIntPipe, HttpCode } from '@nestjs/common';
import { FosService } from './fos.service';
import { ForwardOperatingSite } from '../generated';
import { ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { ActivateFOSDto } from './dto/activate-fos.dto';

/**
 * FOS REST API for Forward Operating Site management.
 * Endpoints:
 *  - GET    /fos/game/:gameId        -> get all FOSs for a game
 *  - POST   /fos/:id/activate        -> activate FOS by fosIdNumber (1-30) and assign to team
 *  - PATCH  /fos/:id/deactivate      -> deactivate FOS by database ID
 */
@Controller('fos')
export class FosController {
  constructor(private readonly fosService: FosService) {}

  @Get('game/:gameId')
  @ApiOperation({ summary: 'Get all FOSs for a game' })
  @ApiParam({ name: 'gameId', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'List of all FOSs in the game',
    type: [ForwardOperatingSite]
  })
  async getFOSsForGame(@Param('gameId', ParseIntPipe) gameId: number): Promise<ForwardOperatingSite[]> {
    return this.fosService.getFOSsForGame(gameId);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate FOS and assign to team' })
  @ApiParam({ name: 'id', type: 'number', description: 'FOS ID Number' })
  @ApiBody({ type: ActivateFOSDto })
  @ApiResponse({
    status: 201,
    description: 'FOS activated successfully',
    type: ForwardOperatingSite
  })
  async activateFOS(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ActivateFOSDto
  ): Promise<ForwardOperatingSite> {
    return this.fosService.activateFOS(id, body.teamId, body.currentTurn);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate FOS' })
  @ApiParam({ name: 'id', type: 'number', description: 'FOS ID' })
  @ApiResponse({
    status: 200,
    description: 'FOS deactivated successfully',
    type: ForwardOperatingSite
  })
  async deactivateFOS(@Param('id', ParseIntPipe) id: number): Promise<ForwardOperatingSite> {
    return this.fosService.deactivateFOS(id);
  }
}
