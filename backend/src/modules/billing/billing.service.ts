import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EventsGateway } from '../websocket/events.gateway';
import { CreateOrderDto, SubmitReceiptDto } from './dto/create-order.dto';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadedReceiptFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size?: number;
}

export interface PaymentMethodInfo {
  id: string;
  name: string;
  nameAr: string;
  type: 'CRYPTO' | 'FIAT' | 'WALLET';
  network?: string;
  address: string;
  qrPayload?: string;
  instructions: string;
  instructionsAr: string;
  badge?: string;
}

export interface PricingPlanInfo {
  id: string;
  name: string;
  nameAr: string;
  priceMonthly: number;
  priceAnnually: number;
  currency: string;
  quotaMessagesLimit: number;
  quotaAccountsLimit: number;
  features: string[];
  featuresAr: string[];
  isPopular?: boolean;
}

export interface TopUpPackageInfo {
  id: string;
  messagesCount: number;
  price: number;
  currency: string;
  pricePerThousand: string;
  name: string;
  nameAr: string;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly uploadsDir = path.join(process.cwd(), 'uploads', 'receipts');

  constructor(
    private readonly prisma: PrismaService,
    private readonly wsGateway: EventsGateway,
  ) {
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Get supported deposit methods and active wallet addresses
   */
  getPaymentMethods(): PaymentMethodInfo[] {
    return [
      {
        id: 'CRYPTO_USDT',
        name: 'USDT (TRC-20 Network)',
        nameAr: 'تيذر USDT (شبكة TRC-20 ترون)',
        type: 'CRYPTO',
        network: 'TRON (TRC20)',
        address: process.env.PAYMENT_USDT_TRC20_ADDRESS || 'TX9a7B8cE9yZ2w1kX4mP7qR5sT3uV8wX1y',
        qrPayload: `tron:${process.env.PAYMENT_USDT_TRC20_ADDRESS || 'TX9a7B8cE9yZ2w1kX4mP7qR5sT3uV8wX1y'}`,
        instructions: 'Send exact USDT amount via TRON network (TRC-20). Transfers via ERC-20 or BEP-20 will be lost.',
        instructionsAr: 'قم بالتحويل عبر شبكة ترون (TRC-20) حصراً. التحويل عبر شبكات أخرى قد يؤدي لفقدان الرصيد.',
        badge: 'Recommended - فوري وآمن',
      },
      {
        id: 'TON',
        name: 'TON / USDT (The Open Network)',
        nameAr: 'شبكة تيليجرام الرسمية TON / USDT',
        type: 'CRYPTO',
        network: 'TON',
        address: process.env.PAYMENT_TON_ADDRESS || 'EQD2NmD_lH5f5u14KF3ShGyNT88ZXW9mg_JStrXJvuO9TRm3',
        qrPayload: `ton://transfer/${process.env.PAYMENT_TON_ADDRESS || 'EQD2NmD_lH5f5u14KF3ShGyNT88ZXW9mg_JStrXJvuO9TRm3'}`,
        instructions: 'Send USDT or TON native coin via TON network. Lowest gas fees.',
        instructionsAr: 'أرسل TON أو USDT عبر شبكة تيليجرام TON. أسرع وأقل رسوم شبكة.',
        badge: 'Telegram Native - عمولة منخفضة',
      },
      {
        id: 'BANK_TRANSFER',
        name: 'Direct Bank Wire / IBAN',
        nameAr: 'تحويل بنكي مباشر / آيبان (IBAN)',
        type: 'FIAT',
        address: process.env.PAYMENT_BANK_IBAN || 'SA0380000000608010167519',
        instructions: 'Al Rajhi Bank / Beneficiary: Enterprise TG Cloud SaaS LLC / SWIFT: RJHISARI',
        instructionsAr: 'مصرف الراجحي / المستفيد: شركة السحاب التسويقي المحدودة / آيبان: SA0380000000608010167519',
        badge: 'للشركات والمبالغ الكبيرة',
      },
      {
        id: 'VODAFONE_CASH',
        name: 'Vodafone Cash / InstaPay (Egypt)',
        nameAr: 'فودافون كاش / إنستاباي (مصر)',
        type: 'WALLET',
        address: process.env.PAYMENT_VODAFONE_CASH || '+201012345678',
        instructions: 'Send via Vodafone Cash wallet or InstaPay directly. Contact support for instant confirmation.',
        instructionsAr: 'تحويل فوري عبر محفظة فودافون كاش أو إنستاباي. الدفع بالجنيه المصري بسعر الصرف اليومي.',
        badge: 'دفع فوري في مصر',
      },
      {
        id: 'STC_PAY',
        name: 'STC Pay / UrPay (Saudi Arabia)',
        nameAr: 'STC Pay / يورباي (السعودية)',
        type: 'WALLET',
        address: process.env.PAYMENT_STC_PAY || '+966501234567',
        instructions: 'Direct transfer to merchant phone number. Fast activation.',
        instructionsAr: 'تحويل مباشر لمحفظة STC Pay برقم الجوال. التفعيل خلال 15 دقيقة.',
        badge: 'دفع محلي سريع بالسعودية',
      },
    ];
  }

  /**
   * Get subscription tiers and benefits
   */
  getPricingPlans(): { plans: PricingPlanInfo[]; topups: TopUpPackageInfo[] } {
    const plans: PricingPlanInfo[] = [
      {
        id: 'STARTER',
        name: 'Starter Plan',
        nameAr: 'باقة المبتدئين',
        priceMonthly: 29,
        priceAnnually: 290,
        currency: 'USD',
        quotaMessagesLimit: 5000,
        quotaAccountsLimit: 5,
        features: [
          '5,000 Verified Messages / month',
          'Up to 5 Telegram Accounts connected',
          'Direct SOCKS5 / HTTP Proxy Support',
          'Target Group Audience Scraper',
          'Standard Anti-Ban Safety Delays',
        ],
        featuresAr: [
          '5,000 رسالة مضمونة شهرياً',
          'ربط حتى 5 حسابات تيليجرام نشطة',
          'دعم بروكسيات SOCKS5 و HTTP',
          'كاشط جهات الاتصال والمجموعات الفوري',
          'حماية تلقائية ومؤقتات ذكية ضد الحظر',
        ],
      },
      {
        id: 'PRO',
        name: 'Professional Plan',
        nameAr: 'باقة المحترفين (الأكثر طلباً)',
        priceMonthly: 79,
        priceAnnually: 790,
        currency: 'USD',
        quotaMessagesLimit: 30000,
        quotaAccountsLimit: 25,
        isPopular: true,
        features: [
          '30,000 Messages / month',
          'Up to 25 Telegram Accounts with rotation',
          'Full Official Telegram Bot API Suite',
          'AI Marketing Copilot & Spintax Generator',
          'Priority Queue Processing (BullMQ)',
          'Automated Account Health & Warmup',
        ],
        featuresAr: [
          '30,000 رسالة تسويقية شهرياً',
          'ربط حتى 25 حساب تيليجرام مع التدوير الآلي',
          'منظومة البوتات الرسمية بالكامل والبث اللامحدود',
          'المساعد الذكي لتوليد الـ Spintax والنصوص الإبداعية',
          'أولوية فائقة في طوابير الإرسال السحابية',
          'نظام التدفئة التلقائية وحماية السمعة الرقمية',
        ],
      },
      {
        id: 'ENTERPRISE',
        name: 'Enterprise VIP',
        nameAr: 'باقة الشركات والمؤسسات',
        priceMonthly: 199,
        priceAnnually: 1990,
        currency: 'USD',
        quotaMessagesLimit: 150000,
        quotaAccountsLimit: 100,
        features: [
          '150,000 Messages / month',
          'Up to 100 Telegram Accounts connected',
          'Unlimited Official Bots & Broadcasts',
          'Multi-Tenant Team Member Accounts',
          'VIP SOCKS5 Dedicated Pool Proxy Tunnel',
          '24/7 Dedicated Account Manager',
        ],
        featuresAr: [
          '150,000 رسالة تسويقية شهرياً',
          'ربط حتى 100 حساب تيليجرام مع التبديل الذكي',
          'عدد لا محدود من البوتات الرسمية وحملات البث',
          'دعم فريق العمل وتعدد الأعضاء والصلاحيات',
          'نفق بروكسيات VIP مخصص لضمان صفر حظر',
          'مدير حسابات مخصص ودعم فني على مدار الساعة',
        ],
      },
    ];

    const topups: TopUpPackageInfo[] = [
      {
        id: 'TOPUP_5K',
        messagesCount: 5000,
        price: 15,
        currency: 'USD',
        pricePerThousand: '$3.00 / 1K',
        name: 'Top-Up 5,000 Messages',
        nameAr: 'شحن 5,000 رسالة إضافية',
      },
      {
        id: 'TOPUP_10K',
        messagesCount: 10000,
        price: 25,
        currency: 'USD',
        pricePerThousand: '$2.50 / 1K',
        name: 'Top-Up 10,000 Messages',
        nameAr: 'شحن 10,000 رسالة إضافية (توفير 15%)',
      },
      {
        id: 'TOPUP_25K',
        messagesCount: 25000,
        price: 55,
        currency: 'USD',
        pricePerThousand: '$2.20 / 1K',
        name: 'Top-Up 25,000 Messages',
        nameAr: 'شحن 25,000 رسالة إضافية (توفير 25%)',
      },
      {
        id: 'TOPUP_50K',
        messagesCount: 5000,
        price: 99,
        currency: 'USD',
        pricePerThousand: '$1.98 / 1K',
        name: 'Top-Up 50,000 Messages',
        nameAr: 'شحن 50,000 رسالة إضافية (أكبر توفير)',
      },
    ];

    return { plans, topups };
  }

  /**
   * Create a new payment order / receipt request
   */
  async createPaymentOrder(userId: string, dto: CreateOrderDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const receipt = await this.prisma.paymentReceiptRequest.create({
      data: {
        userId,
        planRequested: dto.planRequested,
        durationMonths: dto.durationMonths || 1,
        amountPaid: dto.amountPaid,
        currency: dto.currency || 'USD',
        paymentMethod: dto.paymentMethod,
        transactionReference: dto.transactionReference || null,
        receiptImageUrl: dto.receiptImageUrl || '',
        adminNotes: dto.notes ? `Client Notes: ${dto.notes}` : null,
        status: dto.receiptImageUrl ? 'PENDING' : 'PENDING',
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, subscriptionTier: true },
        },
      },
    });

