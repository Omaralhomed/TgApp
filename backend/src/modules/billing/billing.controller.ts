import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { BillingService } from './billing.service';
import { CreateOrderDto, SubmitReceiptDto } from './dto/create-order.dto';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('methods')
  getPaymentMethods() {
    return this.billingService.getPaymentMethods();
  }

  @Get('plans')
  getPricingPlans() {
    return this.billingService.getPricingPlans();
  }

  @Get('overview')
  @UseGuards(JwtAuthGuard)
  getUserBillingOverview(@CurrentUser() user: any) {
    return this.billingService.getUserBillingOverview(user.id);
  }

  @Post('orders')
  @UseGuards(JwtAuthGuard)
  createOrder(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.billingService.createPaymentOrder(user.id, dto);
  }

  @Post('submit-receipt')
  @UseGuards(JwtAuthGuard)
  submitReceipt(@CurrentUser() user: any, @Body() dto: SubmitReceiptDto) {
    return this.billingService.submitReceipt(user.id, dto);
  }

  @Post('upload-receipt-file')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('receipt', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async uploadReceiptFile(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Please provide an image or PDF file of your receipt');
    }
    const publicUrl = await this.billingService.saveUploadedReceiptFile(file);
    return {
      success: true,
      url: publicUrl,
    };
  }

  @Get('export-invoices')
  @UseGuards(JwtAuthGuard)
  async exportInvoices(@CurrentUser() user: any) {
    const csvContent = await this.billingService.exportInvoicesCsv(user.id);
    return {
      success: true,
      csvContent,
      filename: `billing_invoices_${user.id.slice(0, 8)}.csv`,
    };
  }
}
