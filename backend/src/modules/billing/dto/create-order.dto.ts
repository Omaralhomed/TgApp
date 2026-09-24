import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  planRequested: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  durationMonths?: number = 1;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @IsNumber()
  @Min(0)
  amountPaid: number;

  @IsString()
  @IsOptional()
  currency?: string = 'USD';

  @IsString()
  @IsOptional()
  transactionReference?: string;

  @IsString()
  @IsOptional()
  receiptImageUrl?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class SubmitReceiptDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  transactionReference: string;

  @IsString()
  @IsNotEmpty()
  receiptImageUrl: string;

  @IsString()
  @IsOptional()
  userNotes?: string;
}
