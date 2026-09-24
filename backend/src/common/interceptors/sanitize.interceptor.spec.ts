import { SanitizeInterceptor } from './sanitize.interceptor';
import { CryptoService } from '../crypto/crypto.service';
import { of, firstValueFrom } from 'rxjs';
import { ExecutionContext, CallHandler } from '@nestjs/common';

describe('SanitizeInterceptor', () => {
  let interceptor: SanitizeInterceptor;
  let cryptoService: CryptoService;

  beforeEach(() => {
    cryptoService = new CryptoService();
    interceptor = new SanitizeInterceptor(cryptoService);
  });

  it('should strip sensitive keys like sessionString and passwordHash', async () => {
    const mockData = {
      id: 'acc_123',
      phone: '+1234567890',
      sessionString: '1B0AAAEAAAAcAAAA...very-secret-session...',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=1$...',
      apiHash: '0123456789abcdef0123456789abcdef',
      refreshToken: 'secret-refresh-token',
      safeField: 'normalValue',
    };

    const mockCallHandler: CallHandler = {
      handle: () => of(mockData),
    };

    const mockExecutionContext = {} as ExecutionContext;

    const result = await firstValueFrom(interceptor.intercept(mockExecutionContext, mockCallHandler));

    expect(result.id).toBe('acc_123');
    expect(result.phone).toBe('+1234567890');
    expect(result.safeField).toBe('normalValue');

    // Verify all sensitive properties are completely stripped
    expect(result.sessionString).toBeUndefined();
    expect(result.passwordHash).toBeUndefined();
    expect(result.apiHash).toBeUndefined();
    expect(result.refreshToken).toBeUndefined();
  });
});
