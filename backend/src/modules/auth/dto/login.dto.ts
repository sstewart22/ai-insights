import {
  IsEmail,
  IsOptional,
  IsString,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'emailOrId', async: false })
class EmailOrIdConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments) {
    const obj = args.object as LoginDto;
    return !!(obj.id || obj.email);
  }

  defaultMessage() {
    return 'Either "id" or "email" must be provided';
  }
}

export class LoginDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  password?: string;

  @Validate(EmailOrIdConstraint)
  _emailOrId!: true;
}
