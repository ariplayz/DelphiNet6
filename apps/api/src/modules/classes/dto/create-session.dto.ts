import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateSessionDto {
  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsString()
  recurrenceRule?: string;
}
