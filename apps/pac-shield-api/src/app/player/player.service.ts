import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlayerDto, UpdatePlayerDto } from '../generated';

@Injectable()
export class PlayerService {
  constructor(private readonly prisma: PrismaService) {}

  create(createPlayerDto: CreatePlayerDto) {
    return this.prisma.player.create({ data: createPlayerDto });
  }

  findAll() {
    return this.prisma.player.findMany();
  }

  findOne(id: number) {
    return this.prisma.player.findUnique({ where: { id } });
  }

  update(id: number, updatePlayerDto: UpdatePlayerDto) {
    return this.prisma.player.update({ where: { id }, data: updatePlayerDto });
  }

  remove(id: number) {
    return this.prisma.player.delete({ where: { id } });
  }
}
