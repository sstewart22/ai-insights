import { IsString, MinLength } from 'class-validator';

export class OtpCodeDto {
  @IsString()
  @MinLength(1)
  code!: string;
}
