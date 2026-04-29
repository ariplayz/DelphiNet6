import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDormDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsUUID()
  captainUserId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDormDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  captainUserId?: string | null;

  @IsOptional()
  notes?: string | null;
}

export class CreateRoomDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  capacity?: number;
}

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  capacity?: number;
}

export class SetResidentsDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  userIds!: string[];
}

export const DORM_SLOT_KINDS = ['morning', 'evening'] as const;
export type DormSlotKind = (typeof DORM_SLOT_KINDS)[number];

export class CreateScheduleSlotDto {
  @IsIn(DORM_SLOT_KINDS as unknown as string[])
  slot!: DormSlotKind;

  @Matches(/^([01]?\d|2[0-3]):[0-5]\d$/, { message: 'timeOfDay must be HH:MM' })
  timeOfDay!: string;

  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek!: number[];

  @IsOptional()
  allowsMessyRoomPoints?: boolean;
}

export class UpdateScheduleSlotDto {
  @IsOptional()
  @IsIn(DORM_SLOT_KINDS as unknown as string[])
  slot?: DormSlotKind;

  @IsOptional()
  @Matches(/^([01]?\d|2[0-3]):[0-5]\d$/, { message: 'timeOfDay must be HH:MM' })
  timeOfDay?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  @IsOptional()
  allowsMessyRoomPoints?: boolean;
}

export class SetDormEntryStatusDto {
  @IsIn(['HERE', 'LATE', 'ABSENT', 'EXCUSED'])
  status!: 'HERE' | 'LATE' | 'ABSENT' | 'EXCUSED';

  @IsOptional()
  @IsString()
  excuseReason?: string;
}

export class MarkRoomMessyDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
