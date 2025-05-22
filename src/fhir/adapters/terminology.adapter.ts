import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HapiFhirAdapter } from './hapi-fhir.adapter';

/**
 * Adapter for FHIR terminology operations
 * Handles code system validation, value set expansion, and concept mapping
 */
@Injectable()
export class TerminologyAdapter {
    private readonly logger = new Logger(TerminologyAdapter.name);

    constructor(
        private readonly hapiFhirAdapter: HapiFhirAdapter,
        private readonly configService: ConfigService,
    ) {
        this.logger.log('Terminology Adapter initialized');
    }

    /**
     * Validate if a code is valid within a code system
     */
    async validateCode(
        system: string,
        code: string,
        display?: string,
    ): Promise<{ valid: boolean; display?: string; message?: string }> {
        this.logger.debug(`Validating code ${code} in system ${system}`);

        try {
            const params = {
                system,
                code,
            };

            if (display) {
                params['display'] = display;
            }

            const response = await this.hapiFhirAdapter.operation(
                'CodeSystem',
                'validate-code',
                null,
                params,
            );

            return {
                valid: response.parameter.find(p => p.name === 'result')?.valueBoolean || false,
                display: response.parameter.find(p => p.name === 'display')?.valueString,
                message: response.parameter.find(p => p.name === 'message')?.valueString,
            };
        } catch (error) {
            this.logger.error(`Error validating code: ${error.message}`, error.stack);
            return { valid: false, message: error.message };
        }
    }

    /**
     * Expand a value set
     */
    async expandValueSet(
        valueSetUrl: string,
        filter?: string,
        offset?: number,
        count?: number,
    ): Promise<any> {
        this.logger.debug(`Expanding value set ${valueSetUrl}`);

        try {
            const params: Record<string, any> = {
                url: valueSetUrl,
            };

            if (filter) {
                params.filter = filter;
            }

            if (offset !== undefined) {
                params.offset = offset;
            }

            if (count !== undefined) {
                params.count = count;
            }

            return await this.hapiFhirAdapter.operation(
                'ValueSet',
                'expand',
                null,
                params,
            );
        } catch (error) {
            this.logger.error(`Error expanding value set: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Translate a code from one system to another
     */
    async translateCode(
        sourceSystem: string,
        sourceCode: string,
        targetSystem: string,
    ): Promise<{ success: boolean; target?: { system: string; code: string; display?: string }; message?: string }> {
        this.logger.debug(`Translating code ${sourceCode} from ${sourceSystem} to ${targetSystem}`);

        try {
            const params = {
                source: `${sourceSystem}|${sourceCode}`,
                target: targetSystem,
            };

            const response = await this.hapiFhirAdapter.operation(
                'ConceptMap',
                'translate',
                null,
                params,
            );

            const result = response.parameter.find(p => p.name === 'result')?.valueBoolean || false;

            if (!result) {
                return { success: false, message: 'No translation found' };
            }

            const matchParam = response.parameter.find(p => p.name === 'match');

            if (!matchParam || !matchParam.part || !matchParam.part.length) {
                return { success: false, message: 'Invalid translation response format' };
            }

            const targetParts = matchParam.part.filter(p => p.name === 'concept');

            if (!targetParts.length) {
                return { success: false, message: 'No target concept found' };
            }

            const targetConcept = targetParts[0];

            return {
                success: true,
                target: {
                    system: targetConcept.system,
                    code: targetConcept.code,
                    display: targetConcept.display,
                },
            };
        } catch (error) {
            this.logger.error(`Error translating code: ${error.message}`, error.stack);
            return { success: false, message: error.message };
        }
    }

    /**
     * Lookup details for a specific code
     */
    async lookupCode(
        system: string,
        code: string,
    ): Promise<any> {
        this.logger.debug(`Looking up code ${code} in system ${system}`);

        try {
            const params = {
                system,
                code,
            };

            return await this.hapiFhirAdapter.operation(
                'CodeSystem',
                'lookup',
                null,
                params,
            );
        } catch (error) {
            this.logger.error(`Error looking up code: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Find concepts matching a certain criteria
     */
    async findConcepts(
        system: string,
        searchText: string,
        property?: string[],
    ): Promise<any> {
        this.logger.debug(`Finding concepts in ${system} matching "${searchText}"`);

        try {
            const params: Record<string, any> = {
                system,
                'property-value': searchText,
            };

            if (property && property.length) {
                params.property = property;
            }

            return await this.hapiFhirAdapter.operation(
                'CodeSystem',
                'find-matches',
                null,
                params,
            );
        } catch (error) {
            this.logger.error(`Error finding concepts: ${error.message}`, error.stack);
            throw error;
        }
    }
} 