import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class IpWhitelistGuard implements CanActivate {
    private readonly logger = new Logger(IpWhitelistGuard.name);
    private readonly whitelistedIps: string[];

    constructor(private readonly configService: ConfigService) {
        // Get whitelisted IPs from config, default to localhost
        const whitelistString = this.configService.get<string>('METRICS_IP_WHITELIST', '127.0.0.1,::1');
        this.whitelistedIps = whitelistString.split(',').map(ip => ip.trim());
        this.logger.log(`IP whitelist initialized with: ${this.whitelistedIps.join(', ')}`);
    }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        const ip = this.getClientIp(request);

        // Check if the IP is in the whitelist
        const isAllowed = this.whitelistedIps.includes(ip);

        if (!isAllowed) {
            this.logger.warn(`Access denied to ${ip} (not in whitelist)`);
        }

        return isAllowed;
    }

    private getClientIp(request: Request): string {
        // Get IP from X-Forwarded-For header if behind proxy
        const xForwardedFor = request.headers['x-forwarded-for'] as string;
        if (xForwardedFor) {
            const ips = xForwardedFor.split(',');
            return ips[0].trim();
        }

        // Otherwise get from request
        return request.ip || '127.0.0.1';
    }
} 