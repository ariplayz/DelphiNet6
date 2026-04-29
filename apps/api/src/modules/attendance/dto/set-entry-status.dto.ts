import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { ATTENDANCE_STATUSES, AttendanceStatusValue } from '../attendance.constants';

export class SetEntryStatusDto {
  @IsIn(ATTENDANCE_STATUSES as unknown as string[])
  status!: AttendanceStatusValue;

  @IsOptional()
  @IsString()
  excuseReason?: string;
}

export class BulkEntryItemDto {
  @IsUUID()
  entryId!: string;

  @IsIn(ATTENDANCE_STATUSES as unknown as string[])
  status!: AttendanceStatusValue;

  @IsOptional()
  @IsString()
  excuseReason?: string;
}

export class BulkSetEntriesDto {
  entries!: BulkEntryItemDto[];
}