    this.logger.log(`Created payment order ${receipt.id} for user ${user.email} (${dto.planRequested})`);

    // Notify Admins in real-time
    this.wsGateway.broadcast('admin:new_payment_receipt', {
      receiptId: receipt.id,
      userEmail: user.email,
      planRequested: receipt.planRequested,
      amountPaid: receipt.amountPaid,
      currency: receipt.currency,
      paymentMethod: receipt.paymentMethod,
      createdAt: receipt.createdAt,
    });

    return receipt;
  }

  /**
   * Submit or attach proof of payment (receipt image & TxID)
   */
  async submitReceipt(userId: string, dto: SubmitReceiptDto) {
    const receipt = await this.prisma.paymentReceiptRequest.findFirst({
      where: { id: dto.orderId, userId },
      include: { user: true },
    });

    if (!receipt) {
      throw new NotFoundException('Payment order not found or does not belong to you');
    }

    if (receipt.status === 'APPROVED') {
      throw new BadRequestException('This order has already been approved and activated');
    }

    const updated = await this.prisma.paymentReceiptRequest.update({
      where: { id: dto.orderId },
      data: {
        receiptImageUrl: dto.receiptImageUrl,
        transactionReference: dto.transactionReference,
        adminNotes: dto.userNotes
          ? `${receipt.adminNotes || ''} | Client Update: ${dto.userNotes}`
          : receipt.adminNotes,
        status: 'PENDING',
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, subscriptionTier: true },
        },
      },
    });

    // Notify admins immediately
    this.wsGateway.broadcast('admin:new_payment_receipt', {
      receiptId: updated.id,
      userEmail: receipt.user.email,
      planRequested: updated.planRequested,
      amountPaid: updated.amountPaid,
      currency: updated.currency,
      paymentMethod: updated.paymentMethod,
      transactionReference: updated.transactionReference,
      receiptImageUrl: updated.receiptImageUrl,
    });

    return updated;
  }

  /**
   * Save uploaded receipt file to local storage
   */
  async saveUploadedReceiptFile(file: UploadedReceiptFile): Promise<string> {
    if (!file) throw new BadRequestException('No file provided');

    // Validate mime type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file format. Only JPEG, PNG, WEBP, and PDF files are allowed.');
    }

    // Generate unique safe filename
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const safeName = `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const targetPath = path.join(this.uploadsDir, safeName);

    await fs.promises.writeFile(targetPath, file.buffer);
    return `/uploads/receipts/${safeName}`;
  }

  /**
   * Get billing history and active quotas for a user
   */
  async getUserBillingOverview(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        quotaMessagesLimit: true,
        quotaMessagesUsed: true,
        quotaAccountsLimit: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const orders = await this.prisma.paymentReceiptRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const activeAccountsCount = await this.prisma.telegramAccount.count({
      where: { userId },
    });

    return {
      user,
      activeAccountsCount,
      remainingMessages: Math.max(0, user.quotaMessagesLimit - user.quotaMessagesUsed),
      percentUsed: user.quotaMessagesLimit > 0
        ? Math.min(100, Math.round((user.quotaMessagesUsed / user.quotaMessagesLimit) * 100))
        : 0,
      orders,
    };
  }

  /**
   * Export billing and payment history to CSV with UTF-8 BOM
   */
  async exportInvoicesCsv(userId: string): Promise<string> {
    const orders = await this.prisma.paymentReceiptRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Order ID',
      'Plan / Package',
      'Amount',
      'Currency',
      'Payment Method',
      'Transaction Ref (TxID)',
      'Status',
      'Created At',
      'Reviewed At',
    ];

    const rows = orders.map((o) => [
      o.id,
      o.planRequested,
      o.amountPaid,
      o.currency,
      o.paymentMethod,
      `"${(o.transactionReference || '').replace(/"/g, '""')}"`,
      o.status,
      o.createdAt.toISOString(),
      o.reviewedAt ? o.reviewedAt.toISOString() : '-',
    ]);

    const csvLines = [headers.join(','), ...rows.map((r) => r.join(','))];
    return '\uFEFF' + csvLines.join('\n');
  }
}
