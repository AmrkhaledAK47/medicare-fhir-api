import { Injectable, Logger } from '@nestjs/common';
import { FhirService } from '../../fhir/fhir.service';
import { UsersService } from '../../users/users.service';
import { UserProfileDto } from '../dto/dashboard.dto';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { ChronicDiseaseService } from './chronic-disease.service';

@Injectable()
export class PatientProfileService {
    private readonly logger = new Logger(PatientProfileService.name);

    constructor(
        private readonly fhirService: FhirService,
        private readonly usersService: UsersService,
        private readonly chronicDiseaseService: ChronicDiseaseService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    async getPatientProfile(userId: string): Promise<UserProfileDto> {
        this.logger.log(`Fetching profile for user ${userId}`);

        const cacheKey = `patientProfile:${userId}`;

        // Try to get from cache first
        const cachedProfile = await this.cacheManager.get<UserProfileDto>(cacheKey);
        if (cachedProfile) {
            this.logger.debug('Returning patient profile from cache');
            return cachedProfile;
        }

        try {
            // Get user from MongoDB
            const user = await this.usersService.findById(userId);

            if (!user) {
                this.logger.warn(`User ${userId} not found`);
                throw new Error(`User ${userId} not found`);
            }

            // Build the profile DTO
            const userProfileDto: UserProfileDto = {
                id: userId,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                phone: user.phone,
                profileImageUrl: user.profileImageUrl || this.getDefaultAvatarUrl(user.name),
                isEmailVerified: user.isEmailVerified || false,
                fhirDetails: undefined,
                diseases: undefined
            };

            // If the user has a FHIR resource ID, fetch that data
            if (user.fhirResourceId && user.fhirResourceType) {
                try {
                    const fhirResource = await this.fhirService.getResource(
                        user.fhirResourceType,
                        user.fhirResourceId
                    );

                    // Add FHIR resource details to the profile
                    userProfileDto.fhirDetails = {
                        resourceType: user.fhirResourceType,
                        resourceId: user.fhirResourceId,
                        details: this.extractRelevantFhirData(fhirResource, user.fhirResourceType)
                    };

                    // If the user is a patient, fetch chronic diseases
                    if (user.fhirResourceType === 'Patient') {
                        try {
                            userProfileDto.diseases = await this.chronicDiseaseService.getChronicDiseases(user.fhirResourceId);
                        } catch (error) {
                            this.logger.error(`Failed to fetch chronic diseases for user ${userId}: ${error.message}`);
                            // Don't fail if we can't get the diseases, just continue without them
                        }
                    }
                } catch (error) {
                    this.logger.error(`Failed to fetch FHIR resource for user ${userId}: ${error.message}`);
                    // Don't fail if we can't get the FHIR resource, just continue without it
                }
            }

            // Cache the profile
            await this.cacheManager.set(cacheKey, userProfileDto, 60 * 1000); // 60 seconds TTL

            return userProfileDto;
        } catch (error) {
            this.logger.error(`Failed to get patient profile for user ${userId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generate a default avatar URL based on the user's name
     * @param name User's name
     * @returns URL for the default avatar with first letter of name
     */
    private getDefaultAvatarUrl(name: string): string {
        // Get the first letter of the name
        const firstLetter = name && name.length > 0 ? name.charAt(0).toUpperCase() : 'U';

        // Return a data URL for a simple SVG with the first letter
        // This creates a colored circle with the first letter in the center
        const colors = [
            '#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#34495e',
            '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#2c3e50',
            '#f1c40f', '#e67e22', '#e74c3c', '#95a5a6', '#f39c12',
            '#d35400', '#c0392b', '#bdc3c7', '#7f8c8d'
        ];

        // Use the character code of the first letter to select a color
        const colorIndex = firstLetter.charCodeAt(0) % colors.length;
        const backgroundColor = colors[colorIndex];

        // Create an SVG data URL
        const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="50" fill="${backgroundColor}" />
            <text x="50" y="50" font-family="Arial" font-size="50" fill="white" text-anchor="middle" dominant-baseline="central">
                ${firstLetter}
            </text>
        </svg>`;

        // Convert to a data URL
        return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    }

    private extractRelevantFhirData(resource: any, resourceType: string): any {
        // Skip extraction if no resource
        if (!resource) {
            return null;
        }

        // Extract relevant data based on resource type
        if (resourceType === 'Patient') {
            return {
                name: this.formatHumanName(resource.name?.[0]),
                gender: resource.gender,
                birthDate: resource.birthDate,
                address: resource.address?.[0] ? this.formatAddress(resource.address[0]) : undefined,
                telecom: resource.telecom?.map(t => ({
                    system: t.system,
                    value: t.value,
                    use: t.use
                })),
                photo: resource.photo?.[0]?.url || resource.photo?.[0]?.data
            };
        } else if (resourceType === 'Practitioner') {
            return {
                name: this.formatHumanName(resource.name?.[0]),
                gender: resource.gender,
                telecom: resource.telecom?.map(t => ({
                    system: t.system,
                    value: t.value,
                    use: t.use
                })),
                qualifications: resource.qualification?.map(q => ({
                    code: q.code?.coding?.[0]?.display || q.code?.text,
                    issuer: q.issuer?.display,
                    period: q.period
                })),
                photo: resource.photo?.[0]?.url || resource.photo?.[0]?.data
            };
        }

        // Default: return basic info
        return {
            id: resource.id,
            resourceType: resource.resourceType,
        };
    }

    private formatHumanName(name: any): string | undefined {
        if (!name) return undefined;

        const prefix = Array.isArray(name.prefix) ? name.prefix.join(' ') : name.prefix;
        const given = Array.isArray(name.given) ? name.given.join(' ') : name.given;
        const family = name.family;

        const parts = [];
        if (prefix) parts.push(prefix);
        if (given) parts.push(given);
        if (family) parts.push(family);

        return parts.length > 0 ? parts.join(' ') : name.text;
    }

    private formatAddress(address: any): string | undefined {
        if (!address) return undefined;

        const parts = [];

        if (address.line && address.line.length > 0) {
            parts.push(address.line.join(', '));
        }

        if (address.city) {
            parts.push(address.city);
        }

        if (address.state) {
            parts.push(address.state);
        }

        if (address.postalCode) {
            parts.push(address.postalCode);
        }

        if (address.country) {
            parts.push(address.country);
        }

        return parts.join(', ');
    }
} 