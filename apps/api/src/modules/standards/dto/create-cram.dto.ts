import { IsString, IsNotEmpty, IsOptional, IsUUID, IsDateString } from 'class-validator';

export class CreateCramDto {
  @IsUUID() studentUserId!: string;
  @IsString() @IsNotEmpty() subject!: string;
  @IsString() @IsOptional() description?: string;
  @IsDateString() @IsOptional() dueAt?: string;
}
