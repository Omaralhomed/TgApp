import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QueueService } from '../queue/queue.service';
import { parseSpintax } from '../campaigns/spintax.util';

export interface SpintaxGenerationRequest {
  niche?: string;
  productName?: string;
  tone?: 'urgency' | 'professional' | 'casual' | 'vip';
  includeOffer?: boolean;
  ctaLink?: string;
}

export interface QuickBotActionDto {
  action: 'QUICK_STATUS' | 'GENERATE_SPINTAX' | 'CHECK_HEALTH' | 'PAUSE_CAMPAIGN' | 'RESUME_CAMPAIGN' | 'QUICK_LAUNCH';
  payload?: any;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  /**
   * Generates a dynamic Spintax marketing message copy with variations
   */
  async generateSpintaxCopy(dto: SpintaxGenerationRequest) {
    const niche = dto.niche || 'Digital Marketing & Growth';
    const productName = dto.productName || 'Special Exclusive Launch';
    const cta = dto.ctaLink ? ` {Check it out here|Access now|Join today}: ${dto.ctaLink}` : '';

    let template = '';

    switch (dto.tone) {
      case 'urgency':
        template = `{🚨 فرصة محدودة للغاية|⚡ انتباه: العرض ينتهي قريباً|🔥 إعلان عاجل لجميع المهتمين بـ ${niche}}!\n\n` +
          `{مرحباً {firstName}|أهلاً بك صديقنا|تحياتي الطيبة لك},\n\n` +
          `{يسرنا إطلاق|نقدم لك حصرياً|لا تفوت فرصة الحصول على} {${productName}|أقوى حلول ${niche} لعام 2026}.\n` +
          `{المقاعد المتبقية محدودة جداً|العرض متاح لأول 50 مشترك فقط|التسجيل يغلق خلال ساعات}.\n\n` +
          `{للتفاصيل والاشتراك الفوري|اضغط على الرابط المباشر|تواصل معنا الآن}:${cta}\n` +
          `{نتمنى لك دوام التوفيق والنجاح|مع أطيب تحيات فريق العمل|دمت بود}`;
        break;

      case 'vip':
        template = `{💎 دعوة خاصة لكبار العملاء|👑 فرصة استثمارية وتطويرية متميزة|🌟 عرض النخبة في ${niche}}.\n\n` +
          `{السيد المحترم {firstName}|عزيزنا العميل المميز|مرحباً بك {username}},\n\n` +
          `{بناءً على اهتمامك بمجال ${niche}|يسعدنا دعوتك للانضمام إلى|نضع بين يديك تجربة فريدة مع} {${productName}}.\n` +
          `{خدمة استثنائية مصممة لأصحاب الأعمال الطموحين|أداء فائق مع حماية وضمان كامل|نتائج فورية وملموسة}.\n\n` +
          `{احجز استشارتك المجانية|ابدأ تجربتك الخاصة الآن}:${cta}`;
        break;

      case 'casual':
        template = `{👋 مرحب مرحب|هلا والله|أهلاً يا صديقي {firstName}}!\n\n` +
          `{كنت أتصفح ولقيت هذا الشيء الرهيب وحبيت أشاركه معك|إذا مهتم بـ ${niche} لازم تشوف هذا الشيء|شيء جديد كلياً في ${niche}}.\n` +
          `{جربنا ${productName} وكانت النتيجة خيالية|مشروع ${productName} غير كل القواعد}.\n\n` +
          `{شوف التفاصيل من هنا|رابط التجربة المباشر}:${cta}\n` +
          `{وراح تدعي لي إن شاء الله 😉|بالتوفيق لك!|يومك سعيد}`;
        break;

      case 'professional':
      default:
        template = `{تحية طيبة وبعد|أهلاً ومرحباً بك {firstName}|السلام عليكم ورحمة الله},\n\n` +
          `{يسعدنا مشاركتكم أحدث تطورات وحلول مجال ${niche}|نود إحاطتكم علماً بتوفر خدمة ${productName}|يسرنا تقديم هذا العرض المخصص لكم}.\n` +
          `{صُمم هذا النظام لتحقيق أعلى عائد تسويقي وكفاءة تشغيلية|نقدم لكم دعماً متكاملاً وتقارير أداء لحظية|حل موثوق ومعتمد من كبرى الشركات}.\n\n` +
          `{يمكنكم الاطلاع على كافة التفاصيل والمزايا عبر الرابط|للمزيد من المعلومات والبدء الفوري}:${cta}\n` +
          `{مع خالص الشكر والتقدير|فريق المبيعات والتطوير|شاكرين ومقدرين حسن تعاونكم}`;
        break;
    }

    // Generate 4 randomized samples
    const previews: string[] = [];
    for (let i = 0; i < 4; i++) {
      let preview = parseSpintax(template);
      preview = preview.replace(/{firstName}/g, 'أحمد').replace(/{username}/g, '@ahmed_vip');
      previews.push(preview);
    }

    return {
      template,
      previews,
      niche,
      productName,
      tone: dto.tone || 'professional',
    };
  }

