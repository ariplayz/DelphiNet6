import { IsString, IsUUID, IsNotEmpty, MinLength } from 'class-validator';

export class CreateEthicsReportDto {
  @IsUUID()
  subjectId!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  body!: string;
}
