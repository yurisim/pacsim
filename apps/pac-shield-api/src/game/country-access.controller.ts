import { Controller, Get, Put, Param, Body, Headers, Res, HttpStatus, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { GameService } from './game.service';
import { UpdateDiceRollDto, BulkDiceRollDto, BulkAccessUpdateDto } from './dto/dice-roll.dto';
import { Country } from '.prisma/client';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiBody } from '@nestjs/swagger';

interface UpdateCountryAccessBody {
  changes: Record<string, boolean | null>;
}

@ApiTags('Country Access')
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
    const etag = this.gameService.buildETag(gameId, snapshot.version);

    res.setHeader('Cache-Control', 'no-cache');

    if (ifNoneMatch && ifNoneMatch.trim() === etag) {
      res.status(HttpStatus.NOT_MODIFIED).send();
      return;
    }

    res.setHeader('ETag', etag);
    return snapshot;
  }

  @Put(':gameId/country-access')
  async putCountryAccess(
    @Param('gameId') gameIdParam: string,
    @Body() body: UpdateCountryAccessBody,
    @Headers('if-match') ifMatch: string | undefined,
    @Res({ passthrough: true }) res: Response
  ) {
    const gameId = Number(gameIdParam);
    if (!Number.isFinite(gameId)) {
      throw new BadRequestException('Invalid gameId');
    }

    try {
      const result = await this.gameService.applyCountryAccessChanges(
        gameId,
        body?.changes ?? ({} as any),
        ifMatch ?? ''
      );
      res.setHeader('ETag', this.gameService.buildETag(gameId, result.version));
      return result;
    } catch (e: any) {
      if (typeof e?.getStatus === 'function' && e.getStatus() === 412) {
        const data = e.getResponse ? e.getResponse() : undefined;
        const latestVersion =
          data && typeof data === 'object' && 'version' in data ? (data as any).version : 0;
        res.setHeader('ETag', this.gameService.buildETag(gameId, latestVersion));
        res.status(HttpStatus.PRECONDITION_FAILED).json({ version: latestVersion });
        return;
      }
      throw e;
    }
  }
}