  /**
   * Executes rapid actions triggered by the interactive Telegram Bot interface
   */
  async executeBotAction(userId: string, dto: QuickBotActionDto) {
    switch (dto.action) {
      case 'QUICK_STATUS': {
        const [accountsCount, activeAccountsCount, runningCampaignsCount, user] = await Promise.all([
          this.prisma.telegramAccount.count({ where: { userId } }),
          this.prisma.telegramAccount.count({ where: { userId, status: 'ACTIVE' } }),
          this.prisma.campaign.count({ where: { userId, status: 'RUNNING' } }),
          this.prisma.user.findUnique({
            where: { id: userId },
            select: {
              quotaMessagesLimit: true,
              quotaMessagesUsed: true,
              quotaAccountsLimit: true,
              subscriptionTier: true,
            },
          }),
        ]);

        return {
          status: 'SUCCESS',
          type: 'STATUS_REPORT',
          data: {
            accountsCount,
            activeAccountsCount,
            runningCampaignsCount,
            tier: user?.subscriptionTier || 'STARTER',
            quotaUsed: user?.quotaMessagesUsed || 0,
            quotaLimit: user?.quotaMessagesLimit || 1000,
            accountsLimit: user?.quotaAccountsLimit || 5,
          },
          messageAr: `📊 تقرير الحالة التشغيلي السريع:\n• الحسابات المتصلة: ${activeAccountsCount} من ${accountsCount}\n• الحملات قيد الإرسال: ${runningCampaignsCount}\n• رصيد الرسائل المستهلك: ${(user?.quotaMessagesUsed || 0).toLocaleString()} / ${(user?.quotaMessagesLimit || 1000).toLocaleString()}\n• باقة الاشتراك: ${user?.subscriptionTier || 'STARTER'}`,
        };
      }

      case 'CHECK_HEALTH': {
        const accounts = await this.prisma.telegramAccount.findMany({
          where: { userId },
          select: { id: true, phone: true, status: true, totalSent: true, totalFailed: true },
        });

        const active = accounts.filter((a) => a.status === 'ACTIVE').length;
        const flood = accounts.filter((a) => a.status === 'FLOOD_WAIT').length;
        const errors = accounts.filter((a) => a.status === 'AUTH_KEY_UNREGISTERED' || a.status === 'BANNED').length;

        return {
          status: 'SUCCESS',
          type: 'HEALTH_REPORT',
          data: {
            total: accounts.length,
            active,
            flood,
            errors,
          },
          messageAr: `🛡️ فحص صحة الحسابات والأمان:\n• الحسابات النشطة والسليمة 100%: ${active}\n• في وضع التهدئة المؤقت (Flood Wait): ${flood}\n• تحتاج إعادة تسجيل أو معطلة: ${errors}\n\nنصيحة النظام: ${flood > 0 ? 'يرجى إعطاء الحسابات المعلقة مهلة 24 ساعة للتعافي التلقائي.' : 'جميع الحسابات في أتم الجاهزية للإرسال الفوري!'}`,
        };
      }

      case 'PAUSE_CAMPAIGN': {
        const campaignId = dto.payload?.campaignId;
        if (!campaignId) throw new BadRequestException('campaignId is required');

        this.queueService.cancelExecution(campaignId);
        await this.prisma.campaign.update({
          where: { id: campaignId },
          data: { status: 'PAUSED' },
        });

        return {
          status: 'SUCCESS',
          messageAr: `⏸️ تم إيقاف الحملة مؤقتاً بنجاح. يمكنك استئنافها في أي وقت دون فقدان أي عضو.`,
        };
      }

      case 'RESUME_CAMPAIGN': {
        const campaignId = dto.payload?.campaignId;
        if (!campaignId) throw new BadRequestException('campaignId is required');

        await this.queueService.addCampaignJob({ campaignId, userId });

        return {
          status: 'SUCCESS',
          messageAr: `▶️ تم استئناف الحملة في الخلفية بأمان من آخر نقطة تفتيش.`,
        };
      }

      case 'GENERATE_SPINTAX': {
        return this.generateSpintaxCopy(dto.payload || {});
      }

      default:
        throw new BadRequestException('Unknown bot action');
    }
  }
}
