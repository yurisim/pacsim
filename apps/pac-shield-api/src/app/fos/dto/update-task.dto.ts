import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum } from 'class-validator';
import { AirfieldTask } from '@prisma/client';

export class UpdateTaskDto {
  @ApiProperty({
    enum: AirfieldTask,
    description: 'AirfieldTask enum value to update',
  })
  @IsEnum(AirfieldTask)
  task!: AirfieldTask;

  @ApiProperty({
    type: 'boolean',
    description: 'Whether the task is completed (true) or not (false)',
  })
  @IsBoolean()
  completed!: boolean;
}
