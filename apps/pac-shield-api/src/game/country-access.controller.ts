import { Controller, Get, Put, Param, Body, BadRequestException, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { GameService } from './game.service';
import { UpdateDiceRollDto, BulkDiceRollDto, BulkAccessUpdateDto } from './dto/dice-roll.dto';
import { Country } from '.prisma/client';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../app/auth/jwt-auth.guard';
import { GameMasterGuard } from '../app/auth/game-master.guard';

interface UpdateCountryAccessBody {
  changes: Record<string, boolean | null>;
}

@ApiTags('Country Access')
/**
 * REST API controller for managing per-country political access within a game.
 *
 * Responsibilities:
 * - Retrieve the current access snapshot (Full Access, Overflight Only, No Access)
 * - Update dice rolls for a single country or in bulk, computing resulting access levels
 * - Perform bulk access-level updates across one or more countries
 * - Validate inputs and return appropriate HTTP status codes
 *
 * Notes:
 * - This controller is backed by the database and supersedes legacy in-memory endpoints
 *   previously defined in GameController.
 * - Swagger decorators provide request/response documentation for OpenAPI.
 *
 * @class CountryAccessController
 */
@Controller('games')
export class CountryAccessController {
  constructor(private readonly gameService: GameService) {}

  @Get(':gameId/country-access')
  @ApiOperation({ summary: 'Get country access snapshot for a game' })
  @ApiParam({ name: 'gameId', description: 'Game ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Country access snapshot retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async getCountryAccess(
    @Param('gameId') gameIdParam: string,
    @Res({ passthrough: true }) res: Response
  ) {
    const gameId = Number(gameIdParam);
    if (!Number.isFinite(gameId)) {
      throw new BadRequestException('Invalid gameId');
    }

    const snapshot = await this.gameService.getCountryAccessSnapshot(gameId);

    res.setHeader('Cache-Control', 'no-cache');
    return snapshot;
  }

  @UseGuards(JwtAuthGuard, GameMasterGuard)
  @Put(':gameId/country-access')
  @ApiOperation({ summary: 'Update country access changes' })
  @ApiParam({ name: 'gameId', description: 'Game ID', type: 'number' })
  @ApiBody({ description: 'Country access changes' })
  @ApiResponse({ status: 200, description: 'Country access updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - GM role required' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async putCountryAccess(
    @Param('gameId') gameIdParam: string,
    @Body() body: UpdateCountryAccessBody,
    @Res({ passthrough: true }) _res: Response
  ) {
    const gameId = Number(gameIdParam);
    if (!Number.isFinite(gameId)) {
      throw new BadRequestException('Invalid gameId');
    }

    const result = await this.gameService.applyCountryAccessChanges(
      gameId,
      body?.changes ?? ({} as any)
    );
    return result;
  }

  @UseGuards(JwtAuthGuard, GameMasterGuard)
  @Put(':gameId/country-access/:country/dice-roll')
  @ApiOperation({ summary: 'Update dice roll for a specific country' })
  @ApiParam({ name: 'gameId', description: 'Game ID', type: 'number' })
  @ApiParam({ name: 'country', description: 'Country code', enum: Country })
  @ApiBody({ type: UpdateDiceRollDto })
  @ApiResponse({ status: 200, description: 'Dice roll updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid dice roll value' })
  @ApiResponse({ status: 403, description: 'Forbidden - GM role required' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async updateCountryDiceRoll(
    @Param('gameId') gameIdParam: string,
    @Param('country') countryParam: string,
    @Body() updateDto: UpdateDiceRollDto
  ) {
    const gameId = Number(gameIdParam);
    if (!Number.isFinite(gameId)) {
      throw new BadRequestException('Invalid gameId');
    }

    // Validate country enum
    const country = countryParam.toUpperCase() as Country;
    if (!Object.values(Country).includes(country)) {
      throw new BadRequestException(`Invalid country: ${countryParam}`);
    }

    return await this.gameService.updateCountryDiceRoll(gameId, country, updateDto);
  }

  @UseGuards(JwtAuthGuard, GameMasterGuard)
  @Put(':gameId/country-access/dice-rolls')
  @ApiOperation({ summary: 'Update dice rolls for multiple countries' })
  @ApiParam({ name: 'gameId', description: 'Game ID', type: 'number' })
  @ApiBody({ type: BulkDiceRollDto })
  @ApiResponse({ status: 200, description: 'Bulk dice rolls updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid dice roll values' })
  @ApiResponse({ status: 403, description: 'Forbidden - GM role required' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async updateBulkDiceRolls(
    @Param('gameId') gameIdParam: string,
    @Body() bulkDto: BulkDiceRollDto
  ) {
    const gameId = Number(gameIdParam);
    if (!Number.isFinite(gameId)) {
      throw new BadRequestException('Invalid gameId');
    }

    // Validate countries in the bulk update
    for (const { country } of bulkDto.diceRolls) {
      if (!Object.values(Country).includes(country)) {
        throw new BadRequestException(`Invalid country: ${country}`);
      }
    }

    return await this.gameService.updateBulkDiceRolls(gameId, bulkDto);
  }

  @UseGuards(JwtAuthGuard, GameMasterGuard)
  @Put(':gameId/country-access/bulk')
  @ApiOperation({ summary: 'Update access level for multiple countries' })
  @ApiParam({ name: 'gameId', description: 'Game ID', type: 'number' })
  @ApiBody({ type: BulkAccessUpdateDto })
  @ApiResponse({ status: 200, description: 'Bulk access levels updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid access level or countries' })
  @ApiResponse({ status: 403, description: 'Forbidden - GM role required' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async updateBulkCountryAccess(
    @Param('gameId') gameIdParam: string,
    @Body() bulkDto: BulkAccessUpdateDto
  ) {
    const gameId = Number(gameIdParam);
    if (!Number.isFinite(gameId)) {
      throw new BadRequestException('Invalid gameId');
    }

    // Validate countries if provided
    if (bulkDto.countries) {
      for (const country of bulkDto.countries) {
        if (!Object.values(Country).includes(country)) {
          throw new BadRequestException(`Invalid country: ${country}`);
        }
      }
    }

    return await this.gameService.updateBulkCountryAccess(gameId, bulkDto);
  }
}
