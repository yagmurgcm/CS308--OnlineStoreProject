import { IsOptional, IsString, IsEmail, MaxLength } from 'class-validator';

export class CreateConversationDto {
  // Guest information (optional if logged in)
  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  guestName?: string;
}

