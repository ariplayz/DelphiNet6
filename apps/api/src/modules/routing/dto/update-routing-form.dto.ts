import { IsString, IsIn, IsOptional, IsUUID } from 'class-validator';

export class UpdateRoutingFormDto {
  @IsIn(['open', 'in_progress', 'completed'])
  @IsOptional()
  status?: 'open' | 'in_progress' | 'completed'; // eslint-disable-line @typescript-eslint/no-inferrable-types

  @IsUUID()
  @IsOptional()
  assignedTo?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
