import { Injectable, Logger } from '@nestjs/common';
import { FhirService } from '../../fhir/fhir.service';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class ChronicDiseaseService {
    private readonly logger = new Logger(ChronicDiseaseService.name);

    constructor(
        private readonly fhirService: FhirService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    /**
     * Get chronic diseases for a patient
     * @param patientFhirId Patient FHIR resource ID
     * @returns Array of chronic diseases categorized by type
     */
    async getChronicDiseases(patientFhirId: string): Promise<any> {
        this.logger.log(`Fetching chronic diseases for patient ${patientFhirId}`);

        const cacheKey = `chronicDiseases:${patientFhirId}`;

        // Try to get from cache first
        const cachedDiseases = await this.cacheManager.get<any>(cacheKey);
        if (cachedDiseases) {
            this.logger.debug('Returning chronic diseases from cache');
            return cachedDiseases;
        }

        try {
            // Fetch active conditions from FHIR server
            const conditions = await this.fhirService.searchResources('Condition', {
                'subject': `Patient/${patientFhirId}`,
                'clinical-status': 'active',
                '_sort': '-recorded-date',
                '_count': '100'
            });

            // Process and categorize the conditions
            const diseases = this.processDiseases(conditions);

            // Cache the results
            await this.cacheManager.set(cacheKey, diseases, 60 * 1000); // 60 seconds TTL

            return diseases;
        } catch (error) {
            this.logger.error(`Failed to fetch chronic diseases for patient ${patientFhirId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Process and categorize diseases from FHIR Condition resources
     */
    private processDiseases(conditions: any): any {
        if (!conditions || !conditions.entry || conditions.entry.length === 0) {
            return {
                speech: [],
                physical: []
            };
        }

        const speech: string[] = [];
        const physical: string[] = [];

        // Process each condition entry
        conditions.entry.forEach(entry => {
            if (!entry.resource) return;

            const condition = entry.resource;
            const category = this.getDiseaseCategory(condition);
            const diseaseName = this.getDiseaseName(condition);

            if (!diseaseName) return;

            if (category === 'speech') {
                speech.push(diseaseName);
            } else {
                physical.push(diseaseName);
            }
        });

        return {
            speech,
            physical
        };
    }

    /**
     * Determine disease category (speech or physical)
     */
    private getDiseaseCategory(condition: any): 'speech' | 'physical' {
        // Check if condition has category information
        if (condition.category && Array.isArray(condition.category)) {
            for (const category of condition.category) {
                if (category.coding && Array.isArray(category.coding)) {
                    for (const coding of category.coding) {
                        // Check for speech-related conditions based on common codes
                        if (
                            coding.system === 'http://terminology.hl7.org/CodeSystem/condition-category' &&
                            (coding.code === 'problem-list-item' || coding.code === 'encounter-diagnosis')
                        ) {
                            // Check if the condition code or display indicates a speech condition
                            if (
                                condition.code?.coding?.some((c: any) =>
                                    c.display?.toLowerCase().includes('speech') ||
                                    c.display?.toLowerCase().includes('language') ||
                                    c.display?.toLowerCase().includes('communication')
                                )
                            ) {
                                return 'speech';
                            }
                        }
                    }
                }
            }
        }

        // Default to physical for all other conditions
        return 'physical';
    }

    /**
     * Extract disease name from condition resource
     */
    private getDiseaseName(condition: any): string | null {
        // Try to get the display name from the coding
        if (condition.code?.coding && Array.isArray(condition.code.coding)) {
            for (const coding of condition.code.coding) {
                if (coding.display) {
                    return coding.display;
                }
            }
        }

        // Fall back to the text representation
        if (condition.code?.text) {
            return condition.code.text;
        }

        return null;
    }
} 