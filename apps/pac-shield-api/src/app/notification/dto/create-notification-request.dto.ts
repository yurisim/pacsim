import { IsInt, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateNotificationDto } from '../../generated/notification/create-notification.dto';

/**
 * Extended CreateNotificationDto that includes relation ID fields
 * Note: The generated DTO from Prisma doesn't include foreign key fields
 * so we extend it here with the required gameId and optional targetTeamId
 */
export class CreateNotificationRequestDto extends CreateNotificationDto {
  @ApiProperty({
    type: 'integer',
    description: 'ID of the game this notification belongs to',
  })
  @IsInt()
  gameId!: number;

  @ApiProperty({
    type: 'integer',
    required: false,
    nullable: true,
    description: 'ID of the team this notification is targeted to (optional)',
  })
  @IsOptional()
  @IsInt()
  targetTeamId?: number | null;
}
