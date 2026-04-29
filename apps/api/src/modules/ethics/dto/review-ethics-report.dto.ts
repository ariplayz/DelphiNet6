import { IsString, IsIn, IsOptional } from 'class-validator';

export class ReviewEthicsReportDto {
  @IsIn(['reviewed', 'resolved'])
  status!: 'reviewed' | 'resolved';

  @IsString()
  @IsOptional()
  reviewNotes?: string;
}
