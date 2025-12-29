import { IsIn, IsNotEmpty, IsString, Matches } from 'class-validator';

export class GetFinanceSummaryQueryDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  start: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  end: string;

  @IsString()
  @IsIn(['day', 'week', 'month'])
  groupBy: 'day' | 'week' | 'month';
}
