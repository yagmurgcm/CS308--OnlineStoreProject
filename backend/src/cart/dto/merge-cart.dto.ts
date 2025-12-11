import { IsUUID } from 'class-validator';

export class MergeCartDto {
  @IsUUID()
  guestToken: string;
}
