import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { ThreatTokensService } from './threat-tokens.service';
import { CreateThreatTokenDto } from './dto/create-threat-token.dto';
import { UpdateThreatTokenDto } from './dto/update-threat-token.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * Controller for managing PLA threat tokens on the game board.
 * Handles creation, updates, and destruction tracking for scoring.
 */
@Controller('threat-tokens')
@UseGuards(JwtAuthGuard)
export class ThreatTokensController {
  constructor(private readonly threatTokensService: ThreatTokensService) {}

  /**
   * Create a new threat token on the game board
   * POST /threat-tokens
   */
  @Post()
  async createThreatToken(@Body() dto: CreateThreatTokenDto) {
    return this.threatTokensService.createThreatToken(dto);
  }

  /**
   * Get all threat tokens for a game board
   * GET /threat-tokens/board/:boardId
   */
  @Get('board/:boardId')
  async getThreatTokensByBoard(@Param('boardId', ParseIntPipe) boardId: number) {
    return this.threatTokensService.getThreatTokensByBoard(boardId);
  }

  /**
   * Get a specific threat token by ID
   * GET /threat-tokens/:id
   */
  @Get(':id')
  async getThreatTokenById(@Param('id', ParseIntPipe) id: number) {
    return this.threatTokensService.getThreatTokenById(id);
  }

  /**
   * Update a threat token (e.g., mark as destroyed)
   * PATCH /threat-tokens/:id
   */
  @Patch(':id')
  async updateThreatToken(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateThreatTokenDto
  ) {
    return this.threatTokensService.updateThreatToken(id, dto);
  }

  /**
   * Delete a threat token
   * DELETE /threat-tokens/:id
   */
  @Delete(':id')
  async deleteThreatToken(@Param('id', ParseIntPipe) id: number) {
    await this.threatTokensService.deleteThreatToken(id);
    return { success: true };
  }
}
