import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CryptoService } from '../crypto/crypto.service';

@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  constructor(private readonly cryptoService: CryptoService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => this.cryptoService.sanitizeData(data)),
    );
  }
}
