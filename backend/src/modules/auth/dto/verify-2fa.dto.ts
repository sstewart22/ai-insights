import { IsString, MinLength } from 'class-validator';

export class Verify2faDto {
  @IsString()
  @MinLength(1)
  twoFactorToken!: string;

  @IsString()
  @MinLength(1)
  code!: string;
}
