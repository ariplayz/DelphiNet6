import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class SetRosterDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  userIds!: string[];
}
