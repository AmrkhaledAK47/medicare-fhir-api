import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UrlRewriteInterceptor implements NestInterceptor {
    private readonly logger = new Logger(UrlRewriteInterceptor.name);
    private readonly externalApiUrl: string;
    private readonly internalFhirUrl: string;

    constructor(private readonly configService: ConfigService) {
        this.externalApiUrl = this.configService.get<string>('app.externalUrl') || 'http://localhost:3000/api';
        this.internalFhirUrl = this.configService.get<string>('FHIR_SERVER_URL') || 'http://hapi-fhir:8080/fhir';
        this.logger.log(`URL Rewrite Interceptor initialized with external URL: ${this.externalApiUrl}`);
        this.logger.log(`Internal FHIR URL: ${this.internalFhirUrl}`);
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            map(data => {
                if (!data) {
                    return data;
                }

                // Only process FHIR Bundle responses
                if (data.resourceType === 'Bundle') {
                    this.logger.log('Processing FHIR Bundle response for URL rewriting');

                    // Rewrite links
                    if (data.link && Array.isArray(data.link)) {
                        this.logger.log(`Found ${data.link.length} links to rewrite`);

                        data.link.forEach((link: any) => {
                            if (link && link.url) {
                                const originalUrl = link.url;

                                // Replace internal FHIR URL with external API URL
                                if (originalUrl.includes(this.internalFhirUrl)) {
                                    link.url = originalUrl.replace(this.internalFhirUrl, `${this.externalApiUrl}/fhir`);
                                    this.logger.log(`Rewritten link URL: ${originalUrl} -> ${link.url}`);
                                }
                            }
                        });
                    }

                    // Rewrite fullUrl in entries
                    if (data.entry && Array.isArray(data.entry)) {
                        this.logger.log(`Found ${data.entry.length} entries to rewrite`);

                        data.entry.forEach((entry: any) => {
                            if (entry && entry.fullUrl) {
                                const originalUrl = entry.fullUrl;

                                // Replace internal FHIR URL with external API URL
                                if (originalUrl.includes(this.internalFhirUrl)) {
                                    entry.fullUrl = originalUrl.replace(this.internalFhirUrl, `${this.externalApiUrl}/fhir`);
                                    this.logger.log(`Rewritten entry fullUrl: ${originalUrl} -> ${entry.fullUrl}`);
                                }
                            }
                        });
                    }
                }

                return data;
            }),
        );
    }
} 