import { IsString, IsIn, IsOptional, IsDateString } from 'class-validator';

export class UpdateApplicationDto {
  @IsString() @IsOptional() collegeName?: string;
  @IsIn(['researching', 'applied', 'accepted', 'rejected', 'enrolled']) @IsOptional() status?: string;
  @IsString() @IsOptional() notes?: string;
  @IsDateString() @IsOptional() deadline?: string;
}
