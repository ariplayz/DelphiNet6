import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CreateApplicationDto {
  @IsString() @IsNotEmpty() collegeName!: string;
  @IsString() @IsOptional() notes?: string;
  @IsDateString() @IsOptional() deadline?: string;
}
