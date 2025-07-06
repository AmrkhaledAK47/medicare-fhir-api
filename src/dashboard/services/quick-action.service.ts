import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QuickActionDto } from '../dto/dashboard.dto';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class QuickActionService {
    private readonly logger = new Logger(QuickActionService.name);
    private readonly baseApiUrl: string;

    constructor(
        private readonly configService: ConfigService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {
        this.baseApiUrl = this.configService.get<string>('APP_EXTERNAL_URL', 'http://localhost:3000/api');
    }

    async getQuickActions(patientFhirId: string): Promise<QuickActionDto[]> {
        this.logger.log(`Fetching quick actions for patient ${patientFhirId}`);

        const cacheKey = `quickActions:${patientFhirId}`;

        // Try to get from cache first
        const cachedActions = await this.cacheManager.get<QuickActionDto[]>(cacheKey);
        if (cachedActions) {
            this.logger.debug('Returning quick actions from cache');
            return cachedActions;
        }

        // In a real application, these might be dynamically generated based on patient data
        // For now, we'll return a static set of quick actions
        const quickActions: QuickActionDto[] = [
            {
                id: 'request-consultation',
                title: 'Request Consultation',
                description: 'Talk to a specialist',
                url: `${this.baseApiUrl}/consultations/request`,
                type: 'consultation',
                icon: 'consultation',
            },
            {
                id: 'locate-hospital',
                title: 'Locate a Hospital',
                description: 'Find closest hospitals',
                url: `${this.baseApiUrl}/locations/hospitals`,
                type: 'location',
                icon: 'hospital',
            },
            {
                id: 'emergency',
                title: 'Emergency',
                description: 'Request immediate help',
                url: `${this.baseApiUrl}/emergency`,
                type: 'emergency',
                icon: 'emergency',
            },
        ];

        // Cache the results
        await this.cacheManager.set(cacheKey, quickActions, 3600 * 1000); // 1 hour TTL

        return quickActions;
    }
} 