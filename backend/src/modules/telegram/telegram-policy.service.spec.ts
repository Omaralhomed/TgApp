import { TelegramPolicyEngine } from './telegram-policy.service';

describe('TelegramPolicyEngine', () => {
  let policyEngine: TelegramPolicyEngine;

  beforeEach(() => {
    policyEngine = new TelegramPolicyEngine();
  });

  describe('Delay and Jitter Calculation', () => {
    it('should generate delays within range with safety buffer', () => {
      const min = 15;
      const max = 30;
      const delay = policyEngine.calculateDelay(min, max, 14);

      expect(delay).toBeGreaterThanOrEqual(10);
      expect(delay).toBeLessThanOrEqual(40);
    });

    it('should apply higher multiplier for younger accounts (warmup)', () => {
      // 1-day old account should get ~1.4x buffer
      const delaysYoung: number[] = [];
      const delaysMature: number[] = [];

      for (let i = 0; i < 20; i++) {
        delaysYoung.push(policyEngine.calculateDelay(20, 20, 1));
        delaysMature.push(policyEngine.calculateDelay(20, 20, 30));
      }

      const avgYoung = delaysYoung.reduce((a, b) => a + b, 0) / delaysYoung.length;
      const avgMature = delaysMature.reduce((a, b) => a + b, 0) / delaysMature.length;

      expect(avgYoung).toBeGreaterThan(avgMature);
    });
  });

  describe('Effective Daily Limits', () => {
    it('should scale limits during warm-up phase', () => {
      const day1 = policyEngine.getEffectiveDailyLimit({ dailyLimit: 50, warmupMode: true, warmupDays: 1 });
      const day5 = policyEngine.getEffectiveDailyLimit({ dailyLimit: 50, warmupMode: true, warmupDays: 5 });
      const day15 = policyEngine.getEffectiveDailyLimit({ dailyLimit: 50, warmupMode: true, warmupDays: 15 });

      expect(day1).toBeLessThanOrEqual(10);
      expect(day5).toBe(20);
      expect(day15).toBe(50);
    });

    it('should return base limit if warm-up is disabled', () => {
      const limit = policyEngine.getEffectiveDailyLimit({ dailyLimit: 60, warmupMode: false });
      expect(limit).toBe(60);
    });
  });

  describe('Health Score & Tiering Evaluation', () => {
    it('should give 100% score and TIER_3 (Mature High Capacity) for perfect mature account', () => {
      const metrics = policyEngine.evaluateAccountHealth({
        status: 'READY',
        sentToday: 5,
        totalSent: 100,
        totalFailed: 1,
        warmupDays: 14,
        warmupMode: false,
        dailyLimit: 40,
        proxyId: 'proxy-123',
      });

      expect(metrics.healthScore).toBeGreaterThanOrEqual(90);
      expect(metrics.tier).toBe('TIER_3');
      expect(metrics.isCooldown).toBe(false);
    });

    it('should give 0 score for BANNED account', () => {
      const metrics = policyEngine.evaluateAccountHealth({
        status: 'BANNED',
        sentToday: 0,
        totalSent: 10,
        totalFailed: 5,
        warmupDays: 1,
        warmupMode: true,
        dailyLimit: 20,
      });

      expect(metrics.healthScore).toBe(0);
      expect(metrics.tier).toBe('TIER_1');
    });

    it('should detect Flood Wait cooldown correctly', () => {
      const futureDate = new Date(Date.now() + 60000); // 60s in future
      const metrics = policyEngine.evaluateAccountHealth({
        status: 'FLOOD_WAIT',
        floodWaitUntil: futureDate,
        sentToday: 10,
        totalSent: 20,
        totalFailed: 2,
        warmupDays: 5,
        warmupMode: true,
        dailyLimit: 20,
      });

      expect(metrics.isCooldown).toBe(true);
      expect(metrics.cooldownRemainingSeconds).toBeGreaterThan(0);
      expect(metrics.healthScore).toBeLessThan(70);
    });
  });

  describe('Telegram Error Classification', () => {
    it('should classify FLOOD_WAIT errors and extract duration', () => {
      const res = policyEngine.classifyTelegramError(new Error('FLOOD_WAIT_300'));
      expect(res.code).toBe('FLOOD_WAIT');
      expect(res.floodSeconds).toBe(300);
    });

    it('should classify PEER_FLOOD as rate-limit ban', () => {
      const res = policyEngine.classifyTelegramError(new Error('PEER_FLOOD: Too many requests'));
      expect(res.code).toBe('PEER_FLOOD');
    });

    it('should classify PRIVACY_RESTRICTED correctly', () => {
      const res = policyEngine.classifyTelegramError(new Error('USER_PRIVACY_RESTRICTED'));
      expect(res.code).toBe('PRIVACY_RESTRICTED');
    });
  });
});
