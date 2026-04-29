import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateRoutingFormDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  assignedTo?: string;
}
