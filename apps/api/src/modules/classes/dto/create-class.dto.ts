import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export const CLASS_KINDS = [
  'ACADEMIC',
  'AFTERNOON',
  'NIGHT',
  'SEMINAR',
  'STUDENT_SERVICE',
  'CLUB',
  'AFTER_CLASS',
] as const;
export type ClassKindValue = (typeof CLASS_KINDS)[number];

export class CreateClassDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsIn(CLASS_KINDS as unknown as string[])
  kind!: ClassKindValue;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  supervisorUserId?: string;

  @IsOptional()
  @IsString()
  location?: string;
}
