import { IsArray, IsString } from 'class-validator';

export class SetSeminarRosterDto {
  @IsArray()
  @IsString({ each: true })
  studentUserIds!: string[];
}
