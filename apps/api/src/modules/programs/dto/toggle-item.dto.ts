import { IsBoolean } from 'class-validator';

export class ToggleItemDto {
  @IsBoolean() completed!: boolean;
}
