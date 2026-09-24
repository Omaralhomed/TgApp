import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * Registers a new user with Argon2id hash and provisions default Organization
   */
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new BadRequestException('An account with this email address already exists.');
    }

    const passwordHash = await this.cryptoService.hashPassword(dto.password);

    // Create Organization
    const orgSlug = (dto.orgName || dto.name || 'My Org')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .concat('-', Math.random().toString(36).substring(2, 6));

    const org = await this.prisma.organization.create({
      data: {
        name: dto.orgName || (dto.name ? `${dto.name}'s Team` : 'Primary Workspace'),
        slug: orgSlug,
        plan: 'ENTERPRISE',
      },
    });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name || dto.email.split('@')[0],
        role: 'OWNER',
        plan: 'ENTERPRISE',
        orgId: org.id,
      },
    });

    await this.prisma.membership.create({
      data: {
        userId: user.id,
        orgId: org.id,
        role: 'OWNER',
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.plan,
        orgId: user.orgId,
        orgName: org.name,
      },
      ...tokens,
    };
  }

  /**
   * Authenticates user, verifies Argon2id hash, and creates rotating refresh session
   */
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { org: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isMatch = await this.cryptoService.verifyPassword(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const tokens = await this.generateTokens(user, ipAddress, userAgent);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.plan,
        orgId: user.orgId,
        orgName: user.org?.name || 'Primary Workspace',
      },
      ...tokens,
    };
  }

  /**
   * Generates short-lived Access Token and persists rotating Refresh Token
   */
  private async generateTokens(user: { id: string; email: string; role: string; orgId?: string | null }, ipAddress?: string, userAgent?: string) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
    };

    // Short-lived access token (15 mins)
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    
    // Rotating refresh token (7 days)
    const refreshToken = this.cryptoService.generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      token: accessToken, // Backward compatibility
      expiresIn: 900,
    };
  }

  /**
   * Rotates refresh token and generates new access token
   */
  async refresh(dto: RefreshTokenDto) {
    const session = await this.prisma.userSession.findUnique({
      where: { refreshToken: dto.refreshToken },
      include: { user: { include: { org: true } } },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date() || !session.user) {
      throw new UnauthorizedException('Session expired or revoked. Please login again.');
    }

    // Revoke used refresh token for rotation
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    // Issue new pair
    const tokens = await this.generateTokens(session.user);

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        plan: session.user.plan,
        orgId: session.user.orgId,
        orgName: session.user.org?.name,
      },
      ...tokens,
    };
  }

  /**
   * Logs out single session
   */
  async logout(refreshToken: string) {
    if (refreshToken) {
      await this.prisma.userSession.updateMany({
        where: { refreshToken },
        data: { isRevoked: true },
      });
    }
    return { success: true, message: 'Logged out successfully.' };
  }

  /**
   * Revokes all active user sessions (Security Incident / Password Reset)
   */
  async revokeAllSessions(userId: string) {
    await this.prisma.userSession.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
    return { success: true, message: 'All active sessions have been revoked.' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        org: true,
        _count: {
          select: {
            accounts: true,
            campaigns: true,
            proxies: true,
            groups: true,
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      org: user.org,
      stats: user._count,
      createdAt: user.createdAt,
    };
  }
}
