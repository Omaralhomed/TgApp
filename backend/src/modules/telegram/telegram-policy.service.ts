import { Injectable, Logger } from '@nestjs/common';

export interface AccountHealthMetrics {
  healthScore: number;
  tier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  maxDailyAllowed: number;
  remainingToday: number;
  isCooldown: boolean;
  cooldownRemainingSeconds: number;
  recommendations: string[];
}

@Injectable()
export class TelegramPolicyEngine {
  private readonly logger = new Logger(TelegramPolicyEngine.name);

  /**
   * Calculates dynamic delay with humanized jitter
   */
  calculateDelay(minSeconds: number = 15, maxSeconds: number = 45, accountAgeDays: number = 1): number {
    const min = Math.max(5, minSeconds);
    const max = Math.max(min, maxSeconds);
    
    // Younger accounts get higher safety buffer
    const safetyMultiplier = accountAgeDays <= 3 ? 1.4 : accountAgeDays <= 7 ? 1.2 : 1.0;
    const baseDelay = Math.floor(Math.random() * (max - min + 1)) + min;
    const jitter = Math.floor((Math.random() - 0.5) * 6); // +/- 3s jitter
    
    return Math.max(5, Math.floor((baseDelay + jitter) * safetyMultiplier));
  }

  /**
   * Evaluates maximum allowed daily messages according to warm-up schedule
   */
  getEffectiveDailyLimit(account: {
    dailyLimit: number;
    warmupMode?: boolean;
    warmupDays?: number;
    healthScore?: number;
  }): number {
    const baseConfigLimit = account.dailyLimit || 40;
    
    if (!account.warmupMode) {
      return baseConfigLimit;
    }

    const days = account.warmupDays || 1;
    let limit = 10;

    if (days >= 14) {
      limit = Math.min(baseConfigLimit, 50);
    } else if (days >= 7) {
      limit = Math.min(baseConfigLimit, 30);
    } else if (days >= 4) {
      limit = Math.min(baseConfigLimit, 20);
    } else if (days >= 2) {
      limit = Math.min(baseConfigLimit, 15);
    } else {
      limit = Math.min(baseConfigLimit, 8);
    }

    // Adjust limit if health score is degraded
    if (account.healthScore !== undefined && account.healthScore < 70) {
      limit = Math.floor(limit * 0.6);
    }

    return Math.max(1, limit);
  }

  /**
   * Computes comprehensive health score (0-100%) and tiering
   */
  evaluateAccountHealth(account: {
    status: string;
    floodWaitUntil?: Date | null;
    sentToday: number;
    totalSent: number;
    totalFailed: number;
    warmupDays: number;
    warmupMode: boolean;
    dailyLimit: number;
    proxyId?: string | null;
  }): AccountHealthMetrics {
    let score = 100;
    const recommendations: string[] = [];

    const now = new Date();
    const isCooldown = account.floodWaitUntil ? account.floodWaitUntil > now : false;
    const cooldownRemainingSeconds = isCooldown && account.floodWaitUntil
      ? Math.ceil((account.floodWaitUntil.getTime() - now.getTime()) / 1000)
      : 0;

    if (account.status === 'BANNED') {
      score = 0;
      recommendations.push('Account has been revoked or banned by Telegram.');
    } else if (isCooldown) {
      score -= 40;
      recommendations.push(`Account in Flood-Wait cooldown for ${cooldownRemainingSeconds}s.`);
    }

    // Failure ratio penalty
    const totalOps = account.totalSent + account.totalFailed;
    if (totalOps > 10) {
      const failRatio = account.totalFailed / totalOps;
      if (failRatio > 0.3) {
        score -= 30;
        recommendations.push('High failure rate detected. Verify proxies and audience validity.');
      } else if (failRatio > 0.15) {
        score -= 15;
      }
    }

    // Proxy check
    if (!account.proxyId) {
      score -= 10;
      recommendations.push('Assign a dedicated residential/datacenter SOCKS5 proxy to avoid IP flag.');
    }

    // Clamp score
    const healthScore = Math.max(0, Math.min(100, score));

    // Determine Tier
    let tier: 'TIER_1' | 'TIER_2' | 'TIER_3' = 'TIER_1';
    if (account.warmupDays >= 14 && healthScore >= 80) {
      tier = 'TIER_3';
    } else if (account.warmupDays >= 4 && healthScore >= 65) {
      tier = 'TIER_2';
    }

    const effectiveLimit = this.getEffectiveDailyLimit({
      dailyLimit: account.dailyLimit,
      warmupMode: account.warmupMode,
      warmupDays: account.warmupDays,
      healthScore,
    });

    const remainingToday = Math.max(0, effectiveLimit - account.sentToday);

    return {
      healthScore,
      tier,
      maxDailyAllowed: effectiveLimit,
      remainingToday,
      isCooldown,
      cooldownRemainingSeconds,
      recommendations,
    };
  }

