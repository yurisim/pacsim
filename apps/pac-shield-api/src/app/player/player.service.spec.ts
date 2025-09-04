import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlayerService } from './player.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { EventsGateway } from '../events.gateway';
import { ClsService } from 'nestjs-cls';
import { UpdatePlayerWithRoleDto, PlayerRole } from './dto/update-player-with-role.dto';

describe('PlayerService', () => {
  let service: PlayerService;
  let prismaService: PrismaService;
  let eventsGateway: EventsGateway;
  let clsService: ClsService;

  const mockPlayer = {
    id: 1,
    sessionId: 'test-session',
    name: 'Test Player',
    role: PlayerRole.PLAYER,
    teamId: null,
    gameId: 1,
    game: {
      id: 1,
      roomCode: 'ROOM123'
    }
  };

  beforeEach(async () => {
    const mockPrismaService = {
      player: {
        update: jest.fn(),
        findMany: jest.fn(),
      },
    } as any;

    const mockEventsGateway = {
      sendToLobby: jest.fn(),
    } as any;

    const mockClsService = {
      getId: jest.fn().mockReturnValue('req_123'),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: {} },
        { provide: EventsGateway, useValue: mockEventsGateway },
        { provide: ClsService, useValue: mockClsService },
      ],
    }).compile();

    service = module.get<PlayerService>(PlayerService);
    prismaService = module.get(PrismaService);
    eventsGateway = module.get(EventsGateway);
    clsService = module.get(ClsService);
  });

  describe('updateWithRole', () => {
    it('should trim whitespace from name', async () => {
      const updateDto: UpdatePlayerWithRoleDto = {
        name: '  Trimmed Name  ',
        role: PlayerRole.PLAYER
      };

      (prismaService.player.update as jest.Mock).mockResolvedValue(mockPlayer);

      await service.updateWithRole(1, updateDto);

      expect(prismaService.player.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: 'Trimmed Name',
          role: PlayerRole.PLAYER
        },
        include: { game: true }
      });
    });

    it('should throw BadRequestException when name is empty', async () => {
      const updateDto: UpdatePlayerWithRoleDto = {
        name: '',
        role: PlayerRole.PLAYER
      };

      await expect(service.updateWithRole(1, updateDto))
        .rejects.toThrow(new BadRequestException('Name cannot be empty'));

      expect(prismaService.player.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when name is only whitespace', async () => {
      const updateDto: UpdatePlayerWithRoleDto = {
        name: '   ',
        role: PlayerRole.PLAYER
      };

      await expect(service.updateWithRole(1, updateDto))
        .rejects.toThrow(new BadRequestException('Name cannot be empty'));

      expect(prismaService.player.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid role', async () => {
      const updateDto: UpdatePlayerWithRoleDto = {
        name: 'Valid Name',
        role: 'INVALID_ROLE' as PlayerRole
      };

      await expect(service.updateWithRole(1, updateDto))
        .rejects.toThrow(new BadRequestException('Invalid role. Must be one of: PLAYER, COMMANDER, DEPUTY, STRATEGIST, GM'));

      expect(prismaService.player.update).not.toHaveBeenCalled();
    });

    it('should accept all valid roles', async () => {
      const validRoles = [PlayerRole.PLAYER, PlayerRole.COMMANDER, PlayerRole.DEPUTY, PlayerRole.STRATEGIST, PlayerRole.GM];
      
      (prismaService.player.update as jest.Mock).mockResolvedValue(mockPlayer);

      for (const role of validRoles) {
        const updateDto: UpdatePlayerWithRoleDto = {
          name: 'Test Player',
          role
        };

        await service.updateWithRole(1, updateDto);
        
        expect(prismaService.player.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: {
            name: 'Test Player',
            role
          },
          include: { game: true }
        });
      }
    });

    it('should throw NotFoundException when player does not exist', async () => {
      const updateDto: UpdatePlayerWithRoleDto = {
        name: 'Test Player',
        role: PlayerRole.PLAYER
      };

      const prismaError = { code: 'P2025', message: 'Record not found' };
      (prismaService.player.update as jest.Mock).mockRejectedValue(prismaError);

      await expect(service.updateWithRole(1, updateDto))
        .rejects.toThrow(new NotFoundException('Player not found'));
    });

    it('should update only name when role is not provided', async () => {
      const updateDto: UpdatePlayerWithRoleDto = {
        name: 'New Name'
      };

      (prismaService.player.update as jest.Mock).mockResolvedValue(mockPlayer);

      await service.updateWithRole(1, updateDto);

      expect(prismaService.player.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: 'New Name'
        },
        include: { game: true }
      });
    });

    it('should update only role when name is not provided', async () => {
      const updateDto: UpdatePlayerWithRoleDto = {
        role: PlayerRole.COMMANDER
      };

      (prismaService.player.update as jest.Mock).mockResolvedValue(mockPlayer);

      await service.updateWithRole(1, updateDto);

      expect(prismaService.player.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          role: PlayerRole.COMMANDER
        },
        include: { game: true }
      });
    });
  });

  describe('updatePlayerName', () => {
    it('should trim whitespace from name', async () => {
      (prismaService.player.update as jest.Mock).mockResolvedValue({ ...mockPlayer, game: null });

      await service.updatePlayerName(1, '  Trimmed Name  ');

      expect(prismaService.player.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Trimmed Name' },
        include: { game: true }
      });
    });

    it('should throw BadRequestException when name is empty', async () => {
      await expect(service.updatePlayerName(1, ''))
        .rejects.toThrow(new BadRequestException('Name cannot be empty'));

      expect(prismaService.player.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when name is only whitespace', async () => {
      await expect(service.updatePlayerName(1, '   '))
        .rejects.toThrow(new BadRequestException('Name cannot be empty'));

      expect(prismaService.player.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when player does not exist', async () => {
      const prismaError = { code: 'P2025', message: 'Record not found' };
      (prismaService.player.update as jest.Mock).mockRejectedValue(prismaError);

      await expect(service.updatePlayerName(1, 'Valid Name'))
        .rejects.toThrow(new NotFoundException('Player not found'));
    });

    it('should send WebSocket update when player has game', async () => {
      const playerWithGame = { ...mockPlayer, game: { id: 1, roomCode: 'ROOM123' } };
      const gamePlayers = [mockPlayer, { ...mockPlayer, id: 2 }];
      
      (prismaService.player.update as jest.Mock).mockResolvedValue(playerWithGame);
      (prismaService.player.findMany as jest.Mock).mockResolvedValue(gamePlayers);

      await service.updatePlayerName(1, 'New Name');

      expect(eventsGateway.sendToLobby).toHaveBeenCalledWith(
        'ROOM123',
        'playerListUpdate',
        gamePlayers
      );
    });

    it('should not send WebSocket update when player has no game', async () => {
      const playerWithoutGame = { ...mockPlayer, game: null };
      
      (prismaService.player.update as jest.Mock).mockResolvedValue(playerWithoutGame);

      await service.updatePlayerName(1, 'New Name');

      expect(eventsGateway.sendToLobby).not.toHaveBeenCalled();
    });
  });
});