import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CreateStoryDto {
  @IsString() @IsNotEmpty() title!: string;
  @IsString() @IsNotEmpty() @MinLength(20) body!: string;
}
