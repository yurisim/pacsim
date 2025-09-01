import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('API');

  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const url = req.url;
    const body = req.body;
    const requestId = this.cls.getId();
    
    this.logger.log(`[${requestId}] ${method} ${url} - Body: ${JSON.stringify(body)}`);
    
    return next.handle().pipe(
      tap({
        next: (response) => {
          this.logger.log(`[${requestId}] ${method} ${url} - Success`);
        },
        error: (error) => {
          this.logger.error(`[${requestId}] ${method} ${url} - Error: ${error.message}`, error.stack);
        }
      })
    );
  }
}