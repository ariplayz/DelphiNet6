import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class AddBookDto {
  @IsString() @IsNotEmpty() title!: string;
  @IsString() @IsOptional() author?: string;
  @IsString() @IsOptional() notes?: string;
  @IsDateString() @IsOptional() completedAt?: string;
}
