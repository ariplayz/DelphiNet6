import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SeminarAttendanceStatus } from '@prisma/client';

export class SeminarAttendanceItem {
  @IsString()
  studentUserId!: string;

  @IsEnum(SeminarAttendanceStatus)
  status!: SeminarAttendanceStatus;

  @IsOptional()
  @IsString()
  excuseReason?: string;
}

export class RecordSeminarAttendanceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeminarAttendanceItem)
  entries!: SeminarAttendanceItem[];
}
