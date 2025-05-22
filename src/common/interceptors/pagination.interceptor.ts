import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PaginationDto, PaginatedResponse } from '../pagination/pagination.dto';

@Injectable()
export class PaginationInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();

        // Extract pagination parameters from query string
        const page = parseInt(request.query.page) || 0;
        const size = parseInt(request.query.size) || 10;
        const pagination = new PaginationDto();
        pagination.page = page;
        pagination.size = size;

        return next.handle().pipe(
            map(data => {
                // Check if this is a FHIR Bundle response
                if (data && data.resourceType === 'Bundle') {
                    const total = data.total || 0;
                    const entries = data.entry || [];
                    const items = entries.map(entry => entry.resource);

                    return PaginationDto.toResponse(items, total, pagination);
                }

                // If it's not a Bundle, return the data as is
                return data;
            }),
        );
    }
} 