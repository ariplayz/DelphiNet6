import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  themeKey?: string;

  // Free-form custom themes; the frontend validates the shape.
  // Stored as JSON; we cap length defensively in the service if needed.
  @IsOptional()
  @IsArray()
  customThemes?: unknown[];
}
