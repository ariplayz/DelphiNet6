import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class WidgetDto {
  @IsString()
  @MinLength(1)
  id!: string;

  @IsString()
  @MinLength(1)
  type!: string;

  @IsInt()
  x!: number;

  @IsInt()
  y!: number;

  @IsInt()
  w!: number;

  @IsInt()
  h!: number;

  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;
}

export class SaveLayoutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WidgetDto)
  widgets!: WidgetDto[];
}
