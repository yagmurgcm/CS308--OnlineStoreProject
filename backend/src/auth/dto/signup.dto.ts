import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// Signup data validation (name, email, password)

export class SignUpDto {
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  taxId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  homeAddress: string;

  @MinLength(6)
  password: string;
}
