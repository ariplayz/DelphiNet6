import { IsString, IsIn, IsOptional, IsUUID } from 'class-validator';

export class UpdateRoutingFormDto {
  @IsIn(['open', 'in_progress', 'completed'])
  @IsOptional()
  status?: 'open' | 'in_progress' | 'completed';

  @IsUUID()
  @IsOptional()
  assignedTo?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
