import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateThreatTokenDto } from './dto/create-threat-token.dto';
import { UpdateThreatTokenDto } from './dto/update-threat-token.dto';
import { ThreatToken } from '@prisma/client';

/**
 * Service for managing PLA threat tokens on the game board.
 */
@Injectable()
export class ThreatTokensService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new threat token
   */
  async createThreatToken(dto: CreateThreatTokenDto): Promise<ThreatToken> {
    console.log('Creating threat token with DTO:', JSON.stringify(dto, null, 2));

    try {
      const result = await this.prisma.threatToken.create({
        data: {
          boardId: dto.boardId,
          type: dto.type,
          strength: dto.strength,
          locationHex: dto.locationHex,
        },
      });
      console.log('Threat token created successfully:', result.id);
      return result;
    } catch (error) {
      console.error('Error creating threat token:', error);
      throw error;
    }
  }

  /**
   * Get all threat tokens for a game board
   */
  async getThreatTokensByBoard(boardId: number): Promise<ThreatToken[]> {
    return this.prisma.threatToken.findMany({
      where: { boardId },
    });
  }

  /**
   * Get a specific threat token by ID
   */
  async getThreatTokenById(id: number): Promise<ThreatToken> {
    const token = await this.prisma.threatToken.findUnique({
      where: { id },
    });

    if (!token) {
      throw new NotFoundException(`Threat token with ID ${id} not found`);
    }

    return token;
  }

  /**
   * Update a threat token (e.g., mark as destroyed)
   */
  async updateThreatToken(id: number, dto: UpdateThreatTokenDto): Promise<ThreatToken> {
    // Verify token exists
    await this.getThreatTokenById(id);

    return this.prisma.threatToken.update({
      where: { id },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.strength !== undefined && { strength: dto.strength }),
        ...(dto.locationHex !== undefined && { locationHex: dto.locationHex }),
        ...(dto.destroyedAt !== undefined && { destroyedAt: dto.destroyedAt }),
        ...(dto.destroyedByTeamId !== undefined && { destroyedByTeamId: dto.destroyedByTeamId }),
      },
    });
  }

  /**
   * Delete a threat token
   */
  async deleteThreatToken(id: number): Promise<void> {
    // Verify token exists
    await this.getThreatTokenById(id);

    await this.prisma.threatToken.delete({
      where: { id },
    });
  }
}
