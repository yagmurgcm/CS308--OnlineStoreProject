import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  IsOptional,
} from 'class-validator';

// Signup data validation (name, email, password)

export class SignUpDto {
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  taxId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  homeAddress?: string;

  @MinLength(6)
  password: string;
}
