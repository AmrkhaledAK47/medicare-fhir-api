import { Injectable, Logger, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError, AxiosRequestConfig } from 'axios';

@Injectable()
export class HapiFhirAdapter {
    private readonly baseUrl: string;
    private readonly logger = new Logger(HapiFhirAdapter.name);
    private readonly maxRetries: number;
    private readonly retryDelay: number;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.baseUrl = this.configService.get<string>('fhir.hapiFhirUrl') || 'http://hapi-fhir:8080/fhir';
        this.maxRetries = this.configService.get<number>('fhir.maxRetries') || 3;
        this.retryDelay = this.configService.get<number>('fhir.retryDelay') || 1000;
        this.logger.log(`HAPI FHIR Adapter initialized with server URL: ${this.baseUrl}`);
    }

    /**
     * Create a new FHIR resource
     */
    async create(resourceType: string, resource: any): Promise<any> {
        return this.executeWithRetry(
            async () => {
                const response = await firstValueFrom(
                    this.httpService.post(
                        `${this.baseUrl}/${resourceType}`,
                        resource,
                        this.getRequestConfig(),
                    ),
                );
                return response.data;
            },
            `create ${resourceType}`,
        );
    }

    /**
     * Get a FHIR resource by ID
     */
    async getById(resourceType: string, id: string): Promise<any> {
        return this.executeWithRetry(
            async () => {
                const response = await firstValueFrom(
                    this.httpService.get(
                        `${this.baseUrl}/${resourceType}/${id}`,
                        this.getRequestConfig(),
                    ),
                );
                return response.data;
            },
            `get ${resourceType}/${id}`,
        );
    }

    /**
     * Update a FHIR resource
     */
    async update(resourceType: string, id: string, resource: any): Promise<any> {
        return this.executeWithRetry(
            async () => {
                const response = await firstValueFrom(
                    this.httpService.put(
                        `${this.baseUrl}/${resourceType}/${id}`,
                        resource,
                        this.getRequestConfig(),
                    ),
                );
                return response.data;
            },
            `update ${resourceType}/${id}`,
        );
    }

    /**
     * Delete a FHIR resource
     */
    async delete(resourceType: string, id: string): Promise<void> {
        await this.executeWithRetry(
            async () => {
                await firstValueFrom(
                    this.httpService.delete(
                        `${this.baseUrl}/${resourceType}/${id}`,
                        this.getRequestConfig(),
                    ),
                );
            },
            `delete ${resourceType}/${id}`,
        );
    }

    /**
     * Execute a FHIR operation
     * @param resourceType The resource type (e.g., 'Patient', 'Observation')
     * @param operation The operation name (e.g., 'validate', 'translate')
     * @param id Optional resource ID if the operation is instance-specific
     * @param params Parameters for the operation
     * @returns The operation result
     */
    async operation(
        resourceType: string,
        operation: string,
        id?: string | null,
        params?: Record<string, any>,
    ): Promise<any> {
        return this.executeWithRetry(
            async () => {
                // Construct the operation URL
                let url = `${this.baseUrl}/${resourceType}`;

                // Add ID if provided (for instance-level operations)
                if (id) {
                    url += `/${id}`;
                }

                // Add operation name
                url += `/$${operation}`;

                // Add query parameters if provided
                if (params) {
                    const queryParams = new URLSearchParams();

                    Object.entries(params).forEach(([key, value]) => {
                        if (value !== undefined && value !== null && value !== '') {
                            if (Array.isArray(value)) {
                                value.forEach(v => {
                                    if (v !== undefined && v !== null && v !== '') {
                                        queryParams.append(key, v.toString());
                                    }
                                });
                            } else {
                                queryParams.append(key, value.toString());
                            }
                        }
                    });

                    const queryString = queryParams.toString();
                    if (queryString) {
                        url += `?${queryString}`;
                    }
                }

                this.logger.debug(`Executing operation: ${url}`);

                const response = await firstValueFrom(
                    this.httpService.get(url, this.getRequestConfig()),
                );

                return response.data;
            },
            `operation ${resourceType}/$${operation}${id ? '/' + id : ''}`,
        );
    }

    /**
     * Validate a FHIR resource
     * @param resourceType The resource type (e.g., 'Patient', 'Observation')
     * @param resource The resource to validate
     * @param profile Optional profile to validate against
     * @returns The validation result
     */
    async validate(
        resourceType: string,
        resource: any,
        profile?: string,
    ): Promise<any> {
        return this.executeWithRetry(
            async () => {
                // Construct the validation URL
                const url = `${this.baseUrl}/${resourceType}/$validate`;

                this.logger.debug(`Validating resource against ${url}`);

                // Prepare the request body
                const requestBody: any = { ...resource };

                // Add profile if provided
                if (profile) {
                    requestBody.meta = requestBody.meta || {};
                    requestBody.meta.profile = [profile];
                }

                const response = await firstValueFrom(
                    this.httpService.post(
                        url,
                        requestBody,
                        this.getRequestConfig(),
                    ),
                );

                return response.data;
            },
            `validate ${resourceType}`,
        );
    }

    /**
     * Get the history of a FHIR resource
     * @param resourceType The resource type (e.g., 'Patient', 'Observation')
     * @param id Optional resource ID for instance history (if not provided, returns type history)
     * @param params Optional query parameters (e.g., _count, _since)
     * @returns The history bundle
     */
    async history(
        resourceType: string,
        id?: string,
        params: Record<string, any> = {},
    ): Promise<any> {
        return this.executeWithRetry(
            async () => {
                // Construct the history URL
                let url = `${this.baseUrl}/${resourceType}`;

                // Add ID if provided (for instance history)
                if (id) {
                    url += `/${id}`;
                }

                // Add _history endpoint
                url += '/_history';

                // Process URL parameters
                const queryParams = new URLSearchParams();

                // Add all parameters to the query string
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== undefined && value !== null && value !== '') {
                        if (Array.isArray(value)) {
                            value.forEach((v) => {
                                if (v !== undefined && v !== null && v !== '') {
                                    queryParams.append(key, v.toString());
                                }
                            });
                        } else {
                            queryParams.append(key, value.toString());
                        }
                    }
                });

                // Add query parameters if any
                const queryString = queryParams.toString();
                if (queryString) {
                    url += `?${queryString}`;
                }

                this.logger.debug(`Fetching history from: ${url}`);

                const response = await firstValueFrom(
                    this.httpService.get(
                        url,
                        this.getRequestConfig(),
                    ),
                );

                return response.data;
            },
            `history ${resourceType}${id ? '/' + id : ''}`,
        );
    }

    /**
     * Search for FHIR resources
     */
    async search(resourceType: string, params: Record<string, any> = {}): Promise<any> {
        // Log the search parameters for debugging
        this.logger.debug(`Searching ${resourceType} with params:`, params);

        // Transform search parameters to FHIR-compliant format
        const transformedParams = this.transformSearchParameters(resourceType, params);

        // Process URL parameters to ensure they are properly formatted
        const queryParams = new URLSearchParams();

        // Add all transformed parameters to the query string
        Object.entries(transformedParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                // Handle arrays by adding multiple parameters with the same name
                if (Array.isArray(value)) {
                    value.forEach((v) => {
                        if (v !== undefined && v !== null && v !== '') {
                            queryParams.append(key, v.toString());
                        }
                    });
                } else {
                    queryParams.append(key, value.toString());
                }
            }
        });

        // Create the search URL with all parameters
        const queryString = queryParams.toString();
        const url = `${this.baseUrl}/${resourceType}${queryString ? '?' + queryString : ''}`;

        this.logger.debug(`Final search URL: ${url}`);

        return this.executeWithRetry(
            async () => {
                const response = await firstValueFrom(
                    this.httpService.get(
                        url,
                        this.getRequestConfig(),
                    ),
                );

                // Rewrite URLs in the response for frontend consumption
                const responseData = response.data;

                // Get the external API URL from config or default to localhost:3000
                const externalApiUrl = this.configService.get<string>('app.externalUrl') || 'http://localhost:3000/api';

                // Debug logging for configuration
                this.logger.log(`Base URL: ${this.baseUrl}`);
                this.logger.log(`External API URL: ${externalApiUrl}`);
                this.logger.log(`Response data has link array: ${!!(responseData && responseData.link && Array.isArray(responseData.link))}`);

                if (responseData && responseData.link && Array.isArray(responseData.link)) {
                    this.logger.log(`Number of links: ${responseData.link.length}`);
                }

                // Store original request parameters for pagination links
                const originalParams = { ...params };

                // Fix pagination links
                if (responseData && responseData.link && Array.isArray(responseData.link)) {
                    for (let i = 0; i < responseData.link.length; i++) {
                        const link = responseData.link[i];

                        if (link && link.url) {
                            this.logger.log(`Original link URL (${link.relation}): ${link.url}`);

                            try {
                                const originalUrl = new URL(link.url);
                                const newUrl = new URL(`${externalApiUrl}/fhir/${resourceType}`);

                                this.logger.log(`Creating new URL from: ${externalApiUrl}/fhir/${resourceType}`);

                                if (link.relation === 'self') {
                                    // For self links, use original params
                                    for (const [key, value] of Object.entries(originalParams)) {
                                        if (value !== undefined && value !== null) {
                                            newUrl.searchParams.append(key, String(value));
                                            this.logger.log(`Added parameter to self link: ${key}=${value}`);
                                        }
                                    }
                                } else {
                                    // For pagination links

                                    // Extract all params from the original URL
                                    originalUrl.searchParams.forEach((value, key) => {
                                        this.logger.log(`Processing parameter from original URL: ${key}=${value}`);

                                        // Handle special pagination parameters
                                        if (key === '_getpagesoffset' && originalUrl.searchParams.has('_count')) {
                                            const offset = parseInt(value);
                                            const count = parseInt(originalUrl.searchParams.get('_count'));

                                            if (!isNaN(offset) && !isNaN(count) && count > 0) {
                                                // Calculate page number from offset and count
                                                const page = Math.floor(offset / count) + 1;
                                                newUrl.searchParams.append('page', String(page));
                                                this.logger.log(`Converted _getpagesoffset=${offset} to page=${page}`);
                                            }
                                        }
                                        else if (key === '_count') {
                                            // Preserve count parameter
                                            newUrl.searchParams.append('_count', value);
                                            this.logger.log(`Preserved _count=${value}`);
                                        }
                                        else if (!key.startsWith('_getpages')) {
                                            // Copy any other parameters that aren't internal pagination ones
                                            newUrl.searchParams.append(key, value);
                                            this.logger.log(`Copied parameter: ${key}=${value}`);
                                        }
                                    });

                                    // Add any other original params that weren't in the pagination URL
                                    for (const [key, value] of Object.entries(originalParams)) {
                                        // Skip pagination params as they're handled above
                                        if (key !== '_count' && key !== 'page' && value !== undefined && value !== null) {
                                            // Only add if not already present
                                            if (!newUrl.searchParams.has(key)) {
                                                newUrl.searchParams.append(key, String(value));
                                                this.logger.log(`Added original parameter: ${key}=${value}`);
                                            }
                                        }
                                    }
                                }

                                link.url = newUrl.toString();
                                this.logger.log(`Rewritten link URL (${link.relation}): ${link.url}`);
                            } catch (e) {
                                this.logger.error(`Error rewriting URL: ${e.message}`, e);
                                this.logger.error(`Error stack: ${e.stack}`);

                                // Force URL rewriting even if there's an error
                                if (link.relation === 'self') {
                                    link.url = `${externalApiUrl}/fhir/${resourceType}`;
                                    if (Object.keys(originalParams).length > 0) {
                                        const forcedParams = new URLSearchParams();
                                        for (const [key, value] of Object.entries(originalParams)) {
                                            if (value !== undefined && value !== null) {
                                                forcedParams.append(key, String(value));
                                            }
                                        }
                                        link.url += `?${forcedParams.toString()}`;
                                    }
                                } else if (link.relation === 'next' && responseData.link.length > 1) {
                                    // For next link, increment page number
                                    const page = originalParams.page ? parseInt(originalParams.page) + 1 : 2;
                                    const count = originalParams._count || '10';
                                    link.url = `${externalApiUrl}/fhir/${resourceType}?_count=${count}&page=${page}`;
                                }

                                this.logger.log(`Forced rewritten URL (${link.relation}): ${link.url}`);
                            }
                        }
                    }
                }

                // Also fix fullUrl in entries if present
                if (responseData && responseData.entry && Array.isArray(responseData.entry)) {
                    for (const entry of responseData.entry) {
                        if (entry.fullUrl && entry.fullUrl.includes('http://hapi-fhir:8080/fhir')) {
                            const originalUrl = entry.fullUrl;
                            entry.fullUrl = originalUrl.replace('http://hapi-fhir:8080/fhir', `${externalApiUrl}/fhir`);
                            this.logger.log(`Rewritten entry fullUrl: ${originalUrl} -> ${entry.fullUrl}`);
                        }
                    }
                }

                // Log all final link URLs for debugging
                if (responseData && responseData.link && Array.isArray(responseData.link)) {
                    this.logger.log('Final rewritten links:');
                    responseData.link.forEach((link, index) => {
                        this.logger.log(`Link ${index} (${link.relation}): ${link.url}`);
                    });
                }

                return responseData;
            },
            `search ${resourceType}`,
        );
    }

    /**
     * Transform search parameters from API format to FHIR-compliant format
     * This is a centralized place to handle all parameter transformations
     */
    private transformSearchParameters(resourceType: string, params: Record<string, any>): Record<string, any> {
        const result: Record<string, any> = {};

        // Copy basic search params
        for (const [key, value] of Object.entries(params)) {
            // Skip null/undefined values
            if (value === undefined || value === null || value === '') {
                continue;
            }

            result[key] = value;
        }

        // Handle pagination
        if (params.page) {
            const page = parseInt(params.page);
            let count = params._count ? parseInt(params._count) : 10; // Default count is 10

            if (!isNaN(page) && page > 0 && !isNaN(count) && count > 0) {
                // Convert page to offset for HAPI FHIR server
                const offset = (page - 1) * count;
                result._getpagesoffset = offset.toString();

                // Ensure _count is set
                result._count = count.toString();

                // Remove the page parameter as HAPI doesn't understand it
                delete result.page;

                this.logger.log(`Transformed page=${page} to _getpagesoffset=${offset} with _count=${count}`);
            }
        }

        // Handle date range parameters
        this.transformDateParameters(params, result);

        // Handle value ranges
        this.transformValueParameters(params, result);

        // Handle name parameters
        this.transformNameParameters(params, result);

        // Resource-specific transformations
        if (resourceType === 'Patient') {
            this.transformPatientParameters(params, result);
        } else if (resourceType === 'Observation') {
            this.transformObservationParameters(params, result);
        } else if (resourceType === 'Encounter') {
            this.transformEncounterParameters(params, result);
        } else if (resourceType === 'Medication' || resourceType === 'MedicationRequest') {
            this.transformMedicationParameters(params, result);
        }

        return result;
    }

    /**
     * Transform date parameters to FHIR-compliant format
     */
    private transformDateParameters(params: Record<string, any>, result: Record<string, any>): void {
        // Handle various date parameter formats
        const dateFields = ['date', 'birthdate', 'period', 'authored', 'created'];

        dateFields.forEach(field => {
            // Skip if we already have the exact parameter
            if (params[field]) {
                return;
            }

            // Handle date_start/date_end formats
            const startKey = `${field}_start`;
            const endKey = `${field}_end`;

            // Handle hyphenated versions
            const hyphenStartKey = `${field}-start`;
            const hyphenEndKey = `${field}-end`;

            // Get values from either format
            const startDate = params[startKey] || params[hyphenStartKey];
            const endDate = params[endKey] || params[hyphenEndKey];

            if (startDate || endDate) {
                const dateConstraints = [];

                if (startDate) {
                    dateConstraints.push(`ge${startDate}`);
                    // Delete the original keys to avoid duplication
                    delete result[startKey];
                    delete result[hyphenStartKey];
                }

                if (endDate) {
                    dateConstraints.push(`le${endDate}`);
                    // Delete the original keys to avoid duplication
                    delete result[endKey];
                    delete result[hyphenEndKey];
                }

                if (dateConstraints.length > 0) {
                    result[field] = dateConstraints.join(',');
                }
            }

            // Handle dateRange object format
            if (params[`${field}Range`] && typeof params[`${field}Range`] === 'object') {
                const dateRange = params[`${field}Range`];
                const dateConstraints = [];

                if (dateRange.start) {
                    dateConstraints.push(`ge${dateRange.start}`);
                }

                if (dateRange.end) {
                    dateConstraints.push(`le${dateRange.end}`);
                }

                if (dateConstraints.length > 0) {
                    result[field] = dateConstraints.join(',');
                }

                // Remove the original range object
                delete result[`${field}Range`];
            }
        });
    }

    /**
     * Transform value parameters to FHIR-compliant format
     */
    private transformValueParameters(params: Record<string, any>, result: Record<string, any>): void {
        // Handle value range parameters
        const valueFields = ['value', 'age', 'duration', 'component-value'];

        valueFields.forEach(field => {
            // Skip if we already have the exact parameter
            if (params[`${field}-quantity`]) {
                return;
            }

            // Handle min/max formats
            const minKey = `${field}_min`;
            const maxKey = `${field}_max`;

            // Handle hyphenated versions
            const hyphenMinKey = `${field}-min`;
            const hyphenMaxKey = `${field}-max`;

            // Get values from either format
            const minValue = params[minKey] || params[hyphenMinKey];
            const maxValue = params[maxKey] || params[hyphenMaxKey];

            if (minValue || maxValue) {
                const valueConstraints = [];

                if (minValue) {
                    valueConstraints.push(`ge${minValue}`);
                    // Delete the original keys to avoid duplication
                    delete result[minKey];
                    delete result[hyphenMinKey];
                }

                if (maxValue) {
                    valueConstraints.push(`le${maxValue}`);
                    // Delete the original keys to avoid duplication
                    delete result[maxKey];
                    delete result[hyphenMaxKey];
                }

                if (valueConstraints.length > 0) {
                    result[`${field}-quantity`] = valueConstraints.join(',');
                }
            }

            // Handle operators with values
            const operatorKey = `${field}_operator`;
            const hyphenOperatorKey = `${field}-operator`;
            const valueKey = `${field}_value`;
            const hyphenValueKey = `${field}-value`;

            const operator = params[operatorKey] || params[hyphenOperatorKey];
            const value = params[valueKey] || params[hyphenValueKey];

            if (operator && value) {
                // Valid operators: eq, ne, gt, lt, ge, le
                if (['eq', 'ne', 'gt', 'lt', 'ge', 'le'].includes(operator)) {
                    result[`${field}-quantity`] = `${operator}${value}`;
                }

                // Delete the original keys
                delete result[operatorKey];
                delete result[hyphenOperatorKey];
                delete result[valueKey];
                delete result[hyphenValueKey];
            }
        });
    }

    /**
     * Transform name parameters to FHIR-compliant format
     */
    private transformNameParameters(params: Record<string, any>, result: Record<string, any>): void {
        // Handle fullName parameter
        if (params.fullName) {
            result.name = params.fullName;
            delete result.fullName;
        }

        // Handle firstName and lastName parameters
        const firstName = params.firstName || params['first-name'] || params.given;
        const lastName = params.lastName || params['last-name'] || params.family;

        if (firstName) {
            result.given = firstName;
            delete result.firstName;
            delete result['first-name'];
        }

        if (lastName) {
            result.family = lastName;
            delete result.lastName;
            delete result['last-name'];
        }
    }

    /**
     * Transform Patient-specific parameters
     */
    private transformPatientParameters(params: Record<string, any>, result: Record<string, any>): void {
        // Handle gender parameter normalization
        if (params.sex) {
            result.gender = params.sex;
            delete result.sex;
        }

        // Handle address parameters
        const addressFields = ['city', 'state', 'postalCode', 'country'];
        addressFields.forEach(field => {
            const hyphenField = field.replace(/([A-Z])/g, '-$1').toLowerCase();
            const value = params[field] || params[hyphenField] || params[`address-${hyphenField}`];

            if (value) {
                result[`address-${hyphenField}`] = value;
                delete result[field];
                delete result[hyphenField];
            }
        });

        // Handle identifier searches
        ['identifier', 'mrn', 'ssn', 'passport'].forEach(idType => {
            if (params[idType] && idType !== 'identifier') {
                // For specific ID types, map to identifier=system|value format
                const systemMap = {
                    'mrn': 'http://example.org/fhir/identifier/mrn',
                    'ssn': 'http://hl7.org/fhir/sid/us-ssn',
                    'passport': 'http://hl7.org/fhir/v2/0203/PP'
                };

                result.identifier = `${systemMap[idType]}|${params[idType]}`;
                delete result[idType];
            }
        });
    }

    /**
     * Transform Observation-specific parameters
     */
    private transformObservationParameters(params: Record<string, any>, result: Record<string, any>): void {
        // Handle combined component searches
        if (params['component-code'] && (params['value-operator'] || params['value_operator']) && (params['value'] || params['value_value'])) {
            const componentCode = params['component-code'];
            const operator = params['value-operator'] || params['value_operator'] || 'eq';
            const value = params['value'] || params['value_value'];

            if (['eq', 'ne', 'gt', 'lt', 'ge', 'le'].includes(operator)) {
                result['component-code-value-quantity'] = `${componentCode}$${operator}${value}`;

                // Remove the original parameters to avoid conflicts
                delete result['component-code'];
                delete result['value-operator'];
                delete result['value_operator'];
                delete result['value'];
                delete result['value_value'];
            }
        }

        // Handle value-min and value-max parameters by transforming them to value-quantity with prefixes
        if (params['value-min'] !== undefined || params['value-max'] !== undefined) {
            const minValue = params['value-min'];
            const maxValue = params['value-max'];
            const constraints = [];

            if (minValue !== undefined) {
                constraints.push(`ge${minValue}`);
                delete result['value-min'];
            }

            if (maxValue !== undefined) {
                constraints.push(`le${maxValue}`);
                delete result['value-max'];
            }

            if (constraints.length > 0) {
                result['value-quantity'] = constraints.join(',');
                this.logger.log(`Transformed value-min/max to value-quantity: ${result['value-quantity']}`);
            }
        }

        // Handle reference range searches
        if ((params['range-low'] || params['range_low']) || (params['range-high'] || params['range_high'])) {
            const lowValue = params['range-low'] || params['range_low'];
            const highValue = params['range-high'] || params['range_high'];

            if (lowValue) {
                result['referencerange-low'] = `ge${lowValue}`;
                delete result['range-low'];
                delete result['range_low'];
            }

            if (highValue) {
                result['referencerange-high'] = `le${highValue}`;
                delete result['range-high'];
                delete result['range_high'];
            }
        }
    }

    /**
     * Transform Encounter-specific parameters
     */
    private transformEncounterParameters(params: Record<string, any>, result: Record<string, any>): void {
        // Handle stay duration
        if ((params['length-min'] || params['length_min']) || (params['length-max'] || params['length_max'])) {
            const minValue = params['length-min'] || params['length_min'];
            const maxValue = params['length-max'] || params['length_max'];

            if (minValue) {
                result['length'] = `ge${minValue}`;
                delete result['length-min'];
                delete result['length_min'];
            }

            if (maxValue) {
                if (result['length']) {
                    result['length'] += `,le${maxValue}`;
                } else {
                    result['length'] = `le${maxValue}`;
                }
                delete result['length-max'];
                delete result['length_max'];
            }
        }
    }

    /**
     * Transform Medication-specific parameters
     */
    private transformMedicationParameters(params: Record<string, any>, result: Record<string, any>): void {
        // Handle medication code searches
        if (params.code || params.medication) {
            result['code'] = params.code || params.medication;
            delete result.medication;
        }

        // Handle status parameter normalization
        if (params.status && Array.isArray(params.status)) {
            result.status = params.status.join(',');
        }
    }

    /**
     * Get Axios request configuration
     */
    private getRequestConfig(): AxiosRequestConfig {
        return {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        };
    }

    /**
     * Execute a function with retry logic
     */
    private async executeWithRetry<T>(fn: () => Promise<T>, operationName: string): Promise<T> {
        let lastError: Error;
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;

                if (error instanceof AxiosError) {
                    const status = error.response?.status;

                    // Don't retry 404 errors
                    if (status === 404) {
                        this.logger.warn(`Resource not found during ${operationName}`);
                        throw new NotFoundException(`Resource not found: ${error.message}`);
                    }

                    this.logger.warn(
                        `HAPI FHIR request failed (${status}) during ${operationName}, attempt ${attempt}/${this.maxRetries}: ${error.message}`,
                    );
                } else {
                    this.logger.warn(
                        `HAPI FHIR request failed during ${operationName}, attempt ${attempt}/${this.maxRetries}: ${error.message}`,
                    );
                }

                if (attempt < this.maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                }
            }
        }

        this.logger.error(`HAPI FHIR request failed after ${this.maxRetries} attempts: ${lastError.message}`);
        throw new InternalServerErrorException(`Failed to complete operation: ${operationName}`);
    }
} 