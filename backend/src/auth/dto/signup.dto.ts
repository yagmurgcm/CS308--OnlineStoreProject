import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';


// Signup data validation (name, email, password)

export class SignUpDto {
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;
}

