import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateSeminarDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek!: number[];

  @IsString()
  startsAt!: string; // HH:mm

  @IsInt()
  @Min(5)
  @Max(600)
  durationMinutes!: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  leaderUserId?: string;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
