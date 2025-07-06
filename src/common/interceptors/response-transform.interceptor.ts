import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Response Transform Interceptor
 * 
 * Standardizes API responses for consistent frontend integration
 * All successful responses will have the format:
 * {
 *   success: true,
 *   data: <response data>,
 *   meta?: <optional metadata>
 * }
 * 
 * Error responses are handled by exception filters
 */
@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
    private readonly logger = new Logger(ResponseTransformInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            map(data => {
                const request = context.switchToHttp().getRequest();
                const response = context.switchToHttp().getResponse();

                // Skip transformation for FHIR resources that already have a specific format
                const url = request.url;
                if (url && url.includes('/fhir/') && !url.includes('/fhir/metadata')) {
                    return data;
                }

                // Skip transformation if response is already in our standard format
                if (data && (data.success !== undefined)) {
                    return data;
                }

                // Skip transformation for file downloads
                const contentType = response.getHeader('content-type');
                if (contentType &&
                    (contentType.includes('application/octet-stream') ||
                        contentType.includes('application/pdf') ||
                        contentType.includes('image/'))) {
                    return data;
                }

                // Skip transformation for empty responses
                if (data === undefined || data === null) {
                    return { success: true };
                }

                // Transform the response
                const transformed: {
                    success: boolean;
                    data: any;
                    meta?: {
                        pagination?: {
                            page: number;
                            limit: number;
                            totalItems: number;
                            totalPages: number;
                        }
                    }
                } = {
                    success: true,
                    data
                };

                // Add pagination metadata if available
                if (data.page !== undefined || data.totalPages !== undefined || data.totalItems !== undefined) {
                    transformed.meta = {
                        pagination: {
                            page: data.page || 1,
                            limit: data.limit || 10,
                            totalItems: data.totalItems || 0,
                            totalPages: data.totalPages || 1
                        }
                    };

                    // Remove pagination fields from data
                    if (transformed.data) {
                        delete transformed.data.page;
                        delete transformed.data.limit;
                        delete transformed.data.totalItems;
                        delete transformed.data.totalPages;
                    }
                }

                return transformed;
            })
        );
    }
} 