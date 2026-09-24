import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TelegramEngineService } from '../telegram/telegram-engine.service';
import { EventsGateway } from '../websocket/events.gateway';
import { ScraperProcessor } from '../queue/processors/scraper.processor';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tgEngine: TelegramEngineService,
    private readonly wsGateway: EventsGateway,
    private readonly scraperProcessor: ScraperProcessor,
  ) {}

  async listGroups(userId?: string) {
    return this.prisma.groupTarget.findMany({
      where: userId ? { userId } : {},
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getGroupMembers(
    groupId: string,
    userId?: string,
    filters?: { activeOnly?: boolean; hasUsernameOnly?: boolean; excludeBots?: boolean; search?: string },
    page: number = 1,
    limit: number = 50,
  ) {
    if (userId) {
      const group = await this.prisma.groupTarget.findFirst({ where: { id: groupId, userId } });
      if (!group) throw new NotFoundException('Group not found');
    }

    const whereClause: any = { groupId };

    if (filters?.excludeBots) {
      whereClause.isBot = false;
    }
    if (filters?.hasUsernameOnly) {
      whereClause.username = { not: null };
    }
    if (filters?.activeOnly) {
      whereClause.status = { in: ['UserStatusOnline', 'UserStatusRecently', 'active_sender'] };
    }
    if (filters?.search && filters.search.trim().length > 0) {
      const query = filters.search.trim().toLowerCase();
      whereClause.OR = [
        { username: { contains: query } },
        { firstName: { contains: query } },
        { lastName: { contains: query } },
        { phone: { contains: query } },
      ];
    }

    const take = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const skip = Math.max((Number(page) || 1) - 1, 0) * take;

    const [members, total] = await Promise.all([
      this.prisma.scrapedMember.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.scrapedMember.count({ where: whereClause }),
    ]);

    return {
      members,
      total,
      page: Number(page) || 1,
      limit: take,
      totalPages: Math.ceil(total / take) || 1,
    };
  }

  async scrapeGroup(dto: { accountId: string; groupTarget: string; limit?: number; userId?: string }) {
    const account = await this.prisma.telegramAccount.findFirst({
      where: dto.userId ? { id: dto.accountId, userId: dto.userId } : { id: dto.accountId },
      include: { proxy: true },
    });

    if (!account || !account.sessionString || account.status !== 'ACTIVE') {
      throw new BadRequestException('A valid ACTIVE Telegram account belonging to you is required to scrape groups.');
    }

    return this.scraperProcessor.processScraping({
      phone: account.phone,
      groupUsernameOrLink: dto.groupTarget,
      userId: dto.userId || account.userId,
      limit: dto.limit || 2000,
    });
  }

  async deleteGroup(id: string, userId?: string) {
    const group = await this.prisma.groupTarget.findFirst({
      where: userId ? { id, userId } : { id },
    });
    if (!group) throw new NotFoundException('Group not found');
    await this.prisma.groupTarget.delete({ where: { id: group.id } });
    return { success: true, message: 'Group and scraped members deleted.' };
  }

  async deleteMember(memberId: string, userId?: string) {
    const member = await this.prisma.scrapedMember.findFirst({
      where: { id: memberId },
      include: { group: true },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (userId && member.group.userId !== userId) {
      throw new BadRequestException('Access denied');
    }

    await this.prisma.scrapedMember.delete({ where: { id: memberId } });
    await this.prisma.groupTarget.update({
      where: { id: member.groupId },
      data: { memberCount: { decrement: 1 } },
    });

    return { success: true };
  }

  async importCustomLeads(dto: {
    title: string;
    members: Array<{ username?: string; firstName?: string; lastName?: string; phone?: string }>;
    userId: string;
  }) {
    if (!dto.members || dto.members.length === 0) {
      throw new BadRequestException('At least one member is required to import.');
    }

    const group = await this.prisma.groupTarget.create({
      data: {
        title: dto.title || `Imported List (${new Date().toLocaleDateString()})`,
        memberCount: dto.members.length,
        scrapedAt: new Date(),
        userId: dto.userId,
      },
    });

    const validMembers = dto.members.map((m, idx) => ({
      groupId: group.id,
      userId: `imp_${Date.now()}_${idx}`,
      username: m.username ? m.username.replace(/^@/, '') : null,
      firstName: m.firstName || null,
      lastName: m.lastName || null,
      phone: m.phone || null,
      status: 'imported',
      isBot: false,
      isScam: false,
    }));

    let inserted = 0;
    const chunkSize = 200;
    for (let i = 0; i < validMembers.length; i += chunkSize) {
      const chunk = validMembers.slice(i, i + chunkSize);
      try {
        const res = await this.prisma.scrapedMember.createMany({
          data: chunk,
        });
        inserted += res.count;
      } catch (err) {
        for (const item of chunk) {
          try {
            await this.prisma.scrapedMember.create({ data: item });
            inserted++;
          } catch {}
        }
      }
    }

    this.wsGateway.emitLog('SUCCESS', `Successfully imported ${inserted} custom leads into list "${group.title}".`);

    return {
      group,
      totalSaved: inserted,
    };
  }

  /**
   * Export scraped group members to CSV with UTF-8 BOM
   */
  async exportMembersCsv(groupId: string, userId?: string): Promise<string> {
    const group = await this.prisma.groupTarget.findFirst({
      where: userId ? { id: groupId, userId } : { id: groupId },
      include: { members: true },
    });
    if (!group) throw new NotFoundException('Target group not found');

    const headers = ['Telegram User ID', 'Username', 'First Name', 'Last Name', 'Phone', 'Status', 'Is Bot'];
    const rows = group.members.map((m) => [
      m.userId,
      m.username ? `@${m.username}` : '',
      `"${(m.firstName || '').replace(/"/g, '""')}"`,
      `"${(m.lastName || '').replace(/"/g, '""')}"`,
      m.phone || '',
      m.status || 'unknown',
      m.isBot ? 'Yes' : 'No',
    ]);

    const csvLines = [headers.join(','), ...rows.map((r) => r.join(','))];
    return '\uFEFF' + csvLines.join('\n');
  }
}

