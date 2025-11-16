import { IsEmail, MinLength } from 'class-validator';

// Signin data validation (email, password)

export class SignInDto {
  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;
}