  /**
   * Categorizes Telegram MTProto exceptions into standard errors
   */
  classifyTelegramError(error: any): {
    code: 'FLOOD_WAIT' | 'PEER_FLOOD' | 'PRIVACY_RESTRICTED' | 'DEACTIVATED' | 'SESSION_EXPIRED' | 'TARGET_INVALID' | 'GENERIC_ERROR';
    floodSeconds?: number;
    message: string;
  } {
    const raw = (error?.message || String(error || '')).toUpperCase();

    if (raw.includes('FLOOD_WAIT_') || raw.includes('FLOOD_PREVENTED')) {
      const match = raw.match(/FLOOD_WAIT_(\d+)/);
      const seconds = match ? parseInt(match[1], 10) : 60;
      return {
        code: 'FLOOD_WAIT',
        floodSeconds: seconds,
        message: `Telegram rate limit: Cooldown required for ${seconds} seconds.`,
      };
    }

    if (raw.includes('PEER_FLOOD')) {
      return {
        code: 'PEER_FLOOD',
        message: 'Telegram SpamBot flag (PEER_FLOOD). Account temporarily restricted from messaging non-contacts.',
      };
    }

    if (raw.includes('USER_PRIVACY_RESTRICTED')) {
      return {
        code: 'PRIVACY_RESTRICTED',
        message: 'User privacy settings do not allow direct messages/invitations from non-contacts.',
      };
    }

    if (raw.includes('USER_DEACTIVATED') || raw.includes('USER_IS_BOT') || raw.includes('USER_BANNED_IN_CHANNEL')) {
      return {
        code: 'DEACTIVATED',
        message: 'Target user account is deactivated, banned, or is a bot.',
      };
    }

    if (raw.includes('AUTH_KEY_UNREGISTERED') || raw.includes('SESSION_REVOKED') || raw.includes('SESSION_PASSWORD_NEEDED')) {
      return {
        code: 'SESSION_EXPIRED',
        message: 'Telegram session has been terminated or requires re-authentication.',
      };
    }

    if (raw.includes('USERNAME_NOT_OCCUPIED') || raw.includes('USERNAME_INVALID') || raw.includes('ACCESS_HASH_INVALID')) {
      return {
        code: 'TARGET_INVALID',
        message: 'Invalid target username or missing MTProto access hash.',
      };
    }

    return {
      code: 'GENERIC_ERROR',
      message: error?.message || 'Unknown Telegram MTProto operation error.',
    };
  }

  /**
   * Zero-Width Hash Obfuscator: Injects invisible Unicode zero-width characters (U+200B, U+200C, U+200D)
   * into text to alter MD5/SHA256 text fingerprint and bypass Telegram SpamWatch clustering,
   * while keeping human visual text 100% indistinguishable.
   */
  obfuscateTextHash(text: string): string {
    if (!text || text.length === 0) return text;
    const zeroWidthChars = ['\u200B', '\u200C', '\u200D'];

    return text
      .split(' ')
      .map((word) => {
        if (word.length >= 3 && Math.random() > 0.25) {
          const insertIdx = Math.floor(Math.random() * (word.length - 1)) + 1;
          const chosenChar = zeroWidthChars[Math.floor(Math.random() * zeroWidthChars.length)];
          return word.slice(0, insertIdx) + chosenChar + word.slice(insertIdx);
        }
        return word;
      })
      .join(' ');
  }
}
