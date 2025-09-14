import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
  Optional,
} from '@nestjs/common';
import { AtoService } from './ato.service';
import { CreateATOLineDto } from '../generated/aTOLine/create-aTOLine.dto';
import { UpdateATOLineDto } from '../generated/aTOLine/update-aTOLine.dto';
import { CreateATORequestDto } from './dto/create-ato-request.dto';
import { UpdateATORequestDto } from './dto/update-ato-request.dto';
import { ATOLine } from '../generated/aTOLine/aTOLine.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AircraftInstance } from '@prisma/client';

/**
 * Controller for ATO (Air Tasking Order) operations.
 * Handles flight plan creation, PPR approval workflow, and ATO management.
 */
@Controller('ato')
@UseGuards(JwtAuthGuard)
export class AtoController {
  constructor(private readonly atoService: AtoService) {}

  /**
   * Get available aircraft for a specific team
   * GET /ato/teams/:teamId/aircraft
   */
  @Get('teams/:teamId/aircraft')
  async getAircraftForTeam(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Request() req: any
  ): Promise<AircraftInstance[]> {
    return this.atoService.getAircraftForTeam(teamId, req.user);
  }

  /**
   * Get all aircraft in game (GM access)
   * GET /ato/games/:gameId/aircraft
   */
  @Get('games/:gameId/aircraft')
  async getAllAircraftInGame(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Request() req: any
  ): Promise<AircraftInstance[]> {
    return this.atoService.getAllAircraftInGame(gameId, req.user);
  }

  /**
   * Create a new flight plan (ATO line)
   * POST /ato
   */
  @Post()
  async createFlightPlan(
    @Body() createAtoRequestDto: CreateATORequestDto,
    @Request() req: any
  ): Promise<ATOLine> {
    console.log('=== ATO Controller: createFlightPlan START ===');
    console.log('Request body received:', JSON.stringify(createAtoRequestDto, null, 2));
    console.log('Request user:', JSON.stringify(req.user, null, 2));
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));

    try {
      const result = await this.atoService.createAtoLine(createAtoRequestDto, req.user);
      console.log('ATO Controller: createFlightPlan SUCCESS');
      console.log('Created ATO Line:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('=== ATO Controller: createFlightPlan ERROR ===');
      console.error('Error details:', error);
      console.error('Error stack:', error.stack);
      console.error('Error message:', error.message);
      console.error('=== ATO Controller: createFlightPlan ERROR END ===');
      throw error;
    }
  }

  /**
   * Get all ATO lines for a game
   * GET /ato/game/:gameId
   */
  @Get('game/:gameId')
  async getAtoLinesByGame(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Query('turn') turn?: string
  ): Promise<ATOLine[]> {
    const turnNumber = turn ? parseInt(turn, 10) : undefined;
    return this.atoService.getAtoLinesByGameAndTurn(gameId, turnNumber);
  }

  /**
   * Get current turn ATO lines for a game
   * GET /ato/game/:gameId/current
   */
  @Get('game/:gameId/current')
  async getCurrentAtoLines(
    @Param('gameId', ParseIntPipe) gameId: number
  ): Promise<ATOLine[]> {
    return this.atoService.getCurrentAtoLines(gameId);
  }

  /**
   * Get PPR queue (pending approvals) for a game
   * GET /ato/game/:gameId/ppr-queue
   */
  @Get('game/:gameId/ppr-queue')
  async getPprQueue(
    @Param('gameId', ParseIntPipe) gameId: number
  ): Promise<ATOLine[]> {
    return this.atoService.getPprQueue(gameId);
  }

  /**
   * Get specific ATO line by ID
   * GET /ato/:id
   */
  @Get(':id')
  async getAtoLineById(@Param('id', ParseIntPipe) id: number): Promise<ATOLine> {
    // This would typically include additional authorization checks
    const lines = await this.atoService.getAtoLinesByGameAndTurn(0); // Placeholder
    const line = lines.find(l => l.id === id);
    if (!line) {
      throw new Error('ATO line not found');
    }
    return line;
  }

  /**
   * Update a flight plan
   * PUT /ato/:id
   */
  @Put(':id')
  async updateFlightPlan(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAtoRequestDto: UpdateATORequestDto,
    @Request() req: any
  ): Promise<ATOLine> {
    return this.atoService.updateAtoLine(id, updateAtoRequestDto, req.user);
  }

  /**
   * Delete a flight plan
   * DELETE /ato/:id
   */
  @Delete(':id')
  async deleteFlightPlan(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any
  ): Promise<{ success: boolean }> {
    await this.atoService.deleteAtoLine(id, req.user);
    return { success: true };
  }

  /**
   * Approve PPR for a flight plan
   * POST /ato/:id/approve-ppr
   */
  @Post(':id/approve-ppr')
  async approvePpr(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any
  ): Promise<ATOLine> {
    // GM-only authorization enforced in service
    return this.atoService.approvePpr(id, req.user);
  }

  /**
   * Deny PPR for a flight plan
   * POST /ato/:id/deny-ppr
   */
  @Post(':id/deny-ppr')
  async denyPpr(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any
  ): Promise<ATOLine> {
    // GM-only authorization enforced in service
    return this.atoService.denyPpr(id, req.user);
  }

  /**
   * Bulk approve PPR for multiple flight plans
   * POST /ato/game/:gameId/bulk-approve-ppr
   */
  @Post('game/:gameId/bulk-approve-ppr')
  async bulkApprovePpr(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Body() body: { atoLineIds?: number[] },
    @Request() req: any
  ): Promise<ATOLine[]> {
    // GM-only authorization enforced in service
    return this.atoService.bulkApprovePpr(gameId, body.atoLineIds, req.user);
  }

  /**
   * Update execution results for a flight plan
   * PUT /ato/:id/execution-result
   */
  @Put(':id/execution-result')
  async updateExecutionResult(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { result: string },
    @Request() req: any
  ): Promise<ATOLine> {
    // TODO: Add role-based authorization (GM only)
    return this.atoService.updateExecutionResult(id, body.result);
  }

  /**
   * Archive ATO lines when advancing turns
   * POST /ato/game/:gameId/archive-turn
   */
  @Post('game/:gameId/archive-turn')
  async archiveTurn(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Body() body: { turn: number },
    @Request() req: any
  ): Promise<{ success: boolean }> {
    // TODO: Add role-based authorization (GM only)
    await this.atoService.archiveAtoLinesForTurn(gameId, body.turn);
    return { success: true };
  }
}
